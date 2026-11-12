"""Proof of Delivery — photo, signature, barcode capture."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/proofs", tags=["proofs"])


class ProofCreate(BaseModel):
    order_id: Optional[uuid.UUID] = None
    type: str = "photo"
    file_url: Optional[str] = None
    signature_data: Optional[str] = None
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_proof(
    body: ProofCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid_types = ("photo", "signature", "barcode", "qr_code", "pin")
    if body.type not in valid_types:
        raise HTTPException(400, f"type must be one of {valid_types}")
    if not body.file_url and not body.signature_data:
        raise HTTPException(400, "Either file_url or signature_data required")

    result = await db.execute(
        text("""
            INSERT INTO proofs
                (organization_id, order_id, type, file_url, signature_data,
                 notes, lat, lng)
            VALUES
                (:org_id, :order_id, :type, :file_url, :sig_data,
                 :notes, :lat, :lng)
            RETURNING id, type
        """),
        {
            "org_id": str(current_user.organization_id),
            "order_id": str(body.order_id) if body.order_id else None,
            "type": body.type, "file_url": body.file_url,
            "sig_data": body.signature_data, "notes": body.notes,
            "lat": body.lat, "lng": body.lng,
        },
    )
    await db.commit()
    row = result.fetchone()

    if body.order_id:
        await db.execute(
            text("""
                UPDATE fleet_delivery_orders
                SET pod_url = COALESCE(:file_url, pod_url), updated_at = NOW()
                WHERE id = :order_id AND organization_id = :org_id
            """),
            {
                "file_url": body.file_url,
                "order_id": str(body.order_id),
                "org_id": str(current_user.organization_id),
            },
        )
        await db.commit()

    return {"id": str(row.id), "type": row.type}


@router.get("/{order_id}")
async def get_proofs_for_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT id, type, file_url, signature_data, notes,
                   lat, lng, captured_at
            FROM proofs
            WHERE order_id = :order_id AND organization_id = :org_id
            ORDER BY captured_at DESC
        """),
        {"order_id": str(order_id), "org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]
