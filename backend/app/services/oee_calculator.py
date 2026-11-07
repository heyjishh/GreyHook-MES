from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.downtime import DowntimeEvent
from app.models.machine import Machine
from app.models.oee import OEEAggregate
from app.models.production import ProductionOrder
from app.models.product import ProductDefinition
from app.models.telemetry import MachineStatePeriod


@dataclass
class OEEResult:
    planned_time_s: int
    run_time_s: int
    idle_time_s: int
    fault_time_s: int
    planned_qty: int
    actual_qty: int
    rejected_qty: int
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _shift_planned_time_s(shift) -> int:
    from datetime import datetime, timedelta

    base = datetime(2000, 1, 1)
    start_dt = datetime.combine(base.date(), shift.start_time)
    end_dt = datetime.combine(base.date(), shift.end_time)
    if end_dt <= start_dt:
        end_dt += timedelta(days=1)
    shift_duration_s = int((end_dt - start_dt).total_seconds())
    planned_stops_s = sum(
        stop.get("duration_minutes", 0) * 60 for stop in (shift.planned_stops or [])
    )
    return max(0, shift_duration_s - planned_stops_s)


def _shift_covers_day(shift, day_of_week: int) -> bool:
    return day_of_week in (shift.days_of_week or [])


async def _get_planned_time_s(
    db: AsyncSession,
    machine: Machine,
    period_start: datetime,
    period_end: datetime,
) -> int:
    from app.models.factory import ProductionLine
    from app.models.shift import Shift

    period_duration_s = int((period_end - period_start).total_seconds())

    line_result = await db.execute(
        select(ProductionLine).where(ProductionLine.id == machine.line_id)
    )
    line = line_result.scalar_one_or_none()
    if line is None:
        return period_duration_s

    shift_result = await db.execute(
        select(Shift).where(
            Shift.factory_id == line.factory_id,
            Shift.is_active == True,
        )
    )
    shifts = shift_result.scalars().all()
    day_of_week = period_start.isoweekday()
    for shift in shifts:
        if _shift_covers_day(shift, day_of_week):
            return _shift_planned_time_s(shift)

    return period_duration_s


