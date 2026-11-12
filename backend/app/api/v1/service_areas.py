"""Service areas, zones, and pricing rates — Fleetbase ServiceArea/Zone/ServiceRate."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/service-areas", tags=["service-areas"])


class ServiceAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    border: Optional[dict] = None
    country: str = "IN"
    status: str = "active"


class ServiceZoneCreate(BaseModel):
    service_area_id: uuid.UUID
    name: str
    description: Optional[str] = None
    border: Optional[dict] = None
    color: str = "#3B82F6"
    status: str = "active"


class ServiceRateFee(BaseModel):
    fee_type: str
    amount: float
    calculation_method: str = "flat"
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    currency: str = "INR"


class ServiceRateCreate(BaseModel):
    service_area_id: Optional[uuid.UUID] = None
    zone_id: Optional[uuid.UUID] = None
    name: str
    type: str = "default"
    algorithm: str = "flat"
    base_fee: float = 0.0
    per_km_fee: float = 0.0
    per_kg_fee: float = 0.0
    minimum_charge: float = 0.0
    cod_fee: float = 0.0
    cod_fee_type: str = "flat"
    peak_hours_enabled: bool = False
    peak_hours_multiplier: float = 1.5
    currency: str = "INR"
    fees: list[ServiceRateFee] = []


# ─── Service Areas ────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_service_area(
    body: ServiceAreaCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO service_areas
                (organization_id, name, description, border, country, status)
            VALUES (:org_id, :name, :desc, :border::jsonb, :country, :status)
            RETURNING id, name
        """),
        {
            "org_id": str(current_user.organization_id),
            "name": body.name, "desc": body.description,
            "border": __import__("json").dumps(body.border) if body.border else None,
            "country": body.country, "status": body.status,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name}


