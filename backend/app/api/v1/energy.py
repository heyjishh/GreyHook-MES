import uuid
from datetime import UTC, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/energy", tags=["energy"])

_KWH_PER_HOUR_BY_STATE = {"running": 15.0, "idle": 3.0, "fault": 1.0, "offline": 0.5, "changeover": 5.0}
_INR_PER_KWH = 8.0


class MachineEnergy(BaseModel):
    machine_id: uuid.UUID
    machine_name: str
    kwh_total: float
    kwh_running: float
    kwh_idle: float
    peak_kw: Optional[float]
    avg_kw: Optional[float]


class EnergyResponse(BaseModel):
    factory_id: Optional[uuid.UUID]
    hours: int
    from_time: datetime
    machines: list[MachineEnergy]
    factory_total_kwh: float
    estimated_cost_inr: float


@router.get("", response_model=EnergyResponse)
async def get_energy(
    factory_id: Optional[uuid.UUID] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    since = datetime.now(UTC) - timedelta(hours=hours)

    machine_filter = ""
    params: dict = {"org_id": org_id, "since": since}
    if factory_id:
        machine_filter = """
            AND m.line_id IN (
                SELECT pl.id FROM production_lines pl
                WHERE pl.factory_id = :factory_id AND pl.organization_id = :org_id
            )
        """
        params["factory_id"] = str(factory_id)

    machine_rows = await db.execute(
        text(f"""
            SELECT m.id, m.name
            FROM machines m
            WHERE m.organization_id = :org_id AND m.is_active = true
            {machine_filter}
        """),
        params,
    )
    machines = machine_rows.fetchall()

    result_machines: list[MachineEnergy] = []
    factory_total = 0.0

    for machine in machines:
        mid = machine.id
        mname = machine.name

        power_rows = await db.execute(
            text("""
                SELECT value FROM machine_telemetry
                WHERE machine_id = :mid AND organization_id = :org_id
                  AND tag_name IN ('power_kw', 'current_a')
                  AND timestamp >= :since
                ORDER BY timestamp ASC
            """),
            {"mid": str(mid), "org_id": org_id, "since": since},
        )
        power_readings = [float(r.value) for r in power_rows.fetchall()]

        if power_readings:
            avg_kw = sum(power_readings) / len(power_readings)
            peak_kw = max(power_readings)
            kwh_total = avg_kw * hours
            kwh_running = kwh_total * 0.7
            kwh_idle = kwh_total * 0.3
        else:
            state_rows = await db.execute(
                text("""
                    SELECT state,
                           EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - GREATEST(started_at, :since))) AS duration_s
                    FROM machine_state_periods
                    WHERE machine_id = :mid AND organization_id = :org_id
                      AND started_at < NOW() AND (ended_at IS NULL OR ended_at >= :since)
                """),
                {"mid": str(mid), "org_id": org_id, "since": since},
            )
            kwh_running = kwh_idle = 0.0
            kwh_total = 0.0
            for sr in state_rows.fetchall():
                dur_h = max(float(sr.duration_s), 0) / 3600.0
                state_key = (sr.state or "idle").lower()
                rate = _KWH_PER_HOUR_BY_STATE.get(state_key, 3.0)
                kwh = rate * dur_h
                kwh_total += kwh
                if state_key == "running":
                    kwh_running += kwh
                else:
                    kwh_idle += kwh
            avg_kw = (kwh_total / hours) if hours > 0 else 0.0
            peak_kw = None

        factory_total += kwh_total
        result_machines.append(MachineEnergy(
            machine_id=mid,
            machine_name=mname,
            kwh_total=round(kwh_total, 2),
            kwh_running=round(kwh_running, 2),
            kwh_idle=round(kwh_idle, 2),
            peak_kw=round(peak_kw, 2) if peak_kw is not None else None,
            avg_kw=round(avg_kw, 2),
        ))

    return EnergyResponse(
        factory_id=factory_id,
        hours=hours,
        from_time=since,
        machines=result_machines,
        factory_total_kwh=round(factory_total, 2),
        estimated_cost_inr=round(factory_total * _INR_PER_KWH, 2),
    )
