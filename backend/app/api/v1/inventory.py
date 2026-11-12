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

router = APIRouter(prefix="/inventory", tags=["inventory"])


class ItemCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    item_code: str
    item_name: str
    item_type: str = "raw_material"
    unit: str = "pcs"
    reorder_level: float = 0
    reorder_qty: float = 0
    valuation_rate: float = 0


class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[float] = None
    reorder_qty: Optional[float] = None
    valuation_rate: Optional[float] = None


class AdjustStock(BaseModel):
    quantity: float
    notes: Optional[str] = None


@router.get("/items")
async def list_items(
    item_type: Optional[str] = None,
    low_stock: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id)}
    if item_type:
        filters.append("item_type = :item_type")
        params["item_type"] = item_type
    if low_stock:
        filters.append("current_stock <= reorder_level")

    where = " AND ".join(filters)
    rows = await db.execute(
        text(f"""
            SELECT id, item_code, item_name, item_type, unit,
                   current_stock, reorder_level, reorder_qty, valuation_rate,
                   (current_stock * valuation_rate) AS stock_value,
                   (current_stock <= reorder_level) AS is_low_stock
            FROM inventory_items
            WHERE {where}
            ORDER BY item_type, item_name
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def create_item(
    body: ItemCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    valid_types = ("raw_material", "wip", "finished_good", "consumable", "spare_part")
    if body.item_type not in valid_types:
        raise HTTPException(400, f"item_type must be one of {valid_types}")

    result = await db.execute(
        text("""
            INSERT INTO inventory_items
                (organization_id, factory_id, item_code, item_name, item_type,
                 unit, reorder_level, reorder_qty, valuation_rate)
            VALUES
                (:org_id, :factory_id, :code, :name, :item_type,
                 :unit, :reorder_level, :reorder_qty, :valuation_rate)
            RETURNING id, item_code, item_name
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "code": body.item_code.strip().upper(),
            "name": body.item_name,
            "item_type": body.item_type,
            "unit": body.unit,
            "reorder_level": body.reorder_level,
            "reorder_qty": body.reorder_qty,
            "valuation_rate": body.valuation_rate,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "item_code": row.item_code, "item_name": row.item_name}


@router.patch("/items/{item_id}")
async def update_item(
    item_id: uuid.UUID,
    body: ItemUpdate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    updates = []
    params: dict = {"id": str(item_id), "org_id": str(current_user.organization_id)}
    if body.item_name is not None:
        updates.append("item_name = :name"); params["name"] = body.item_name
    if body.unit is not None:
        updates.append("unit = :unit"); params["unit"] = body.unit
    if body.reorder_level is not None:
        updates.append("reorder_level = :rl"); params["rl"] = body.reorder_level
    if body.reorder_qty is not None:
        updates.append("reorder_qty = :rq"); params["rq"] = body.reorder_qty
    if body.valuation_rate is not None:
        updates.append("valuation_rate = :vr"); params["vr"] = body.valuation_rate
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates.append("updated_at = NOW()")
    result = await db.execute(
        text(f"UPDATE inventory_items SET {', '.join(updates)} WHERE id = :id AND organization_id = :org_id RETURNING id"),
        params,
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Item not found")
    return {"ok": True}


@router.post("/items/{item_id}/adjust")
async def adjust_stock(
    item_id: uuid.UUID,
    body: AdjustStock,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    check = await db.execute(
        text("SELECT id FROM inventory_items WHERE id = :id AND organization_id = :org_id"),
        {"id": str(item_id), "org_id": str(current_user.organization_id)},
    )
    if not check.fetchone():
        raise HTTPException(404, "Item not found")

    await db.execute(
        text("""
            UPDATE inventory_items
            SET current_stock = current_stock + :qty, updated_at = NOW()
            WHERE id = :id
        """),
        {"qty": body.quantity, "id": str(item_id)},
    )
    await db.execute(
        text("""
            INSERT INTO stock_movements
                (organization_id, item_id, movement_type, quantity, notes, created_by)
            VALUES (:org_id, :item_id, 'adjustment', :qty, :notes, :user_id)
        """),
        {
            "org_id": str(current_user.organization_id),
            "item_id": str(item_id),
            "qty": body.quantity,
            "notes": body.notes,
            "user_id": str(current_user.id),
        },
    )
    await db.commit()
    return {"ok": True}


@router.get("/items/{item_id}/movements")
async def stock_movements(
    item_id: uuid.UUID,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT sm.id, sm.movement_type, sm.quantity, sm.unit_rate,
                   sm.reference_type, sm.reference_id, sm.notes, sm.moved_at,
                   u.name AS created_by_name
            FROM stock_movements sm
            LEFT JOIN users u ON sm.created_by = u.id
            WHERE sm.item_id = :item_id AND sm.organization_id = :org_id
            ORDER BY sm.moved_at DESC
            LIMIT :limit
        """),
        {"item_id": str(item_id), "org_id": str(current_user.organization_id), "limit": limit},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/summary")
async def stock_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT
                item_type,
                COUNT(*) AS item_count,
                SUM(current_stock * valuation_rate) AS total_value,
                SUM(CASE WHEN current_stock <= reorder_level THEN 1 ELSE 0 END) AS low_stock_count
            FROM inventory_items
            WHERE organization_id = :org_id
            GROUP BY item_type
            ORDER BY item_type
        """),
        {"org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]
