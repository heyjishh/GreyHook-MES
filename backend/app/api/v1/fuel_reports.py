"""Fuel reports — vehicle fuel logs (Fleetbase FuelReport model)."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/fuel-reports", tags=["fuel-reports"])


class FuelReportCreate(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    odometer: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    amount: Optional[float] = None
    currency: str = "INR"
    volume: Optional[float] = None
    metric_unit: str = "liters"
    fuel_type: str = "diesel"
    notes: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_fuel_report(
    body: FuelReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO fuel_reports
                (organization_id, vehicle_id, driver_id, odometer, lat, lng,
                 amount, currency, volume, metric_unit, fuel_type, notes)
            VALUES (:org_id, :vehicle_id, :driver_id, :odometer, :lat, :lng,
                    :amount, :currency, :volume, :metric_unit, :fuel_type, :notes)
            RETURNING id, reported_at
        """),
        {
            "org_id": str(current_user.organization_id),
            "vehicle_id": str(body.vehicle_id),
            "driver_id": str(body.driver_id) if body.driver_id else None,
            "odometer": body.odometer, "lat": body.lat, "lng": body.lng,
            "amount": body.amount, "currency": body.currency,
            "volume": body.volume, "metric_unit": body.metric_unit,
            "fuel_type": body.fuel_type, "notes": body.notes,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "reported_at": str(row.reported_at)}


@router.get("")
async def list_fuel_reports(
    vehicle_id: Optional[uuid.UUID] = None,
    driver_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["fr.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if vehicle_id:
        filters.append("fr.vehicle_id = :vehicle_id"); params["vehicle_id"] = str(vehicle_id)
    if driver_id:
        filters.append("fr.driver_id = :driver_id"); params["driver_id"] = str(driver_id)

    rows = await db.execute(
        text(f"""
            SELECT fr.id, fr.odometer, fr.amount, fr.currency, fr.volume,
                   fr.fuel_type, fr.metric_unit, fr.lat, fr.lng, fr.reported_at,
                   v.registration_number AS vehicle_reg, d.name AS driver_name
            FROM fuel_reports fr
            LEFT JOIN fleet_vehicles v ON fr.vehicle_id = v.id
            LEFT JOIN fleet_drivers d ON fr.driver_id = d.id
            WHERE {' AND '.join(filters)}
            ORDER BY fr.reported_at DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/vehicle/{vehicle_id}/summary")
async def vehicle_fuel_summary(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("""
            SELECT COUNT(*) AS fill_count,
                   SUM(volume) AS total_volume,
                   SUM(amount) AS total_cost,
                   AVG(amount / NULLIF(volume, 0)) AS avg_cost_per_liter,
                   MAX(odometer) AS latest_odometer
            FROM fuel_reports
            WHERE vehicle_id = :vid AND organization_id = :org_id
        """),
        {"vid": str(vehicle_id), "org_id": str(current_user.organization_id)},
    )
    return dict(row.fetchone()._mapping)
