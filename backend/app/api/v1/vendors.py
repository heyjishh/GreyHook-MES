"""Vendors (3PL providers) + vehicle devices — Fleetbase Vendor + VehicleDevice."""
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

router = APIRouter(prefix="/vendors", tags=["vendors"])
device_router = APIRouter(prefix="/vehicle-devices", tags=["vehicle-devices"])


class VendorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    type: str = "3pl"
    country: str = "IN"
    currency: str = "INR"
    place_id: Optional[uuid.UUID] = None


class DeviceCreate(BaseModel):
    vehicle_id: uuid.UUID
    vendor_id: Optional[uuid.UUID] = None
    device_id: str
    type: str = "gps"
    model: Optional[str] = None
    firmware: Optional[str] = None
    serial: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_vendor(
    body: VendorCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO vendors
                (organization_id, place_id, name, email, phone, website,
                 type, country, currency)
            VALUES (:org_id, :place_id, :name, :email, :phone, :website,
                    :type, :country, :currency)
            RETURNING id, name
        """),
        {
            "org_id": str(current_user.organization_id),
            "place_id": str(body.place_id) if body.place_id else None,
            "name": body.name, "email": body.email, "phone": body.phone,
            "website": body.website, "type": body.type,
            "country": body.country, "currency": body.currency,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name}


@router.get("")
async def list_vendors(
    q: Optional[str] = None,
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id)}
    if q:
        filters.append("(name ILIKE :q OR email ILIKE :q)"); params["q"] = f"%{q}%"
    if type:
        filters.append("type = :type"); params["type"] = type

    rows = await db.execute(
        text(f"SELECT id, name, email, phone, type, status, country FROM vendors WHERE {' AND '.join(filters)} ORDER BY name"),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{vendor_id}")
async def get_vendor(
    vendor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("SELECT * FROM vendors WHERE id = :id AND organization_id = :org_id"),
        {"id": str(vendor_id), "org_id": str(current_user.organization_id)},
    )
    v = row.fetchone()
    if not v:
        raise HTTPException(404, "Vendor not found")
    return dict(v._mapping)


@device_router.post("", status_code=status.HTTP_201_CREATED)
async def create_device(
    body: DeviceCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO vehicle_devices
                (organization_id, vehicle_id, vendor_id, device_id, type, model, firmware, serial)
            VALUES (:org_id, :vehicle_id, :vendor_id, :device_id, :type, :model, :firmware, :serial)
            RETURNING id, device_id
        """),
        {
            "org_id": str(current_user.organization_id),
            "vehicle_id": str(body.vehicle_id),
            "vendor_id": str(body.vendor_id) if body.vendor_id else None,
            "device_id": body.device_id, "type": body.type,
            "model": body.model, "firmware": body.firmware, "serial": body.serial,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "device_id": row.device_id}


@device_router.get("/vehicle/{vehicle_id}")
async def get_vehicle_devices(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT d.id, d.device_id, d.type, d.model, d.status, d.last_seen_at,
                   v.name AS vendor_name
            FROM vehicle_devices d
            LEFT JOIN vendors v ON d.vendor_id = v.id
            WHERE d.vehicle_id = :vehicle_id AND d.organization_id = :org_id
        """),
        {"vehicle_id": str(vehicle_id), "org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]
