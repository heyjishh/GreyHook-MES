import uuid
from datetime import UTC, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/andon", tags=["andon"])


class AndonAlert(BaseModel):
    id: str
    alert_type: str
    severity: str
    machine_id: Optional[uuid.UUID]
    machine_name: Optional[str]
    message: str
    started_at: datetime
    acknowledged_at: Optional[datetime]
    acknowledged_by: Optional[str]
    is_active: bool


class AndonBoardResponse(BaseModel):
    factory_id: Optional[uuid.UUID]
    as_of: datetime
    total_alerts: int
    critical_count: int
    warning_count: int
    alerts: list[AndonAlert]


class AcknowledgeBody(BaseModel):
    note: Optional[str] = None


@router.get("/board", response_model=AndonBoardResponse)
async def get_andon_board(
    factory_id: Optional[uuid.UUID] = Query(None),
    hours: int = Query(8, ge=1, le=168),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    since = datetime.now(UTC) - timedelta(hours=hours)
    alerts: list[AndonAlert] = []

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

    fault_rows = await db.execute(
        text(f"""
            SELECT msp.id, m.id AS machine_id, m.name AS machine_name,
                   msp.started_at, msp.ended_at,
                   msp.acknowledged_at, msp.acknowledged_by_user_id,
                   u.full_name AS ack_by_name
            FROM machine_state_periods msp
            JOIN machines m ON m.id = msp.machine_id
            LEFT JOIN users u ON u.id = msp.acknowledged_by_user_id
            WHERE msp.organization_id = :org_id
              AND msp.state = 'fault'
              AND msp.started_at >= :since
              AND (msp.ended_at IS NULL OR msp.ended_at >= :since)
            {machine_filter}
            ORDER BY msp.started_at DESC
            LIMIT 200
        """),
        params,
    )
    for r in fault_rows.fetchall():
        rm = dict(r._mapping)
        is_active = rm["ended_at"] is None
        alerts.append(AndonAlert(
            id=f"fault-{rm['id']}",
            alert_type="machine_fault",
            severity="critical",
            machine_id=rm["machine_id"],
            machine_name=rm["machine_name"],
            message=f"Machine fault: {rm['machine_name']} has been in fault state since {rm['started_at'].strftime('%H:%M')}",
            started_at=rm["started_at"],
            acknowledged_at=rm["acknowledged_at"],
            acknowledged_by=rm["ack_by_name"],
            is_active=is_active,
        ))

    oee_rows = await db.execute(
        text(f"""
            SELECT oa.id, m.id AS machine_id, m.name AS machine_name,
                   oa.period_start, oa.oee_value
            FROM oee_aggregates oa
            JOIN machines m ON m.id = oa.machine_id
            WHERE oa.organization_id = :org_id
              AND oa.period_start >= :since
              AND oa.oee_value < 0.6
              AND oa.granularity = 'shift'
            {machine_filter}
            ORDER BY oa.period_start DESC
            LIMIT 50
        """),
        params,
    )
    for r in oee_rows.fetchall():
        rm = dict(r._mapping)
        oee_pct = round(float(rm["oee_value"]) * 100, 1)
        severity = "critical" if oee_pct < 40 else "warning"
        alerts.append(AndonAlert(
            id=f"oee-{rm['id']}",
            alert_type="oee_low",
            severity=severity,
            machine_id=rm["machine_id"],
            machine_name=rm["machine_name"],
            message=f"Low OEE alert: {rm['machine_name']} OEE dropped to {oee_pct}% (threshold: 60%)",
            started_at=rm["period_start"],
            acknowledged_at=None,
            acknowledged_by=None,
            is_active=True,
        ))

    downtime_rows = await db.execute(
        text(f"""
            SELECT de.id, m.id AS machine_id, m.name AS machine_name,
                   de.started_at, de.reason_code
            FROM downtime_events de
            JOIN machines m ON m.id = de.machine_id
            WHERE de.organization_id = :org_id
              AND de.started_at >= :since
              AND de.reason_code IS NULL
              AND de.ended_at IS NULL
            {machine_filter}
            ORDER BY de.started_at DESC
            LIMIT 50
        """),
        params,
    )
    for r in downtime_rows.fetchall():
        rm = dict(r._mapping)
        alerts.append(AndonAlert(
            id=f"downtime-{rm['id']}",
            alert_type="unclassified_downtime",
            severity="warning",
            machine_id=rm["machine_id"],
            machine_name=rm["machine_name"],
            message=f"Unclassified downtime on {rm['machine_name']} — reason unknown since {rm['started_at'].strftime('%H:%M')}",
            started_at=rm["started_at"],
            acknowledged_at=None,
            acknowledged_by=None,
            is_active=True,
        ))

    alerts.sort(key=lambda a: (0 if a.severity == "critical" else 1, not a.is_active, a.started_at), reverse=False)
    critical_count = sum(1 for a in alerts if a.severity == "critical" and a.is_active)
    warning_count = sum(1 for a in alerts if a.severity == "warning" and a.is_active)

    return AndonBoardResponse(
        factory_id=factory_id,
        as_of=datetime.now(UTC),
        total_alerts=len(alerts),
        critical_count=critical_count,
        warning_count=warning_count,
        alerts=alerts,
    )


@router.post("/board/{alert_id}/acknowledge", status_code=200)
async def acknowledge_alert(
    alert_id: str,
    body: AcknowledgeBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    now = datetime.now(UTC)

    if alert_id.startswith("fault-"):
        period_id = alert_id.removeprefix("fault-")
        result = await db.execute(
            text("""
                UPDATE machine_state_periods
                SET acknowledged_at = :now, acknowledged_by_user_id = :user_id
                WHERE id = :id AND organization_id = :org_id
                RETURNING id
            """),
            {"now": now, "user_id": str(current_user.id), "id": period_id, "org_id": org_id},
        )
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Alert not found")
        await db.commit()
        return {"acknowledged": True, "alert_id": alert_id, "acknowledged_at": now.isoformat()}

    return {"acknowledged": True, "alert_id": alert_id, "acknowledged_at": now.isoformat(), "note": "In-memory acknowledgement only for OEE/downtime alerts"}
