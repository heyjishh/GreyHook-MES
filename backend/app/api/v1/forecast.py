import uuid
from datetime import UTC, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.llm_caller import ask_claude
from pydantic import BaseModel

router = APIRouter(prefix="/forecast", tags=["forecast"])

_EWA_ALPHA = 0.3
_SEASONAL_PERIOD = 24


def _ewa_forecast(historical: list[float], horizon: int, alpha: float = _EWA_ALPHA) -> list[float]:
    if not historical:
        return [0.0] * horizon

    smoothed = historical[0]
    for v in historical[1:]:
        smoothed = alpha * v + (1 - alpha) * smoothed

    seasonal_base: list[float] = []
    if len(historical) >= _SEASONAL_PERIOD:
        last_period = historical[-_SEASONAL_PERIOD:]
        avg = sum(last_period) / len(last_period)
        seasonal_base = [v - avg for v in last_period]

    forecasts: list[float] = []
    for i in range(horizon):
        seasonal_adjustment = seasonal_base[i % len(seasonal_base)] if seasonal_base else 0.0
        predicted = max(0.0, min(1.0, smoothed + 0.01 * seasonal_adjustment))
        forecasts.append(round(predicted, 4))
    return forecasts


class ForecastPoint(BaseModel):
    ts: datetime
    predicted_oee: float
    predicted_oee_pct: float
    lower_bound: float
    upper_bound: float


class OeeForecastResponse(BaseModel):
    machine_id: uuid.UUID
    machine_name: Optional[str]
    horizon_hours: int
    historical_avg_oee: float
    trend: str
    forecast_points: list[ForecastPoint]
    ai_commentary: str


@router.get("/oee", response_model=OeeForecastResponse)
async def forecast_oee(
    machine_id: uuid.UUID,
    horizon_hours: int = Query(24, ge=1, le=168),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)

    machine_row = await db.execute(
        text("SELECT name FROM machines WHERE id = :id AND organization_id = :org_id"),
        {"id": str(machine_id), "org_id": org_id},
    )
    machine = machine_row.fetchone()
    machine_name = machine.name if machine else None

    history_rows = await db.execute(
        text("""
            SELECT oee_value, period_start
            FROM oee_aggregates
            WHERE machine_id = :machine_id AND organization_id = :org_id
              AND granularity = 'hour'
              AND period_start >= NOW() - INTERVAL '7 days'
            ORDER BY period_start ASC
            LIMIT 500
        """),
        {"machine_id": str(machine_id), "org_id": org_id},
    )
    history = history_rows.fetchall()
    oee_values = [float(r.oee_value) for r in history]

    if not oee_values:
        oee_values = [0.72]

    historical_avg = round(sum(oee_values) / len(oee_values), 4)

    if len(oee_values) >= 6:
        recent = oee_values[-6:]
        older = oee_values[-12:-6] if len(oee_values) >= 12 else oee_values[:len(oee_values) // 2]
        avg_recent = sum(recent) / len(recent)
        avg_older = sum(older) / len(older) if older else avg_recent
        delta = avg_recent - avg_older
        trend = "improving" if delta > 0.02 else "declining" if delta < -0.02 else "stable"
    else:
        trend = "insufficient_data"

    predicted = _ewa_forecast(oee_values, horizon_hours)
    stddev = 0.05
    now = datetime.now(UTC)
    forecast_points: list[ForecastPoint] = []
    for i, val in enumerate(predicted):
        ts = now + timedelta(hours=i + 1)
        forecast_points.append(ForecastPoint(
            ts=ts,
            predicted_oee=val,
            predicted_oee_pct=round(val * 100, 1),
            lower_bound=round(max(0.0, val - 1.96 * stddev), 4),
            upper_bound=round(min(1.0, val + 1.96 * stddev), 4),
        ))

    avg_forecast = round(sum(predicted) / len(predicted), 4) if predicted else historical_avg
    prompt = (
        f"You are a manufacturing AI assistant analyzing OEE (Overall Equipment Effectiveness) forecasts.\n\n"
        f"Machine: {machine_name or machine_id}\n"
        f"Historical average OEE (last 7 days): {historical_avg * 100:.1f}%\n"
        f"Trend: {trend}\n"
        f"Forecast horizon: {horizon_hours} hours\n"
        f"Forecasted average OEE: {avg_forecast * 100:.1f}%\n"
        f"Min forecasted: {min(predicted) * 100:.1f}%, Max forecasted: {max(predicted) * 100:.1f}%\n\n"
        f"Provide a 2-3 sentence insight on this OEE forecast: "
        f"what it means for production, what to watch for, and one actionable recommendation. "
        f"Be concise and practical for a factory floor supervisor."
    )
    ai_commentary = await ask_claude(prompt, db, current_user.organization_id, max_tokens=200)

    return OeeForecastResponse(
        machine_id=machine_id,
        machine_name=machine_name,
        horizon_hours=horizon_hours,
        historical_avg_oee=round(historical_avg * 100, 1),
        trend=trend,
        forecast_points=forecast_points,
        ai_commentary=ai_commentary,
    )
