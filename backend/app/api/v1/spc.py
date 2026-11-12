import math
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

router = APIRouter(prefix="/spc", tags=["spc"])

_DEFAULT_HOURS = 8


class SpcPoint(BaseModel):
    ts: datetime
    value: float
    is_violation: bool


class SpcChartResponse(BaseModel):
    machine_id: uuid.UUID
    tag: str
    hours: int
    mean: float | None
    ucl: float | None
    lcl: float | None
    stddev: float | None
    point_count: int
    violation_count: int
    points: list[SpcPoint]


@router.get("/charts", response_model=SpcChartResponse)
async def get_spc_chart(
    machine_id: uuid.UUID,
    tag: str = Query(...),
    hours: int = Query(_DEFAULT_HOURS, ge=1, le=168),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    since = datetime.now(UTC) - timedelta(hours=hours)

    rows = await db.execute(
        text("""
            SELECT mt.timestamp, mt.value
            FROM machine_telemetry mt
            JOIN machines m ON m.id = mt.machine_id
            WHERE mt.machine_id = :machine_id
              AND mt.organization_id = :org_id
              AND mt.tag_name = :tag
              AND mt.timestamp >= :since
            ORDER BY mt.timestamp ASC
        """),
        {"machine_id": str(machine_id), "org_id": org_id, "tag": tag, "since": since},
    )
    readings = rows.fetchall()

    if not readings:
        return SpcChartResponse(
            machine_id=machine_id, tag=tag, hours=hours,
            mean=None, ucl=None, lcl=None, stddev=None,
            point_count=0, violation_count=0, points=[],
        )

    values = [float(r.value) for r in readings]
    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    stddev = math.sqrt(variance)
    sigma3 = 3.0 * stddev
    ucl = mean + sigma3
    lcl = mean - sigma3

    points = [
        SpcPoint(ts=r.timestamp, value=float(r.value), is_violation=(float(r.value) > ucl or float(r.value) < lcl))
        for r in readings
    ]
    violation_count = sum(1 for p in points if p.is_violation)

    return SpcChartResponse(
        machine_id=machine_id, tag=tag, hours=hours,
        mean=round(mean, 4), ucl=round(ucl, 4), lcl=round(lcl, 4), stddev=round(stddev, 4),
        point_count=n, violation_count=violation_count, points=points,
    )
