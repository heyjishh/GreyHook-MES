"""Tracking numbers + status history — Fleetbase TrackingNumber + TrackingStatus."""
import hashlib
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/tracking", tags=["tracking"])


def _gen_tracking_number(org_id: uuid.UUID) -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")[:18]
    h = hashlib.sha256(f"{org_id}{ts}".encode()).hexdigest()[:6].upper()
    return f"GH{ts[:8]}{h}"


class TrackingStatusCreate(BaseModel):
    order_id: Optional[uuid.UUID] = None
    tracking_number_id: Optional[uuid.UUID] = None
    status: str
    details: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "IN"
    lat: Optional[float] = None
    lng: Optional[float] = None
    proof_id: Optional[uuid.UUID] = None


@router.post("/numbers", status_code=status.HTTP_201_CREATED)
async def create_tracking_number(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tn = _gen_tracking_number(current_user.organization_id)
    result = await db.execute(
        text("""
            INSERT INTO tracking_numbers (organization_id, tracking_number)
            VALUES (:org_id, :tn)
            RETURNING id, tracking_number
        """),
        {"org_id": str(current_user.organization_id), "tn": tn},
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "tracking_number": row.tracking_number}


@router.get("/numbers/{tracking_number}")
async def get_by_tracking_number(
    tracking_number: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tn_row = await db.execute(
        text("""
            SELECT id, tracking_number FROM tracking_numbers
            WHERE organization_id = :org_id AND tracking_number = :tn
        """),
        {"org_id": str(current_user.organization_id), "tn": tracking_number.upper()},
    )
    tn = tn_row.fetchone()
    if not tn:
        raise HTTPException(404, "Tracking number not found")

    statuses = await db.execute(
        text("""
            SELECT ts.*, p.file_url AS proof_url, p.type AS proof_type
            FROM tracking_statuses ts
            LEFT JOIN proofs p ON ts.proof_id = p.id
            WHERE ts.tracking_number_id = :tn_id
            ORDER BY ts.created_at DESC
        """),
        {"tn_id": str(tn.id)},
    )
    return {
        "tracking_number": tn.tracking_number,
        "id": str(tn.id),
        "statuses": [dict(s._mapping) for s in statuses.fetchall()],
    }


@router.post("/statuses", status_code=status.HTTP_201_CREATED)
async def add_tracking_status(
    body: TrackingStatusCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.order_id and not body.tracking_number_id:
        raise HTTPException(400, "Either order_id or tracking_number_id required")

    code = body.status.upper().replace(" ", "_")
    result = await db.execute(
        text("""
            INSERT INTO tracking_statuses
                (organization_id, tracking_number_id, order_id, proof_id,
                 status, code, details, city, province, postal_code, country, lat, lng)
            VALUES
                (:org_id, :tn_id, :order_id, :proof_id,
                 :status, :code, :details, :city, :province, :postal_code, :country, :lat, :lng)
            RETURNING id, status, code, created_at
        """),
        {
            "org_id": str(current_user.organization_id),
            "tn_id": str(body.tracking_number_id) if body.tracking_number_id else None,
            "order_id": str(body.order_id) if body.order_id else None,
            "proof_id": str(body.proof_id) if body.proof_id else None,
            "status": body.status, "code": code,
            "details": body.details, "city": body.city,
            "province": body.province, "postal_code": body.postal_code,
            "country": body.country, "lat": body.lat, "lng": body.lng,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "status": row.status, "code": row.code}


@router.get("/orders/{order_id}/statuses")
async def order_tracking_history(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT ts.id, ts.status, ts.code, ts.details,
                   ts.city, ts.country, ts.lat, ts.lng, ts.created_at,
                   p.file_url AS proof_url, p.type AS proof_type,
                   p.signature_data
            FROM tracking_statuses ts
            LEFT JOIN proofs p ON ts.proof_id = p.id
            WHERE ts.order_id = :order_id AND ts.organization_id = :org_id
            ORDER BY ts.created_at DESC
        """),
        {"order_id": str(order_id), "org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]
