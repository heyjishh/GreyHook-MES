"""Geocoded address book — Fleetbase Place model."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/places", tags=["places"])


class PlaceCreate(BaseModel):
    name: Optional[str] = None
    type: str = "address"
    street1: Optional[str] = None
    street2: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    neighborhood: Optional[str] = None
    district: Optional[str] = None
    building: Optional[str] = None
    country: str = "IN"
    security_access_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    meta: Optional[dict] = None


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    street1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_place(
    body: PlaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO places
                (organization_id, name, type, street1, street2, city, province,
                 postal_code, neighborhood, district, building, country,
                 security_access_code, lat, lng, phone, meta)
            VALUES
                (:org_id, :name, :type, :street1, :street2, :city, :province,
                 :postal_code, :neighborhood, :district, :building, :country,
                 :sac, :lat, :lng, :phone, :meta)
            RETURNING id, name,
                COALESCE(street1 || ', ', '') ||
                COALESCE(city || ', ', '') ||
                COALESCE(province || ' ', '') ||
                COALESCE(postal_code, '') AS address
        """),
        {
            "org_id": str(current_user.organization_id),
            "name": body.name, "type": body.type,
            "street1": body.street1, "street2": body.street2,
            "city": body.city, "province": body.province,
            "postal_code": body.postal_code, "neighborhood": body.neighborhood,
            "district": body.district, "building": body.building,
            "country": body.country, "sac": body.security_access_code,
            "lat": body.lat, "lng": body.lng, "phone": body.phone,
            "meta": str(body.meta or {}),
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name, "address": row.address}


@router.get("")
async def list_places(
    q: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if q:
        filters.append("""
            (name ILIKE :q OR city ILIKE :q OR street1 ILIKE :q
             OR postal_code ILIKE :q OR district ILIKE :q)
        """)
        params["q"] = f"%{q}%"

    rows = await db.execute(
        text(f"""
            SELECT id, name, type, street1, city, province, postal_code,
                   country, lat, lng, phone,
                   COALESCE(street1 || ', ', '') ||
                   COALESCE(city || ', ', '') ||
                   COALESCE(province || ' ', '') ||
                   COALESCE(postal_code, '') AS address
            FROM places
            WHERE {' AND '.join(filters)}
            ORDER BY name NULLS LAST, city
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{place_id}")
async def get_place(
    place_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("SELECT * FROM places WHERE id = :id AND organization_id = :org_id"),
        {"id": str(place_id), "org_id": str(current_user.organization_id)},
    )
    p = row.fetchone()
    if not p:
        raise HTTPException(404, "Place not found")
    return dict(p._mapping)


@router.patch("/{place_id}")
async def update_place(
    place_id: uuid.UUID,
    body: PlaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = ["updated_at = NOW()"]
    params: dict = {"id": str(place_id), "org_id": str(current_user.organization_id)}
    for field, val in body.model_dump(exclude_none=True).items():
        updates.append(f"{field} = :{field}"); params[field] = val

    result = await db.execute(
        text(f"UPDATE places SET {', '.join(updates)} WHERE id = :id AND organization_id = :org_id RETURNING id"),
        params,
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Place not found")
    return {"ok": True}
