import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/traceability", tags=["traceability"])


class LotSummary(BaseModel):
    lot_id: str
    production_order_id: uuid.UUID
    product_id: Optional[uuid.UUID]
    product_name: Optional[str]
    machine_name: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    quantity_good: int
    quantity_reject: int
    status: str


class ComponentEntry(BaseModel):
    component_code: str
    component_name: str
    quantity: float
    unit: str
    is_critical: bool


class LotGenealogy(BaseModel):
    lot_id: str
    production_order_id: uuid.UUID
    product_id: Optional[uuid.UUID]
    bom_ref: Optional[str]
    components: list[ComponentEntry]


@router.get("/lots", response_model=list[LotSummary])
async def list_lots(
    factory_id: Optional[uuid.UUID] = Query(None),
    product_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    where = "po.organization_id = :org_id"
    params: dict = {"org_id": org_id}
    if factory_id:
        where += " AND f.id = :factory_id"
        params["factory_id"] = str(factory_id)
    if product_id:
        where += " AND po.product_id = :product_id"
        params["product_id"] = str(product_id)

    rows = await db.execute(
        text(f"""
            SELECT
                po.id AS production_order_id,
                po.order_number AS lot_id,
                po.product_id,
                pd.name AS product_name,
                m.name AS machine_name,
                po.started_at,
                po.completed_at,
                COALESCE(po.actual_good_count, 0) AS quantity_good,
                COALESCE(po.actual_reject_count, 0) AS quantity_reject,
                po.status
            FROM production_orders po
            LEFT JOIN product_definitions pd ON pd.id = po.product_id
            LEFT JOIN machines m ON m.id = po.machine_id
            LEFT JOIN production_lines pl ON pl.id = po.line_id
            LEFT JOIN factories f ON f.id = pl.factory_id
            WHERE {where}
            ORDER BY po.created_at DESC
            LIMIT :lim
        """),
        {**params, "lim": limit},
    )
    result = []
    for r in rows.fetchall():
        m = dict(r._mapping)
        result.append(LotSummary(
            lot_id=m["lot_id"] or str(m["production_order_id"]),
            production_order_id=m["production_order_id"],
            product_id=m["product_id"],
            product_name=m["product_name"],
            machine_name=m["machine_name"],
            started_at=m["started_at"],
            completed_at=m["completed_at"],
            quantity_good=m["quantity_good"],
            quantity_reject=m["quantity_reject"],
            status=m["status"],
        ))
    return result


@router.get("/lots/{lot_id}/genealogy", response_model=LotGenealogy)
async def get_lot_genealogy(
    lot_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    order_row = await db.execute(
        text("""
            SELECT id, product_id, bom_ref
            FROM production_orders
            WHERE (order_number = :lot_id OR id::text = :lot_id)
              AND organization_id = :org_id
            LIMIT 1
        """),
        {"lot_id": lot_id, "org_id": org_id},
    )
    order = order_row.fetchone()
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lot not found")

    order_id = order.id
    product_id = order.product_id
    bom_ref = order.bom_ref

    components: list[ComponentEntry] = []
    if bom_ref:
        comp_rows = await db.execute(
            text("""
                SELECT component_code, component_name, quantity, unit, is_critical
                FROM bom_lines
                WHERE bom_ref = :bom_ref AND organization_id = :org_id
                ORDER BY line_number ASC
            """),
            {"bom_ref": bom_ref, "org_id": org_id},
        )
        for c in comp_rows.fetchall():
            cm = dict(c._mapping)
            components.append(ComponentEntry(
                component_code=cm["component_code"],
                component_name=cm["component_name"],
                quantity=float(cm["quantity"]),
                unit=cm["unit"],
                is_critical=cm["is_critical"],
            ))

    return LotGenealogy(
        lot_id=lot_id,
        production_order_id=order_id,
        product_id=product_id,
        bom_ref=bom_ref,
        components=components,
    )
