"""Warehouse operations: pick lists, put-away, cycle counts.

Native equivalent of Fleetbase Pallet module.
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/warehouse", tags=["warehouse"])


class PickListCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    reference_type: str = "production_order"
    reference_id: Optional[uuid.UUID] = None
    dispatch_challan_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    lines: list[dict]


class CycleCountCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    item_ids: Optional[list[uuid.UUID]] = None
    notes: Optional[str] = None


class CountResult(BaseModel):
    item_id: uuid.UUID
    counted_qty: float
    notes: Optional[str] = None


@router.post("/pick-lists", status_code=status.HTTP_201_CREATED)
async def create_pick_list(
    body: PickListCreate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    pl_no = f"PL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    result = await db.execute(
        text("""
            INSERT INTO warehouse_pick_lists
                (organization_id, factory_id, pick_list_number, reference_type,
                 reference_id, dispatch_challan_id, notes, created_by)
            VALUES
                (:org_id, :factory_id, :pl_no, :ref_type,
                 :ref_id, :challan_id, :notes, :user_id)
            RETURNING id, pick_list_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "pl_no": pl_no,
            "ref_type": body.reference_type,
            "ref_id": str(body.reference_id) if body.reference_id else None,
            "challan_id": str(body.dispatch_challan_id) if body.dispatch_challan_id else None,
            "notes": body.notes,
            "user_id": str(current_user.id),
        },
    )
    pl = result.fetchone()
    pl_id = pl.id

    for line in body.lines:
        item_id = line.get("item_id")
        qty = line.get("quantity", 0)
        location = line.get("bin_location")
        if not item_id or qty <= 0:
            continue
        await db.execute(
            text("""
                INSERT INTO warehouse_pick_list_lines
                    (pick_list_id, item_id, required_qty, bin_location)
                VALUES (:pl_id, :item_id, :qty, :location)
            """),
            {"pl_id": str(pl_id), "item_id": str(item_id), "qty": qty, "location": location},
        )

    await db.commit()
    return {"id": str(pl_id), "pick_list_number": pl.pick_list_number}


