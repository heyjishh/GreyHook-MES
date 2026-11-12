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

router = APIRouter(prefix="/labor", tags=["labor"])


class OperatorSummary(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    is_active: bool
    shift: Optional[str]


class MachineUtilization(BaseModel):
    machine_id: uuid.UUID
    machine_name: str
    operator_id: Optional[uuid.UUID]
    operator_name: Optional[str]
    orders_completed: int
    total_good: int
    total_reject: int
    utilization_pct: float


class LaborUtilizationResponse(BaseModel):
    factory_id: Optional[uuid.UUID]
    shift_id: Optional[uuid.UUID]
    from_time: datetime
    machines: list[MachineUtilization]
    total_operators: int
    avg_utilization_pct: float


@router.get("/operators", response_model=list[OperatorSummary])
async def list_operators(
    factory_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    rows = await db.execute(
        text("""
            SELECT u.id, u.full_name, u.email, u.is_active,
                   NULL::text AS shift
            FROM users u
            WHERE u.organization_id = :org_id
              AND u.role IN ('operator', 'technician')
            ORDER BY u.full_name ASC
        """),
        {"org_id": org_id},
    )
    result = []
    for r in rows.fetchall():
        m = dict(r._mapping)
        result.append(OperatorSummary(
            id=m["id"],
            name=m["full_name"] or m["email"],
            email=m["email"],
            is_active=m["is_active"],
            shift=m["shift"],
        ))
    return result


@router.get("/utilization", response_model=LaborUtilizationResponse)
async def get_utilization(
    factory_id: Optional[uuid.UUID] = Query(None),
    shift_id: Optional[uuid.UUID] = Query(None),
    hours: int = Query(8, ge=1, le=168),
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

    rows = await db.execute(
        text(f"""
            SELECT
                m.id AS machine_id,
                m.name AS machine_name,
                po.operator_id,
                u.full_name AS operator_name,
                COUNT(po.id) FILTER (WHERE po.status = 'completed') AS orders_completed,
                COALESCE(SUM(po.actual_good_count) FILTER (WHERE po.status = 'completed'), 0) AS total_good,
                COALESCE(SUM(po.actual_reject_count) FILTER (WHERE po.status = 'completed'), 0) AS total_reject,
                COUNT(msp.id) FILTER (WHERE msp.state = 'running') AS running_intervals,
                COUNT(msp.id) AS total_intervals
            FROM machines m
            LEFT JOIN production_orders po ON po.machine_id = m.id AND po.created_at >= :since
            LEFT JOIN users u ON u.id = po.operator_id
            LEFT JOIN machine_state_periods msp ON msp.machine_id = m.id AND msp.started_at >= :since
            WHERE m.organization_id = :org_id AND m.is_active = true
            {machine_filter}
            GROUP BY m.id, m.name, po.operator_id, u.full_name
            ORDER BY m.name ASC
        """),
        params,
    )

    machines: list[MachineUtilization] = []
    for r in rows.fetchall():
        rm = dict(r._mapping)
        total = rm["total_intervals"] or 1
        utilization_pct = round(100.0 * (rm["running_intervals"] or 0) / total, 1)
        machines.append(MachineUtilization(
            machine_id=rm["machine_id"],
            machine_name=rm["machine_name"],
            operator_id=rm["operator_id"],
            operator_name=rm["operator_name"],
            orders_completed=rm["orders_completed"] or 0,
            total_good=rm["total_good"],
            total_reject=rm["total_reject"],
            utilization_pct=utilization_pct,
        ))

    total_operators_row = await db.execute(
        text("SELECT COUNT(*) FROM users WHERE organization_id = :org_id AND role IN ('operator', 'technician')"),
        {"org_id": org_id},
    )
    total_operators = total_operators_row.scalar() or 0
    avg_util = round(sum(m.utilization_pct for m in machines) / len(machines), 1) if machines else 0.0

    return LaborUtilizationResponse(
        factory_id=factory_id,
        shift_id=shift_id,
        from_time=since,
        machines=machines,
        total_operators=total_operators,
        avg_utilization_pct=avg_util,
    )