@router.get("")
async def list_service_areas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT sa.id, sa.name, sa.country, sa.status,
                   COUNT(DISTINCT sz.id) AS zone_count,
                   COUNT(DISTINCT sr.id) AS rate_count
            FROM service_areas sa
            LEFT JOIN service_zones sz ON sz.service_area_id = sa.id
            LEFT JOIN service_rates sr ON sr.service_area_id = sa.id
            WHERE sa.organization_id = :org_id
            GROUP BY sa.id
            ORDER BY sa.name
        """),
        {"org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{area_id}")
async def get_service_area(
    area_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("SELECT * FROM service_areas WHERE id = :id AND organization_id = :org_id"),
        {"id": str(area_id), "org_id": str(current_user.organization_id)},
    )
    area = row.fetchone()
    if not area:
        raise HTTPException(404, "Service area not found")

    zones = await db.execute(
        text("SELECT id, name, color, status FROM service_zones WHERE service_area_id = :id"),
        {"id": str(area_id)},
    )
    rates = await db.execute(
        text("""
            SELECT id, name, type, algorithm, base_fee, per_km_fee, currency
            FROM service_rates WHERE service_area_id = :id
        """),
        {"id": str(area_id)},
    )
    return {
        **dict(area._mapping),
        "zones": [dict(z._mapping) for z in zones.fetchall()],
        "rates": [dict(r._mapping) for r in rates.fetchall()],
    }


# ─── Zones ────────────────────────────────────────────────────────────────────

zones_router = APIRouter(prefix="/service-zones", tags=["service-zones"])


@zones_router.post("", status_code=status.HTTP_201_CREATED)
async def create_zone(
    body: ServiceZoneCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    check = await db.execute(
        text("SELECT id FROM service_areas WHERE id = :id AND organization_id = :org_id"),
        {"id": str(body.service_area_id), "org_id": str(current_user.organization_id)},
    )
    if not check.fetchone():
        raise HTTPException(404, "Service area not found")

    result = await db.execute(
        text("""
            INSERT INTO service_zones
                (organization_id, service_area_id, name, description, border, color, status)
            VALUES (:org_id, :area_id, :name, :desc, :border::jsonb, :color, :status)
            RETURNING id, name
        """),
        {
            "org_id": str(current_user.organization_id),
            "area_id": str(body.service_area_id),
            "name": body.name, "desc": body.description,
            "border": __import__("json").dumps(body.border) if body.border else None,
            "color": body.color, "status": body.status,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name}


# ─── Rates ────────────────────────────────────────────────────────────────────

rates_router = APIRouter(prefix="/service-rates", tags=["service-rates"])


@rates_router.post("", status_code=status.HTTP_201_CREATED)
async def create_rate(
    body: ServiceRateCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    if not body.service_area_id and not body.zone_id:
        raise HTTPException(400, "Either service_area_id or zone_id required")

    result = await db.execute(
        text("""
            INSERT INTO service_rates
                (organization_id, service_area_id, zone_id, name, type, algorithm,
                 base_fee, per_km_fee, per_kg_fee, minimum_charge,
                 cod_fee, cod_fee_type, peak_hours_enabled, peak_hours_multiplier, currency)
            VALUES
                (:org_id, :area_id, :zone_id, :name, :type, :algo,
                 :base_fee, :per_km, :per_kg, :min_charge,
                 :cod_fee, :cod_fee_type, :peak, :peak_mult, :currency)
            RETURNING id, name
        """),
        {
            "org_id": str(current_user.organization_id),
            "area_id": str(body.service_area_id) if body.service_area_id else None,
            "zone_id": str(body.zone_id) if body.zone_id else None,
            "name": body.name, "type": body.type, "algo": body.algorithm,
            "base_fee": body.base_fee, "per_km": body.per_km_fee,
            "per_kg": body.per_kg_fee, "min_charge": body.minimum_charge,
            "cod_fee": body.cod_fee, "cod_fee_type": body.cod_fee_type,
            "peak": body.peak_hours_enabled, "peak_mult": body.peak_hours_multiplier,
            "currency": body.currency,
        },
    )
    rate = result.fetchone()
    rate_id = rate.id

    for fee in body.fees:
        await db.execute(
            text("""
                INSERT INTO service_rate_fees
                    (rate_id, fee_type, amount, calculation_method,
                     min_value, max_value, currency)
                VALUES (:rate_id, :fee_type, :amount, :method, :min_v, :max_v, :currency)
            """),
            {
                "rate_id": str(rate_id), "fee_type": fee.fee_type,
                "amount": fee.amount, "method": fee.calculation_method,
                "min_v": fee.min_value, "max_v": fee.max_value,
                "currency": fee.currency,
            },
        )

    await db.commit()
    return {"id": str(rate_id), "name": rate.name}


@rates_router.get("")
async def list_rates(
    service_area_id: Optional[uuid.UUID] = None,
    zone_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["sr.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id)}
    if service_area_id:
        filters.append("sr.service_area_id = :area_id"); params["area_id"] = str(service_area_id)
    if zone_id:
        filters.append("sr.zone_id = :zone_id"); params["zone_id"] = str(zone_id)

    rows = await db.execute(
        text(f"""
            SELECT sr.id, sr.name, sr.type, sr.algorithm,
                   sr.base_fee, sr.per_km_fee, sr.currency,
                   sa.name AS area_name, sz.name AS zone_name
            FROM service_rates sr
            LEFT JOIN service_areas sa ON sr.service_area_id = sa.id
            LEFT JOIN service_zones sz ON sr.zone_id = sz.id
            WHERE {' AND '.join(filters)}
            ORDER BY sr.name
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@rates_router.get("/{rate_id}")
async def get_rate(
    rate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM service_rates WHERE id = :id AND organization_id = :org_id"),
        {"id": str(rate_id), "org_id": str(current_user.organization_id)},
    )
    rate = hdr.fetchone()
    if not rate:
        raise HTTPException(404, "Rate not found")

    fees = await db.execute(
        text("SELECT * FROM service_rate_fees WHERE rate_id = :id"),
        {"id": str(rate_id)},
    )
    return {**dict(rate._mapping), "fees": [dict(f._mapping) for f in fees.fetchall()]}
