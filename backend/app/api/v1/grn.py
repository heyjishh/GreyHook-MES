import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/grn", tags=["grn"])


class GRNLine(BaseModel):
    item_id: uuid.UUID
    ordered_qty: Optional[float] = None
    received_qty: float
    accepted_qty: Optional[float] = None
    rejected_qty: Optional[float] = None
    unit_rate: Optional[float] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    qc_notes: Optional[str] = None


class GRNCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    gate_pass_id: Optional[uuid.UUID] = None
    supplier_name: str
    purchase_order_ref: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    notes: Optional[str] = None
    lines: list[GRNLine]


class GRNAccept(BaseModel):
    action: str


def _next_grn_number() -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"GRN-{ts}"


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_grn(
    body: GRNCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.lines:
        raise HTTPException(400, "At least one line item required")

    grn_number = _next_grn_number()
    result = await db.execute(
        text("""
            INSERT INTO grn_headers
                (organization_id, factory_id, grn_number, gate_pass_id, supplier_name,
                 purchase_order_ref, invoice_number, invoice_date, notes, received_by)
            VALUES
                (:org_id, :factory_id, :grn_number, :gate_pass_id, :supplier_name,
                 :po_ref, :invoice_number, :invoice_date, :notes, :user_id)
            RETURNING id, grn_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "grn_number": grn_number,
            "gate_pass_id": str(body.gate_pass_id) if body.gate_pass_id else None,
            "supplier_name": body.supplier_name,
            "po_ref": body.purchase_order_ref,
            "invoice_number": body.invoice_number,
            "invoice_date": body.invoice_date,
            "notes": body.notes,
            "user_id": str(current_user.id),
        },
    )
    grn_row = result.fetchone()
    grn_id = grn_row.id

    for line in body.lines:
        accepted = line.accepted_qty if line.accepted_qty is not None else line.received_qty
        rejected = line.rejected_qty if line.rejected_qty is not None else 0.0
        await db.execute(
            text("""
                INSERT INTO grn_lines
                    (grn_id, item_id, ordered_qty, received_qty, accepted_qty, rejected_qty,
                     unit_rate, batch_number, expiry_date, qc_notes)
                VALUES
                    (:grn_id, :item_id, :ordered_qty, :received_qty, :accepted_qty, :rejected_qty,
                     :unit_rate, :batch_number, :expiry_date, :qc_notes)
            """),
            {
                "grn_id": str(grn_id),
                "item_id": str(line.item_id),
                "ordered_qty": line.ordered_qty,
                "received_qty": line.received_qty,
                "accepted_qty": accepted,
                "rejected_qty": rejected,
                "unit_rate": line.unit_rate,
                "batch_number": line.batch_number,
                "expiry_date": line.expiry_date,
                "qc_notes": line.qc_notes,
            },
        )

    await db.commit()
    return {"id": str(grn_id), "grn_number": grn_row.grn_number}


@router.post("/{grn_id}/accept")
async def accept_grn(
    grn_id: uuid.UUID,
    body: GRNAccept,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    if body.action not in ("accept", "reject"):
        raise HTTPException(400, "action must be accept or reject")

    new_status = "accepted" if body.action == "accept" else "rejected"
    result = await db.execute(
        text("""
            UPDATE grn_headers SET status = :status, updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id AND status = 'draft'
            RETURNING id
        """),
        {"status": new_status, "id": str(grn_id), "org_id": str(current_user.organization_id)},
    )
    if not result.fetchone():
        raise HTTPException(404, "GRN not found or already processed")

    if body.action == "accept":
        lines = await db.execute(
            text("SELECT item_id, accepted_qty, unit_rate FROM grn_lines WHERE grn_id = :grn_id"),
            {"grn_id": str(grn_id)},
        )
        for line in lines.fetchall():
            await db.execute(
                text("""
                    UPDATE inventory_items
                    SET current_stock = current_stock + :qty,
                        valuation_rate = CASE WHEN valuation_rate = 0 THEN :rate
                                              ELSE (valuation_rate + COALESCE(:rate,valuation_rate)) / 2
                                         END,
                        updated_at = NOW()
                    WHERE id = :item_id AND organization_id = :org_id
                """),
                {
                    "qty": line.accepted_qty or 0,
                    "rate": line.unit_rate or 0,
                    "item_id": str(line.item_id),
                    "org_id": str(current_user.organization_id),
                },
            )
            await db.execute(
                text("""
                    INSERT INTO stock_movements
                        (organization_id, item_id, movement_type, quantity, unit_rate,
                         reference_type, reference_id, created_by)
                    VALUES (:org_id, :item_id, 'grn', :qty, :rate, 'grn', :grn_id, :user_id)
                """),
                {
                    "org_id": str(current_user.organization_id),
                    "item_id": str(line.item_id),
                    "qty": line.accepted_qty or 0,
                    "rate": line.unit_rate,
                    "grn_id": str(grn_id),
                    "user_id": str(current_user.id),
                },
            )

    await db.commit()
    return {"ok": True, "status": new_status}


@router.get("")
async def list_grns(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT g.id, g.grn_number, g.supplier_name, g.status,
                   g.purchase_order_ref, g.invoice_number, g.received_at,
                   COUNT(gl.id) AS line_count
            FROM grn_headers g
            LEFT JOIN grn_lines gl ON g.id = gl.grn_id
            WHERE g.organization_id = :org_id
            GROUP BY g.id
            ORDER BY g.received_at DESC
            LIMIT :limit
        """),
        {"org_id": str(current_user.organization_id), "limit": limit},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{grn_id}")
async def get_grn(
    grn_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM grn_headers WHERE id = :id AND organization_id = :org_id"),
        {"id": str(grn_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "GRN not found")

    lines = await db.execute(
        text("""
            SELECT gl.*, ii.item_code, ii.item_name, ii.unit
            FROM grn_lines gl
            JOIN inventory_items ii ON gl.item_id = ii.id
            WHERE gl.grn_id = :grn_id
        """),
        {"grn_id": str(grn_id)},
    )
    return {**dict(row._mapping), "lines": [dict(l._mapping) for l in lines.fetchall()]}
