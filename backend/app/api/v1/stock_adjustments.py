"""Stock adjustments — manual inventory corrections with approval workflow (Fleetbase Pallet StockAdjustment)."""
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

router = APIRouter(prefix="/stock-adjustments", tags=["stock-adjustments"])


class StockAdjustmentCreate(BaseModel):
    item_id: uuid.UUID
    type: str = "manual"
    reason: str
    quantity: float
    approval_required: bool = False


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    body: StockAdjustmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current = await db.execute(
        text("SELECT quantity FROM inventory_items WHERE id = :id AND organization_id = :org_id"),
        {"id": str(body.item_id), "org_id": str(current_user.organization_id)},
    )
    item = current.fetchone()
    if not item:
        raise HTTPException(404, "Inventory item not found")

    before_qty = float(item.quantity)
    after_qty = before_qty + body.quantity
    adj_status = "pending" if body.approval_required else "approved"

    result = await db.execute(
        text("""
            INSERT INTO stock_adjustments
                (organization_id, item_id, created_by, type, reason,
                 before_quantity, after_quantity, quantity,
                 approval_required, status)
            VALUES (:org_id, :item_id, :user_id, :type, :reason,
                    :before_qty, :after_qty, :qty,
                    :approval_required, :status)
            RETURNING id, status
        """),
        {
            "org_id": str(current_user.organization_id),
            "item_id": str(body.item_id), "user_id": str(current_user.id),
            "type": body.type, "reason": body.reason,
            "before_qty": before_qty, "after_qty": after_qty, "qty": body.quantity,
            "approval_required": body.approval_required, "status": adj_status,
        },
    )
    adj = result.fetchone()

    if adj_status == "approved":
        await db.execute(
            text("""
                UPDATE inventory_items
                SET quantity = :qty, updated_at = NOW()
                WHERE id = :item_id AND organization_id = :org_id
            """),
            {"qty": after_qty, "item_id": str(body.item_id),
             "org_id": str(current_user.organization_id)},
        )
        await db.execute(
            text("""
                INSERT INTO stock_movements
                    (organization_id, item_id, movement_type, quantity,
                     reference_type, reference_id, notes)
                VALUES (:org_id, :item_id, :mvt_type, :qty,
                        'stock_adjustment', :adj_id, :reason)
            """),
            {
                "org_id": str(current_user.organization_id),
                "item_id": str(body.item_id),
                "mvt_type": "adjustment" if body.quantity > 0 else "write_off",
                "qty": abs(body.quantity),
                "adj_id": str(adj.id), "reason": body.reason,
            },
        )

    await db.commit()
    return {"id": str(adj.id), "status": adj.status,
            "before_quantity": before_qty, "after_quantity": after_qty}


@router.get("")
async def list_adjustments(
    item_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["sa.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if item_id:
        filters.append("sa.item_id = :item_id"); params["item_id"] = str(item_id)
    if status:
        filters.append("sa.status = :status"); params["status"] = status

    rows = await db.execute(
        text(f"""
            SELECT sa.id, sa.type, sa.reason, sa.quantity,
                   sa.before_quantity, sa.after_quantity, sa.status,
                   sa.approval_required, sa.created_at,
                   ii.item_code, ii.item_name
            FROM stock_adjustments sa
            JOIN inventory_items ii ON sa.item_id = ii.id
            WHERE {' AND '.join(filters)}
            ORDER BY sa.created_at DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.post("/{adjustment_id}/approve")
async def approve_adjustment(
    adjustment_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    adj_row = await db.execute(
        text("""
            SELECT id, item_id, after_quantity, quantity, reason
            FROM stock_adjustments
            WHERE id = :id AND organization_id = :org_id AND status = 'pending'
        """),
        {"id": str(adjustment_id), "org_id": str(current_user.organization_id)},
    )
    adj = adj_row.fetchone()
    if not adj:
        raise HTTPException(404, "Adjustment not found or not in pending status")

    await db.execute(
        text("""
            UPDATE stock_adjustments
            SET status = 'approved', approved_by = :user_id, approved_at = NOW(), updated_at = NOW()
            WHERE id = :id
        """),
        {"user_id": str(current_user.id), "id": str(adjustment_id)},
    )
    await db.execute(
        text("""
            UPDATE inventory_items SET quantity = :qty, updated_at = NOW()
            WHERE id = :item_id AND organization_id = :org_id
        """),
        {"qty": float(adj.after_quantity), "item_id": str(adj.item_id),
         "org_id": str(current_user.organization_id)},
    )
    await db.execute(
        text("""
            INSERT INTO stock_movements
                (organization_id, item_id, movement_type, quantity, reference_type, reference_id, notes)
            VALUES (:org_id, :item_id, 'adjustment', :qty, 'stock_adjustment', :adj_id, :reason)
        """),
        {
            "org_id": str(current_user.organization_id),
            "item_id": str(adj.item_id), "qty": abs(float(adj.quantity)),
            "adj_id": str(adjustment_id), "reason": adj.reason,
        },
    )
    await db.commit()
    return {"ok": True, "status": "approved"}
