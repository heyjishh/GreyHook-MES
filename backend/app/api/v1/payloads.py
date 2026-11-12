"""Payloads + entities + waypoints — Fleetbase Payload/Entity/Waypoint models."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/payloads", tags=["payloads"])


class EntityCreate(BaseModel):
    name: str
    type: str = "item"
    description: Optional[str] = None
    internal_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: str = "kg"
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    dimensions_unit: str = "cm"
    declared_value: Optional[float] = None
    price: Optional[float] = None
    currency: str = "INR"
    destination_place_id: Optional[uuid.UUID] = None
    tracking_number_id: Optional[uuid.UUID] = None


class WaypointCreate(BaseModel):
    place_id: uuid.UUID
    sequence: int = 0
    notes: Optional[str] = None


class PayloadCreate(BaseModel):
    pickup_place_id: Optional[uuid.UUID] = None
    dropoff_place_id: Optional[uuid.UUID] = None
    return_place_id: Optional[uuid.UUID] = None
    payment_method: str = "account"
    cod_amount: Optional[float] = None
    cod_currency: str = "INR"
    cod_payment_method: Optional[str] = None
    type: str = "default"
    entities: list[EntityCreate] = []
    waypoints: list[WaypointCreate] = []


class WaypointStatusUpdate(BaseModel):
    status: str
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_payload(
    body: PayloadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO payloads
                (organization_id, pickup_place_id, dropoff_place_id, return_place_id,
                 payment_method, cod_amount, cod_currency, cod_payment_method, type)
            VALUES
                (:org_id, :pickup, :dropoff, :return_p,
                 :pay_method, :cod_amount, :cod_currency, :cod_pay_method, :type)
            RETURNING id
        """),
        {
            "org_id": str(current_user.organization_id),
            "pickup": str(body.pickup_place_id) if body.pickup_place_id else None,
            "dropoff": str(body.dropoff_place_id) if body.dropoff_place_id else None,
            "return_p": str(body.return_place_id) if body.return_place_id else None,
            "pay_method": body.payment_method,
            "cod_amount": body.cod_amount, "cod_currency": body.cod_currency,
            "cod_pay_method": body.cod_payment_method, "type": body.type,
        },
    )
    payload_id = result.fetchone().id

    for entity in body.entities:
        await db.execute(
            text("""
                INSERT INTO cargo_entities
                    (organization_id, payload_id, tracking_number_id, destination_place_id,
                     internal_id, name, type, description, currency, barcode, weight,
                     weight_unit, length, width, height, dimensions_unit,
                     declared_value, sku, price)
                VALUES
                    (:org_id, :payload_id, :tn_id, :dest,
                     :internal_id, :name, :type, :desc, :currency, :barcode, :weight,
                     :weight_unit, :length, :width, :height, :dim_unit,
                     :declared_value, :sku, :price)
            """),
            {
                "org_id": str(current_user.organization_id),
                "payload_id": str(payload_id),
                "tn_id": str(entity.tracking_number_id) if entity.tracking_number_id else None,
                "dest": str(entity.destination_place_id) if entity.destination_place_id else None,
                "internal_id": entity.internal_id, "name": entity.name,
                "type": entity.type, "desc": entity.description,
                "currency": entity.currency, "barcode": entity.barcode,
                "weight": entity.weight, "weight_unit": entity.weight_unit,
                "length": entity.length, "width": entity.width, "height": entity.height,
                "dim_unit": entity.dimensions_unit, "declared_value": entity.declared_value,
                "sku": entity.sku, "price": entity.price,
            },
        )

    for wp in sorted(body.waypoints, key=lambda w: w.sequence):
        await db.execute(
            text("""
                INSERT INTO waypoints (payload_id, place_id, sequence, notes)
                VALUES (:payload_id, :place_id, :seq, :notes)
            """),
            {
                "payload_id": str(payload_id),
                "place_id": str(wp.place_id),
                "seq": wp.sequence, "notes": wp.notes,
            },
        )

    await db.commit()
    return {"id": str(payload_id)}


@router.get("/{payload_id}")
async def get_payload(
    payload_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM payloads WHERE id = :id AND organization_id = :org_id"),
        {"id": str(payload_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Payload not found")

    entities = await db.execute(
        text("""
            SELECT ce.*, p.name AS destination_name,
                   p.city AS destination_city, p.lat, p.lng
            FROM cargo_entities ce
            LEFT JOIN places p ON ce.destination_place_id = p.id
            WHERE ce.payload_id = :id
            ORDER BY ce.created_at
        """),
        {"id": str(payload_id)},
    )
    waypoints = await db.execute(
        text("""
            SELECT w.id, w.sequence, w.status, w.arrived_at, w.completed_at,
                   p.name AS place_name, p.street1, p.city, p.lat, p.lng
            FROM waypoints w
            LEFT JOIN places p ON w.place_id = p.id
            WHERE w.payload_id = :id
            ORDER BY w.sequence
        """),
        {"id": str(payload_id)},
    )
    return {
        **dict(row._mapping),
        "entities": [dict(e._mapping) for e in entities.fetchall()],
        "waypoints": [dict(w._mapping) for w in waypoints.fetchall()],
    }


@router.patch("/{payload_id}/waypoints/{waypoint_id}/status")
async def update_waypoint_status(
    payload_id: uuid.UUID,
    waypoint_id: uuid.UUID,
    body: WaypointStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid = ("pending", "arrived", "completed", "skipped")
    if body.status not in valid:
        raise HTTPException(400, f"status must be one of {valid}")

    sets = ["status = :status", "updated_at = NOW()" if False else ""]
    if body.status == "arrived":
        sets = ["status = :status", "arrived_at = NOW()"]
    elif body.status == "completed":
        sets = ["status = :status", "completed_at = NOW()"]
    else:
        sets = ["status = :status"]

    result = await db.execute(
        text(f"""
            UPDATE waypoints SET {', '.join(sets)}
            WHERE id = :id AND payload_id = :payload_id
            RETURNING id, status
        """),
        {"status": body.status, "id": str(waypoint_id), "payload_id": str(payload_id)},
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Waypoint not found")
    return {"ok": True}