async def _get_ideal_cycle_time(
    db: AsyncSession,
    machine: Machine,
    org_id: uuid.UUID,
    period_start: datetime,
    period_end: datetime,
) -> float | None:
    if machine.default_product_id is not None:
        result = await db.execute(
            select(ProductDefinition.ideal_cycle_time_seconds).where(
                ProductDefinition.id == machine.default_product_id,
                ProductDefinition.organization_id == org_id,
                ProductDefinition.is_active == True,
            )
        )
        row = result.scalar_one_or_none()
        if row is not None:
            return float(row)

    result = await db.execute(
        select(ProductDefinition.ideal_cycle_time_seconds)
        .join(ProductionOrder, ProductionOrder.product_id == ProductDefinition.id)
        .where(
            ProductionOrder.organization_id == org_id,
            ProductionOrder.line_id == machine.line_id,
            ProductionOrder.planned_start < period_end,
            ProductionOrder.planned_end > period_start,
            ProductDefinition.organization_id == org_id,
            ProductDefinition.is_active == True,
        )
        .order_by(ProductionOrder.planned_start.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is not None:
        return float(row)

    return None


async def compute_oee(
    db: AsyncSession,
    machine_id: uuid.UUID,
    org_id: uuid.UUID,
    period_start: datetime,
    period_end: datetime,
    granularity: str,
) -> OEEResult:
    state_rows = await db.execute(
        select(
            MachineStatePeriod.state,
            func.coalesce(func.sum(MachineStatePeriod.duration_seconds), 0).label("total_s"),
        )
        .where(
            MachineStatePeriod.machine_id == machine_id,
            MachineStatePeriod.organization_id == org_id,
            MachineStatePeriod.started_at >= period_start,
            MachineStatePeriod.started_at < period_end,
        )
        .group_by(MachineStatePeriod.state)
    )
    state_totals: dict[str, int] = {row.state: int(row.total_s) for row in state_rows.all()}
    run_time_s = state_totals.get("running", 0)
    idle_time_s = state_totals.get("idle", 0)
    fault_time_s = state_totals.get("fault", 0)

    machine_result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == org_id,
        )
    )
    machine = machine_result.scalar_one_or_none()
    if machine is None:
        return OEEResult(
            planned_time_s=0,
            run_time_s=0,
            idle_time_s=0,
            fault_time_s=0,
            planned_qty=0,
            actual_qty=0,
            rejected_qty=0,
            availability=None,
            performance=None,
            quality=None,
            oee=None,
        )

    planned_time_s = await _get_planned_time_s(db, machine, period_start, period_end)

    order_row = await db.execute(
        select(
            func.coalesce(func.sum(ProductionOrder.actual_qty), 0).label("total_actual"),
            func.coalesce(func.sum(ProductionOrder.rejected_qty), 0).label("total_rejected"),
            func.coalesce(func.sum(ProductionOrder.planned_qty), 0).label("total_planned"),
        ).where(
            ProductionOrder.organization_id == org_id,
            ProductionOrder.line_id == machine.line_id,
            ProductionOrder.planned_start < period_end,
            ProductionOrder.planned_end > period_start,
        )
    )
    row = order_row.one()
    actual_qty = int(row.total_actual)
    rejected_qty = int(row.total_rejected)
    planned_qty = int(row.total_planned)

    ideal_cycle_time_s = await _get_ideal_cycle_time(db, machine, org_id, period_start, period_end)

    availability: float | None = None
    if planned_time_s > 0:
        availability = _clamp(run_time_s / planned_time_s)

    performance: float | None = None
    if ideal_cycle_time_s is not None and run_time_s > 0:
        performance = _clamp((ideal_cycle_time_s * actual_qty) / run_time_s)

    quality: float | None = None
    if actual_qty > 0:
        good_qty = actual_qty - rejected_qty
        quality = _clamp(good_qty / actual_qty)

    oee: float | None = None
    if availability is not None and performance is not None and quality is not None:
        oee = _clamp(availability * performance * quality)

    return OEEResult(
        planned_time_s=planned_time_s,
        run_time_s=run_time_s,
        idle_time_s=idle_time_s,
        fault_time_s=fault_time_s,
        planned_qty=planned_qty,
        actual_qty=actual_qty,
        rejected_qty=rejected_qty,
        availability=availability,
        performance=performance,
        quality=quality,
        oee=oee,
    )


async def compute_and_store_oee(
    db: AsyncSession,
    machine_id: uuid.UUID,
    org_id: uuid.UUID,
    period_start: datetime,
    period_end: datetime,
    granularity: str,
) -> OEEResult:
    result = await compute_oee(db, machine_id, org_id, period_start, period_end, granularity)

    existing_result = await db.execute(
        select(OEEAggregate).where(
            OEEAggregate.machine_id == machine_id,
            OEEAggregate.period_start == period_start,
            OEEAggregate.granularity == granularity,
        )
    )
    agg = existing_result.scalar_one_or_none()

    if agg is None:
        agg = OEEAggregate(
            organization_id=org_id,
            machine_id=machine_id,
            period_start=period_start,
            period_end=period_end,
            granularity=granularity,
        )
        db.add(agg)

    agg.planned_time_s = result.planned_time_s
    agg.run_time_s = result.run_time_s
    agg.idle_time_s = result.idle_time_s
    agg.fault_time_s = result.fault_time_s
    agg.planned_qty = result.planned_qty
    agg.actual_qty = result.actual_qty
    agg.rejected_qty = result.rejected_qty
    agg.availability = result.availability
    agg.performance = result.performance
    agg.quality = result.quality
    agg.oee = result.oee
    agg.period_end = period_end

    await db.commit()
    return result
