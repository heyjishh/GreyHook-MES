"""Customer sales orders — full order-to-dispatch lifecycle.

Covers: order creation → production link → dispatch challan → delivery.
Native equivalent of Fleetbase Storefront order management (B2B variant).
"""
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
from app.services.llm_caller import ask_llm

router = APIRouter(prefix="/sales-orders", tags=["sales-orders"])


class SOLine(BaseModel):
    item_id: uuid.UUID
    quantity: float
    unit_rate: Optional[float] = None
    delivery_date: Optional[date] = None


class SalesOrderCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    po_number: Optional[str] = None
    delivery_date: Optional[date] = None
    priority: str = "normal"
    notes: Optional[str] = None
    lines: list[SOLine]


class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_sales_order(
    body: SalesOrderCreate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    if not body.lines:
        raise HTTPException(400, "At least one line item required")
    if body.priority not in ("low", "normal", "high", "urgent"):
        raise HTTPException(400, "Invalid priority")

    so_no = f"SO-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    total_value = sum(
        (l.quantity * (l.unit_rate or 0)) for l in body.lines
    )

    result = await db.execute(
        text("""
            INSERT INTO sales_orders
                (organization_id, factory_id, so_number, customer_name, customer_phone,
                 customer_email, customer_address, po_number, delivery_date,
                 priority, total_value, notes, created_by)
            VALUES
                (:org_id, :factory_id, :so_no, :cust_name, :cust_phone,
                 :cust_email, :cust_addr, :po_no, :delivery_date,
                 :priority, :total_value, :notes, :user_id)
            RETURNING id, so_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "so_no": so_no,
            "cust_name": body.customer_name, "cust_phone": body.customer_phone,
            "cust_email": body.customer_email, "cust_addr": body.customer_address,
            "po_no": body.po_number, "delivery_date": body.delivery_date,
            "priority": body.priority, "total_value": total_value,
            "notes": body.notes, "user_id": str(current_user.id),
        },
    )
    so = result.fetchone()
    so_id = so.id

    for line in body.lines:
        await db.execute(
            text("""
                INSERT INTO sales_order_lines
                    (so_id, item_id, quantity, unit_rate, delivery_date)
                VALUES (:so_id, :item_id, :qty, :rate, :ddate)
            """),
            {
                "so_id": str(so_id), "item_id": str(line.item_id),
                "qty": line.quantity, "rate": line.unit_rate,
                "ddate": line.delivery_date or body.delivery_date,
            },
        )

    await db.commit()
    return {"id": str(so_id), "so_number": so.so_number, "total_value": total_value}


@router.get("")
async def list_sales_orders(
    status: Optional[str] = None,
    customer: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if status:
        filters.append("status = :status"); params["status"] = status
    if customer:
        filters.append("customer_name ILIKE :cust"); params["cust"] = f"%{customer}%"

    rows = await db.execute(
        text(f"""
            SELECT id, so_number, customer_name, delivery_date, status,
                   priority, total_value, po_number, created_at
            FROM sales_orders
            WHERE {' AND '.join(filters)}
            ORDER BY
                CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2
                              WHEN 'normal' THEN 3 ELSE 4 END,
                delivery_date ASC NULLS LAST
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{so_id}")
async def get_sales_order(
    so_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM sales_orders WHERE id = :id AND organization_id = :org_id"),
        {"id": str(so_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Sales order not found")

    lines = await db.execute(
        text("""
            SELECT sol.*, ii.item_code, ii.item_name, ii.unit
            FROM sales_order_lines sol
            JOIN inventory_items ii ON sol.item_id = ii.id
            WHERE sol.so_id = :so_id
        """),
        {"so_id": str(so_id)},
    )
    return {**dict(row._mapping), "lines": [dict(l._mapping) for l in lines.fetchall()]}


@router.patch("/{so_id}/status")
async def update_so_status(
    so_id: uuid.UUID,
    body: StatusUpdate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    valid = ("draft", "confirmed", "in_production", "ready", "dispatched", "delivered", "cancelled")
    if body.status not in valid:
        raise HTTPException(400, f"status must be one of {valid}")

    result = await db.execute(
        text("""
            UPDATE sales_orders
            SET status = :status, notes = COALESCE(:notes, notes), updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id
            RETURNING id
        """),
        {"status": body.status, "notes": body.notes,
         "id": str(so_id), "org_id": str(current_user.organization_id)},
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Sales order not found")
    return {"ok": True}


@router.get("/{so_id}/ai-summary")
async def so_ai_summary(
    so_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("""
            SELECT so.*, COUNT(sol.id) AS line_count,
                   SUM(sol.quantity) AS total_qty
            FROM sales_orders so
            LEFT JOIN sales_order_lines sol ON so.id = sol.so_id
            WHERE so.id = :id AND so.organization_id = :org_id
            GROUP BY so.id
        """),
        {"id": str(so_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Sales order not found")

    prompt = (
        f"Summarize this customer sales order for a factory manager in 2-3 sentences. "
        f"Customer: {row.customer_name}. SO: {row.so_number}. "
        f"Status: {row.status}. Priority: {row.priority}. "
        f"Value: ₹{row.total_value:,.2f}. Items: {row.line_count}. "
        f"Delivery due: {row.delivery_date}. "
        f"Highlight any risk (overdue, urgent, high value)."
    )
    commentary = await ask_llm(prompt, db, current_user.organization_id, max_tokens=200)
    return {"so_number": row.so_number, "ai_summary": commentary}
