"""Supplier management + purchase orders — Fleetbase Pallet Supplier/PurchaseOrder."""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str
    code: Optional[str] = None
    type: str = "vendor"
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    payment_terms_days: int = 30
    credit_limit: Optional[float] = None
    currency: str = "INR"
    place_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class POLine(BaseModel):
    item_id: uuid.UUID
    quantity: float
    unit_rate: float
    tax_rate: float = 0.0
    delivery_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseOrderCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    supplier_id: uuid.UUID
    order_date: Optional[date] = None
    expected_delivery: Optional[date] = None
    currency: str = "INR"
    tax_amount: float = 0.0
    discount_amount: float = 0.0
    notes: Optional[str] = None
    payment_terms_days: int = 30
    lines: list[POLine]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: SupplierCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO suppliers
                (organization_id, place_id, name, code, type, contact_name, email,
                 phone, gstin, pan, payment_terms_days, credit_limit, currency, notes)
            VALUES
                (:org_id, :place_id, :name, :code, :type, :contact_name, :email,
                 :phone, :gstin, :pan, :terms, :credit_limit, :currency, :notes)
            RETURNING id, name, code
        """),
        {
            "org_id": str(current_user.organization_id),
            "place_id": str(body.place_id) if body.place_id else None,
            "name": body.name, "code": body.code, "type": body.type,
            "contact_name": body.contact_name, "email": body.email,
            "phone": body.phone, "gstin": body.gstin, "pan": body.pan,
            "terms": body.payment_terms_days, "credit_limit": body.credit_limit,
            "currency": body.currency, "notes": body.notes,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name, "code": row.code}


@router.get("")
async def list_suppliers(
    q: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["s.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id)}
    if q:
        filters.append("(s.name ILIKE :q OR s.code ILIKE :q OR s.gstin ILIKE :q)")
        params["q"] = f"%{q}%"
    if status:
        filters.append("s.status = :status"); params["status"] = status

    rows = await db.execute(
        text(f"""
            SELECT s.id, s.name, s.code, s.type, s.contact_name, s.email,
                   s.phone, s.gstin, s.payment_terms_days, s.status,
                   p.city AS city, p.province
            FROM suppliers s
            LEFT JOIN places p ON s.place_id = p.id
            WHERE {' AND '.join(filters)}
            ORDER BY s.name
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{supplier_id}")
async def get_supplier(
    supplier_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("""
            SELECT s.*, p.street1, p.city, p.province, p.postal_code, p.country
            FROM suppliers s
            LEFT JOIN places p ON s.place_id = p.id
            WHERE s.id = :id AND s.organization_id = :org_id
        """),
        {"id": str(supplier_id), "org_id": str(current_user.organization_id)},
    )
    s = row.fetchone()
    if not s:
        raise HTTPException(404, "Supplier not found")

    pos = await db.execute(
        text("""
            SELECT po_number, status, order_date, total_value
            FROM purchase_orders
            WHERE supplier_id = :sid AND organization_id = :org_id
            ORDER BY order_date DESC
            LIMIT 10
        """),
        {"sid": str(supplier_id), "org_id": str(current_user.organization_id)},
    )
    return {**dict(s._mapping), "recent_orders": [dict(p._mapping) for p in pos.fetchall()]}


# ─── Purchase Orders ──────────────────────────────────────────────────────────

po_router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])


@po_router.post("", status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    body: PurchaseOrderCreate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    if not body.lines:
        raise HTTPException(400, "At least one line required")

    total = sum(l.quantity * l.unit_rate for l in body.lines)
    po_no = f"PO-{uuid.uuid4().hex[:8].upper()}"

    result = await db.execute(
        text("""
            INSERT INTO purchase_orders
                (organization_id, factory_id, supplier_id, po_number, order_date,
                 expected_delivery, currency, total_value, tax_amount, discount_amount,
                 notes, payment_terms_days, created_by)
            VALUES
                (:org_id, :factory_id, :supplier_id, :po_no, :order_date,
                 :expected, :currency, :total, :tax, :discount,
                 :notes, :terms, :user_id)
            RETURNING id, po_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "supplier_id": str(body.supplier_id),
            "po_no": po_no,
            "order_date": body.order_date or date.today(),
            "expected": body.expected_delivery,
            "currency": body.currency, "total": total,
            "tax": body.tax_amount, "discount": body.discount_amount,
            "notes": body.notes, "terms": body.payment_terms_days,
            "user_id": str(current_user.id),
        },
    )
    po = result.fetchone()
    po_id = po.id

    for line in body.lines:
        await db.execute(
            text("""
                INSERT INTO purchase_order_lines
                    (po_id, item_id, quantity, unit_rate, tax_rate, delivery_date, notes)
                VALUES (:po_id, :item_id, :qty, :rate, :tax_rate, :ddate, :notes)
            """),
            {
                "po_id": str(po_id), "item_id": str(line.item_id),
                "qty": line.quantity, "rate": line.unit_rate,
                "tax_rate": line.tax_rate, "ddate": line.delivery_date,
                "notes": line.notes,
            },
        )

    await db.commit()
    return {"id": str(po_id), "po_number": po.po_number, "total_value": total}


@po_router.get("")
async def list_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["po.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if status:
        filters.append("po.status = :status"); params["status"] = status
    if supplier_id:
        filters.append("po.supplier_id = :supplier_id"); params["supplier_id"] = str(supplier_id)

    rows = await db.execute(
        text(f"""
            SELECT po.id, po.po_number, po.status, po.order_date, po.expected_delivery,
                   po.total_value, po.currency, s.name AS supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE {' AND '.join(filters)}
            ORDER BY po.order_date DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@po_router.get("/{po_id}")
async def get_purchase_order(
    po_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("""
            SELECT po.*, s.name AS supplier_name, s.gstin AS supplier_gstin
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = :id AND po.organization_id = :org_id
        """),
        {"id": str(po_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Purchase order not found")

    lines = await db.execute(
        text("""
            SELECT pol.*, ii.item_code, ii.item_name, ii.unit
            FROM purchase_order_lines pol
            JOIN inventory_items ii ON pol.item_id = ii.id
            WHERE pol.po_id = :po_id
        """),
        {"po_id": str(po_id)},
    )
    return {**dict(row._mapping), "lines": [dict(l._mapping) for l in lines.fetchall()]}


@po_router.post("/{po_id}/approve")
async def approve_purchase_order(
    po_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            UPDATE purchase_orders
            SET status = 'sent', approved_by = :user_id, approved_at = NOW(), updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id AND status = 'draft'
            RETURNING id
        """),
        {"user_id": str(current_user.id), "id": str(po_id),
         "org_id": str(current_user.organization_id)},
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "PO not found or not in draft status")
    return {"ok": True, "status": "sent"}