@router.get("/pick-lists")
async def list_pick_lists(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["pl.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if status:
        filters.append("pl.status = :status"); params["status"] = status

    rows = await db.execute(
        text(f"""
            SELECT pl.id, pl.pick_list_number, pl.status, pl.reference_type,
                   pl.created_at, pl.completed_at,
                   COUNT(pll.id) AS total_lines,
                   SUM(CASE WHEN pll.picked_qty >= pll.required_qty THEN 1 ELSE 0 END) AS completed_lines
            FROM warehouse_pick_lists pl
            LEFT JOIN warehouse_pick_list_lines pll ON pll.pick_list_id = pl.id
            WHERE {' AND '.join(filters)}
            GROUP BY pl.id
            ORDER BY pl.created_at DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/pick-lists/{pl_id}")
async def get_pick_list(
    pl_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM warehouse_pick_lists WHERE id = :id AND organization_id = :org_id"),
        {"id": str(pl_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Pick list not found")

    lines = await db.execute(
        text("""
            SELECT pll.id, pll.required_qty, pll.picked_qty, pll.bin_location,
                   ii.item_code, ii.item_name, ii.unit, ii.current_stock
            FROM warehouse_pick_list_lines pll
            JOIN inventory_items ii ON pll.item_id = ii.id
            WHERE pll.pick_list_id = :pl_id
        """),
        {"pl_id": str(pl_id)},
    )
    return {**dict(row._mapping), "lines": [dict(l._mapping) for l in lines.fetchall()]}


@router.post("/pick-lists/{pl_id}/lines/{line_id}/pick")
async def record_pick(
    pl_id: uuid.UUID,
    line_id: uuid.UUID,
    picked_qty: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            UPDATE warehouse_pick_list_lines
            SET picked_qty = :qty, picked_at = NOW(), picked_by = :user_id
            WHERE id = :line_id AND pick_list_id = :pl_id
            RETURNING pick_list_id, item_id, required_qty
        """),
        {"qty": picked_qty, "user_id": str(current_user.id),
         "line_id": str(line_id), "pl_id": str(pl_id)},
    )
    line = result.fetchone()
    if not line:
        raise HTTPException(404, "Pick list line not found")

    total_check = await db.execute(
        text("""
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN picked_qty >= required_qty THEN 1 ELSE 0 END) AS done
            FROM warehouse_pick_list_lines
            WHERE pick_list_id = :pl_id
        """),
        {"pl_id": str(pl_id)},
    )
    counts = total_check.fetchone()
    if counts.total == counts.done:
        await db.execute(
            text("""
                UPDATE warehouse_pick_lists
                SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                WHERE id = :id
            """),
            {"id": str(pl_id)},
        )

    await db.commit()
    return {"ok": True, "pick_list_complete": counts.total == counts.done}


@router.post("/cycle-counts", status_code=status.HTTP_201_CREATED)
async def create_cycle_count(
    body: CycleCountCreate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    cc_no = f"CC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    if body.item_ids:
        items_q = await db.execute(
            text("""
                SELECT id, item_code, item_name, current_stock
                FROM inventory_items
                WHERE organization_id = :org_id AND id = ANY(:ids)
            """),
            {"org_id": str(current_user.organization_id),
             "ids": [str(i) for i in body.item_ids]},
        )
    else:
        items_q = await db.execute(
            text("""
                SELECT id, item_code, item_name, current_stock
                FROM inventory_items
                WHERE organization_id = :org_id
            """),
            {"org_id": str(current_user.organization_id)},
        )

    items = items_q.fetchall()
    result = await db.execute(
        text("""
            INSERT INTO warehouse_cycle_counts
                (organization_id, factory_id, count_number, notes, created_by)
            VALUES (:org_id, :factory_id, :cc_no, :notes, :user_id)
            RETURNING id
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "cc_no": cc_no, "notes": body.notes,
            "user_id": str(current_user.id),
        },
    )
    cc_id = result.fetchone().id

    for item in items:
        await db.execute(
            text("""
                INSERT INTO warehouse_cycle_count_lines
                    (cycle_count_id, item_id, system_qty)
                VALUES (:cc_id, :item_id, :sys_qty)
            """),
            {"cc_id": str(cc_id), "item_id": str(item.id), "sys_qty": item.current_stock},
        )

    await db.commit()
    return {"id": str(cc_id), "count_number": cc_no, "item_count": len(items)}


@router.post("/cycle-counts/{cc_id}/submit")
async def submit_cycle_count(
    cc_id: uuid.UUID,
    results: list[CountResult],
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    check = await db.execute(
        text("SELECT id FROM warehouse_cycle_counts WHERE id = :id AND organization_id = :org_id AND status = 'open'"),
        {"id": str(cc_id), "org_id": str(current_user.organization_id)},
    )
    if not check.fetchone():
        raise HTTPException(404, "Cycle count not found or already closed")

    for r in results:
        line = await db.execute(
            text("""
                SELECT id, system_qty FROM warehouse_cycle_count_lines
                WHERE cycle_count_id = :cc_id AND item_id = :item_id
            """),
            {"cc_id": str(cc_id), "item_id": str(r.item_id)},
        )
        line_row = line.fetchone()
        if not line_row:
            continue
        variance = r.counted_qty - (line_row.system_qty or 0)
        await db.execute(
            text("""
                UPDATE warehouse_cycle_count_lines
                SET counted_qty = :counted, variance = :variance, notes = :notes
                WHERE id = :id
            """),
            {"counted": r.counted_qty, "variance": variance, "notes": r.notes, "id": str(line_row.id)},
        )
        await db.execute(
            text("""
                UPDATE inventory_items
                SET current_stock = :counted, updated_at = NOW()
                WHERE id = :item_id AND organization_id = :org_id
            """),
            {"counted": r.counted_qty, "item_id": str(r.item_id), "org_id": str(current_user.organization_id)},
        )
        await db.execute(
            text("""
                INSERT INTO stock_movements
                    (organization_id, item_id, movement_type, quantity, reference_type,
                     reference_id, notes, created_by)
                VALUES (:org_id, :item_id, 'adjustment', :qty, 'cycle_count', :cc_id, :notes, :user_id)
            """),
            {
                "org_id": str(current_user.organization_id),
                "item_id": str(r.item_id), "qty": variance,
                "cc_id": str(cc_id), "notes": r.notes,
                "user_id": str(current_user.id),
            },
        )

    await db.execute(
        text("UPDATE warehouse_cycle_counts SET status = 'closed', closed_at = NOW() WHERE id = :id"),
        {"id": str(cc_id)},
    )
    await db.commit()
    return {"ok": True}
