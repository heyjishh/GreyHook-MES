import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.factory import Factory, ProductionLine
from app.models.machine import Machine
from app.models.oee import OEEAggregate
from app.models.user import User
from app.schemas.oee import (
    MachineHourlyOEEResponse,
    OEE7DayResponse,
    OEEAggregateSchema,
    OEEDayItem,
    OEEGranularity,
    OEESummarySchema,
    PerMachineOEEItem,
    PerMachineOEEResponse,
)

router = APIRouter()


@router.get("/machines/{machine_id}/oee", response_model=dict)
async def get_machine_oee(
    machine_id: uuid.UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    granularity: OEEGranularity = OEEGranularity.shift,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    machine_result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    if machine_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Machine {machine_id} not found")

    stmt = select(OEEAggregate).where(
        OEEAggregate.machine_id == machine_id,
        OEEAggregate.organization_id == current_user.organization_id,
        OEEAggregate.granularity == granularity.value,
    )
    if from_time is not None:
        stmt = stmt.where(OEEAggregate.period_start >= from_time)
    if to_time is not None:
        stmt = stmt.where(OEEAggregate.period_end <= to_time)
    stmt = stmt.order_by(OEEAggregate.period_start.desc())

    result = await db.execute(stmt)
    aggregates = result.scalars().all()

    return {"items": [OEEAggregateSchema.model_validate(a) for a in aggregates]}


@router.get("/lines/{line_id}/oee/summary", response_model=OEESummarySchema)
async def get_line_oee_summary(
    line_id: uuid.UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    line_result = await db.execute(
        select(ProductionLine).where(
            ProductionLine.id == line_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    if line_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Line {line_id} not found")

    machine_ids_result = await db.execute(
        select(Machine.id).where(
            Machine.line_id == line_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    machine_ids = [row[0] for row in machine_ids_result.all()]

    if not machine_ids:
        return OEESummarySchema(
            availability=None,
            performance=None,
            quality=None,
            oee=None,
            period={"from": str(from_time), "to": str(to_time)},
        )

    stmt = select(OEEAggregate).where(
        OEEAggregate.machine_id.in_(machine_ids),
        OEEAggregate.organization_id == current_user.organization_id,
        OEEAggregate.granularity == "shift",
    )
    if from_time is not None:
        stmt = stmt.where(OEEAggregate.period_start >= from_time)
    if to_time is not None:
        stmt = stmt.where(OEEAggregate.period_end <= to_time)

    result = await db.execute(stmt)
    aggregates = result.scalars().all()

    if not aggregates:
        return OEESummarySchema(
            availability=None,
            performance=None,
            quality=None,
            oee=None,
            period={"from": str(from_time), "to": str(to_time)},
        )

    avail_vals = [a.availability for a in aggregates if a.availability is not None]
    perf_vals = [a.performance for a in aggregates if a.performance is not None]
    qual_vals = [a.quality for a in aggregates if a.quality is not None]
    oee_vals = [a.oee for a in aggregates if a.oee is not None]

    return OEESummarySchema(
        availability=sum(avail_vals) / len(avail_vals) if avail_vals else None,
        performance=sum(perf_vals) / len(perf_vals) if perf_vals else None,
        quality=sum(qual_vals) / len(qual_vals) if qual_vals else None,
        oee=sum(oee_vals) / len(oee_vals) if oee_vals else None,
        period={"from": str(from_time), "to": str(to_time)},
    )


@router.get("/oee/7day", response_model=OEE7DayResponse)
async def get_oee_7day(
    factory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    factory_result = await db.execute(
        select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    if factory_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    line_ids_result = await db.execute(
        select(ProductionLine.id).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    line_ids = [row[0] for row in line_ids_result.all()]

    machine_ids: list[uuid.UUID] = []
    if line_ids:
        machine_ids_result = await db.execute(
            select(Machine.id).where(
                Machine.line_id.in_(line_ids),
                Machine.organization_id == current_user.organization_id,
                Machine.is_active == True,
            )
        )
        machine_ids = [row[0] for row in machine_ids_result.all()]

    if not machine_ids:
        return OEE7DayResponse(items=[], factory_id=factory_id)

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    aggregates_result = await db.execute(
        select(OEEAggregate).where(
            OEEAggregate.machine_id.in_(machine_ids),
            OEEAggregate.organization_id == current_user.organization_id,
            OEEAggregate.granularity == "day",
            OEEAggregate.period_start >= cutoff,
        ).order_by(OEEAggregate.period_start.asc())
    )
    aggregates = aggregates_result.scalars().all()

    day_buckets: dict[str, dict] = {}
    for agg in aggregates:
        date_key = agg.period_start.strftime("%Y-%m-%d")
        if date_key not in day_buckets:
            day_buckets[date_key] = {
                "availability": [], "performance": [], "quality": [], "oee": []
            }
        if agg.availability is not None:
            day_buckets[date_key]["availability"].append(float(agg.availability))
        if agg.performance is not None:
            day_buckets[date_key]["performance"].append(float(agg.performance))
        if agg.quality is not None:
            day_buckets[date_key]["quality"].append(float(agg.quality))
        if agg.oee is not None:
            day_buckets[date_key]["oee"].append(float(agg.oee))

    def _avg(vals: list[float]) -> float | None:
        return sum(vals) / len(vals) if vals else None

    items = [
        OEEDayItem(
            date=date_key,
            availability=_avg(vals["availability"]),
            performance=_avg(vals["performance"]),
            quality=_avg(vals["quality"]),
            oee=_avg(vals["oee"]),
        )
        for date_key, vals in sorted(day_buckets.items())
    ]

    return OEE7DayResponse(items=items, factory_id=factory_id)


@router.get("/oee/per-machine", response_model=PerMachineOEEResponse)
async def get_oee_per_machine(
    factory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    factory_result = await db.execute(
        select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    if factory_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    line_ids_result = await db.execute(
        select(ProductionLine.id).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    line_ids = [row[0] for row in line_ids_result.all()]

    if not line_ids:
        return PerMachineOEEResponse(items=[], factory_id=factory_id)

    machines_result = await db.execute(
        select(Machine).where(
            Machine.line_id.in_(line_ids),
            Machine.organization_id == current_user.organization_id,
            Machine.is_active == True,
        )
    )
    machines = machines_result.scalars().all()
    if not machines:
        return PerMachineOEEResponse(items=[], factory_id=factory_id)

    machine_map = {m.id: m.name for m in machines}
    machine_ids = list(machine_map.keys())

    latest_shift_result = await db.execute(
        select(OEEAggregate)
        .where(
            OEEAggregate.machine_id.in_(machine_ids),
            OEEAggregate.organization_id == current_user.organization_id,
            OEEAggregate.granularity == "shift",
        )
        .order_by(OEEAggregate.period_start.desc())
    )
    all_shift_aggs = latest_shift_result.scalars().all()

    latest_per_machine: dict[uuid.UUID, OEEAggregate] = {}
    for agg in all_shift_aggs:
        if agg.machine_id not in latest_per_machine:
            latest_per_machine[agg.machine_id] = agg

    items = []
    for mid in machine_ids:
        name = machine_map[mid]
        agg = latest_per_machine.get(mid)
        items.append(
            PerMachineOEEItem(
                machine_id=mid,
                machine_name=name,
                availability=float(agg.availability) if agg and agg.availability is not None else None,
                performance=float(agg.performance) if agg and agg.performance is not None else None,
                quality=float(agg.quality) if agg and agg.quality is not None else None,
                oee=float(agg.oee) if agg and agg.oee is not None else None,
                period_start=agg.period_start if agg else None,
                period_end=agg.period_end if agg else None,
            )
        )

    return PerMachineOEEResponse(items=items, factory_id=factory_id)


@router.get("/oee/ai-insight")
async def get_oee_ai_insight(
    factory_id: uuid.UUID,
    hours: int = 8,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.llm_caller import ask_claude

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    line_ids_result = await db.execute(
        select(ProductionLine.id).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    line_ids = [row[0] for row in line_ids_result.all()]
    machine_ids: list[uuid.UUID] = []
    if line_ids:
        machine_ids_result = await db.execute(
            select(Machine.id).where(
                Machine.line_id.in_(line_ids),
                Machine.organization_id == current_user.organization_id,
                Machine.is_active == True,
            )
        )
        machine_ids = [row[0] for row in machine_ids_result.all()]

    oee_data: list[str] = []
    if machine_ids:
        agg_result = await db.execute(
            select(Machine.name, func.avg(OEEAggregate.oee).label("avg_oee"),
                   func.avg(OEEAggregate.availability).label("avail"),
                   func.avg(OEEAggregate.performance).label("perf"),
                   func.avg(OEEAggregate.quality).label("qual"))
            .join(OEEAggregate, OEEAggregate.machine_id == Machine.id)
            .where(
                OEEAggregate.machine_id.in_(machine_ids),
                OEEAggregate.organization_id == current_user.organization_id,
                OEEAggregate.period_start >= cutoff,
            )
            .group_by(Machine.name)
            .order_by(func.avg(OEEAggregate.oee_value).asc())
        )
        for row in agg_result.all():
            rm = dict(row._mapping)
            oee_data.append(
                f"{rm['name']}: OEE={round(float(rm['avg_oee'] or 0)*100,1)}%, "
                f"A={round(float(rm['avail'] or 0)*100,1)}%, "
                f"P={round(float(rm['perf'] or 0)*100,1)}%, "
                f"Q={round(float(rm['qual'] or 0)*100,1)}%"
            )

    data_str = "\n".join(oee_data) if oee_data else "No OEE data available for the period."
    prompt = (
        f"You are a manufacturing AI assistant. Analyze the OEE data below for the last {hours} hours "
        f"and give a 3-5 sentence factory performance insight.\n\n"
        f"Machine OEE breakdown:\n{data_str}\n\n"
        f"Identify: (1) top performing machines, (2) problem areas, (3) one priority action. "
        f"Be direct and practical for a plant manager."
    )
    insight = await ask_claude(prompt, db, current_user.organization_id, max_tokens=350)
    return {"factory_id": str(factory_id), "hours": hours, "ai_insight": insight, "machines_analyzed": len(oee_data)}


@router.get("/oee/machines/{machine_id}/hourly", response_model=MachineHourlyOEEResponse)
async def get_machine_oee_hourly(
    machine_id: uuid.UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    machine_result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    if machine_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Machine {machine_id} not found")

    if from_time is None:
        from_time = datetime.now(timezone.utc) - timedelta(hours=24)
    if to_time is None:
        to_time = datetime.now(timezone.utc)

    stmt = (
        select(OEEAggregate)
        .where(
            OEEAggregate.machine_id == machine_id,
            OEEAggregate.organization_id == current_user.organization_id,
            OEEAggregate.granularity == "hour",
            OEEAggregate.period_start >= from_time,
            OEEAggregate.period_end <= to_time,
        )
        .order_by(OEEAggregate.period_start.asc())
    )
    result = await db.execute(stmt)
    aggregates = result.scalars().all()

    return MachineHourlyOEEResponse(
        machine_id=machine_id,
        items=[OEEAggregateSchema.model_validate(a) for a in aggregates],
    )
