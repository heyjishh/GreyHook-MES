import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.models.downtime import DowntimeEvent
from app.models.factory import ProductionLine
from app.models.machine import Machine
from app.models.user import User
from app.schemas.downtime import (
    DowntimeCreateRequest,
    DowntimeEventSchema,
    DowntimeUpdateRequest,
    ParetoCategorySchema,
)
from app.schemas.user import UserRole

router = APIRouter()


@router.get("/machines/{machine_id}/downtime", response_model=dict)
async def list_machine_downtime(
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

    stmt = select(DowntimeEvent).where(
        DowntimeEvent.machine_id == machine_id,
        DowntimeEvent.organization_id == current_user.organization_id,
    )
    if from_time is not None:
        stmt = stmt.where(DowntimeEvent.started_at >= from_time)
    if to_time is not None:
        stmt = stmt.where(DowntimeEvent.started_at <= to_time)
    stmt = stmt.order_by(DowntimeEvent.started_at.desc())

    result = await db.execute(stmt)
    events = result.scalars().all()
    total_duration = sum(e.duration_seconds or 0 for e in events)

    return {
        "items": [DowntimeEventSchema.model_validate(e) for e in events],
        "total_duration_s": total_duration,
    }


@router.post("/machines/{machine_id}/downtime", response_model=DowntimeEventSchema, status_code=201)
async def create_downtime(
    machine_id: uuid.UUID,
    body: DowntimeCreateRequest,
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

    duration = None
    if body.ended_at is not None:
        if body.ended_at <= body.started_at:
            raise ValidationError("ended_at must be after started_at")
        duration = int((body.ended_at - body.started_at).total_seconds())
        if duration > 1800 and not body.reason:
            raise ValidationError("reason is required for downtime events longer than 30 minutes")

    event = DowntimeEvent(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        machine_id=machine_id,
        category=body.category,
        reason=body.reason,
        started_at=body.started_at,
        ended_at=body.ended_at,
        duration_seconds=duration,
        logged_by=current_user.id,
        is_planned=body.is_planned,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return DowntimeEventSchema.model_validate(event)


@router.patch("/downtime/{downtime_id}", response_model=DowntimeEventSchema)
async def update_downtime(
    downtime_id: uuid.UUID,
    body: DowntimeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DowntimeEvent).where(
            DowntimeEvent.id == downtime_id,
            DowntimeEvent.organization_id == current_user.organization_id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundError(f"Downtime event {downtime_id} not found")

    if body.category is not None:
        event.category = body.category
    if body.reason is not None:
        event.reason = body.reason
    if body.ended_at is not None:
        event.ended_at = body.ended_at
        event.duration_seconds = int((body.ended_at - event.started_at).total_seconds())

    await db.commit()
    await db.refresh(event)
    return DowntimeEventSchema.model_validate(event)


@router.delete("/downtime/{downtime_id}")
async def delete_downtime(
    downtime_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DowntimeEvent).where(
            DowntimeEvent.id == downtime_id,
            DowntimeEvent.organization_id == current_user.organization_id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundError(f"Downtime event {downtime_id} not found")

    await db.delete(event)
    await db.commit()
    return {"ok": True}


@router.get("/lines/{line_id}/downtime/pareto", response_model=dict)
async def downtime_pareto(
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
        return {
            "items": [],
            "total_duration_s": 0,
            "period": {"from": str(from_time), "to": str(to_time)},
        }

    stmt = select(DowntimeEvent).where(
        DowntimeEvent.machine_id.in_(machine_ids),
        DowntimeEvent.organization_id == current_user.organization_id,
    )
    if from_time is not None:
        stmt = stmt.where(DowntimeEvent.started_at >= from_time)
    if to_time is not None:
        stmt = stmt.where(DowntimeEvent.started_at <= to_time)

    result = await db.execute(stmt)
    events = result.scalars().all()

    category_map: dict[str, dict] = {}
    for e in events:
        dur = e.duration_seconds or 0
        if e.category not in category_map:
            category_map[e.category] = {"duration_s": 0, "event_count": 0}
        category_map[e.category]["duration_s"] += dur
        category_map[e.category]["event_count"] += 1

    total_duration = sum(v["duration_s"] for v in category_map.values())

    sorted_cats = sorted(category_map.items(), key=lambda x: -x[1]["duration_s"])
    cumulative = 0.0
    items = []
    for cat, vals in sorted_cats:
        pct = vals["duration_s"] / total_duration if total_duration > 0 else 0.0
        cumulative += pct
        items.append(
            ParetoCategorySchema(
                category=cat,
                duration_s=vals["duration_s"],
                event_count=vals["event_count"],
                pct=pct,
                cumulative_pct=cumulative,
            )
        )

    return {
        "items": items,
        "total_duration_s": total_duration,
        "period": {"from": str(from_time), "to": str(to_time)},
    }


@router.get("/downtime/pareto", response_model=dict)
async def downtime_pareto_factory(
    factory_id: uuid.UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select as _select

    from app.models.factory import Factory

    factory_result = await db.execute(
        _select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    if factory_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    line_ids_result = await db.execute(
        _select(ProductionLine.id).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    line_ids = [row[0] for row in line_ids_result.all()]
    if not line_ids:
        return {
            "items": [],
            "total_duration_s": 0,
            "period": {"from": str(from_time), "to": str(to_time)},
        }

    machine_ids_result = await db.execute(
        _select(Machine.id).where(
            Machine.line_id.in_(line_ids),
            Machine.organization_id == current_user.organization_id,
        )
    )
    machine_ids = [row[0] for row in machine_ids_result.all()]
    if not machine_ids:
        return {
            "items": [],
            "total_duration_s": 0,
            "period": {"from": str(from_time), "to": str(to_time)},
        }

    stmt = _select(DowntimeEvent).where(
        DowntimeEvent.machine_id.in_(machine_ids),
        DowntimeEvent.organization_id == current_user.organization_id,
    )
    if from_time is not None:
        stmt = stmt.where(DowntimeEvent.started_at >= from_time)
    if to_time is not None:
        stmt = stmt.where(DowntimeEvent.started_at <= to_time)

    result = await db.execute(stmt)
    events = result.scalars().all()

    category_map: dict[str, dict] = {}
    for e in events:
        dur = e.duration_seconds or 0
        if e.category not in category_map:
            category_map[e.category] = {"duration_s": 0, "event_count": 0}
        category_map[e.category]["duration_s"] += dur
        category_map[e.category]["event_count"] += 1

    total_duration = sum(v["duration_s"] for v in category_map.values())
    sorted_cats = sorted(category_map.items(), key=lambda x: -x[1]["duration_s"])
    cumulative = 0.0
    items = []
    for cat, vals in sorted_cats:
        pct = vals["duration_s"] / total_duration if total_duration > 0 else 0.0
        cumulative += pct
        items.append(
            ParetoCategorySchema(
                category=cat,
                duration_s=vals["duration_s"],
                event_count=vals["event_count"],
                pct=pct,
                cumulative_pct=cumulative,
            )
        )

    return {
        "items": items,
        "total_duration_s": total_duration,
        "period": {"from": str(from_time), "to": str(to_time)},
    }
