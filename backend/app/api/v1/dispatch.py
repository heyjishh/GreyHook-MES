import uuid
from datetime import date, datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


class DispatchLine(BaseModel):
    item_id: uuid.UUID
    quantity: float
    unit: Optional[str] = None
    unit_rate: Optional[float] = None
    batch_number: Optional[str] = None


class ChallanCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    gate_pass_id: Optional[uuid.UUID] = None
    customer_name: str
    customer_address: Optional[str] = None
    sales_order_ref: Optional[str] = None
    vehicle_number: Optional[str] = None
    transporter: Optional[str] = None
    lr_number: Optional[str] = None
    eway_bill_number: Optional[str] = None
    dispatch_date: Optional[date] = None
    total_weight_kg: Optional[float] = None
    notes: Optional[str] = None
    lines: list[DispatchLine]


class DeliveryUpdate(BaseModel):
    delivered_at: Optional[datetime] = None
    pod_url: Optional[str] = None


def _next_challan_number() -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"DC-{ts}"


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_challan(
    body: ChallanCreate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    if not body.lines:
        raise HTTPException(400, "At least one line item required")

    for line in body.lines:
        stock = await db.execute(
            text("SELECT current_stock FROM inventory_items WHERE id = :id AND organization_id = :org_id"),
            {"id": str(line.item_id), "org_id": str(current_user.organization_id)},
        )
        item = stock.fetchone()
        if not item:
            raise HTTPException(404, f"Item {line.item_id} not found")
        if item.current_stock < line.quantity:
            raise HTTPException(409, f"Insufficient stock for item {line.item_id}: have {item.current_stock}, need {line.quantity}")

    challan_number = _next_challan_number()
    result = await db.execute(
        text("""
            INSERT INTO dispatch_challans
                (organization_id, factory_id, challan_number, gate_pass_id, customer_name,
                 customer_address, sales_order_ref, vehicle_number, transporter,
                 lr_number, eway_bill_number, dispatch_date, total_weight_kg, notes, status)
            VALUES
                (:org_id, :factory_id, :challan_number, :gate_pass_id, :customer_name,
                 :customer_address, :so_ref, :vehicle_number, :transporter,
                 :lr_number, :eway_bill, :dispatch_date, :weight, :notes, 'dispatched')
            RETURNING id, challan_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "challan_number": challan_number,
            "gate_pass_id": str(body.gate_pass_id) if body.gate_pass_id else None,
            "customer_name": body.customer_name,
            "customer_address": body.customer_address,
            "so_ref": body.sales_order_ref,
            "vehicle_number": body.vehicle_number,
            "transporter": body.transporter,
            "lr_number": body.lr_number,
            "eway_bill": body.eway_bill_number,
            "dispatch_date": body.dispatch_date or date.today(),
            "weight": body.total_weight_kg,
            "notes": body.notes,
        },
    )
    challan = result.fetchone()
    challan_id = challan.id

    for line in body.lines:
        await db.execute(
            text("""
                INSERT INTO dispatch_challan_lines
                    (challan_id, item_id, quantity, unit, unit_rate, batch_number)
                VALUES (:challan_id, :item_id, :qty, :unit, :rate, :batch)
            """),
            {
                "challan_id": str(challan_id),
                "item_id": str(line.item_id),
                "qty": line.quantity,
                "unit": line.unit,
                "rate": line.unit_rate,
                "batch": line.batch_number,
            },
        )
        await db.execute(
            text("""
                UPDATE inventory_items
                SET current_stock = current_stock - :qty, updated_at = NOW()
                WHERE id = :item_id AND organization_id = :org_id
            """),
            {"qty": line.quantity, "item_id": str(line.item_id), "org_id": str(current_user.organization_id)},
        )
        await db.execute(
            text("""
                INSERT INTO stock_movements
                    (organization_id, item_id, movement_type, quantity, unit_rate,
                     reference_type, reference_id, created_by)
                VALUES (:org_id, :item_id, 'dispatch', :qty, :rate, 'dispatch_challan', :challan_id, :user_id)
            """),
            {
                "org_id": str(current_user.organization_id),
                "item_id": str(line.item_id),
                "qty": line.quantity,
                "rate": line.unit_rate,
                "challan_id": str(challan_id),
                "user_id": str(current_user.id),
            },
        )

    await db.commit()

    await _push_to_fleetbase(db, current_user.organization_id, challan_id, body)

    return {"id": str(challan_id), "challan_number": challan.challan_number}


@router.get("")
async def list_challans(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if status:
        filters.append("status = :status"); params["status"] = status

    where = " AND ".join(filters)
    rows = await db.execute(
        text(f"""
            SELECT id, challan_number, customer_name, vehicle_number, dispatch_date,
                   status, fleetbase_order_id, delivered_at, total_weight_kg
            FROM dispatch_challans
            WHERE {where}
            ORDER BY dispatch_date DESC, created_at DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{challan_id}")
async def get_challan(
    challan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM dispatch_challans WHERE id = :id AND organization_id = :org_id"),
        {"id": str(challan_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Challan not found")

    lines = await db.execute(
        text("""
            SELECT dcl.*, ii.item_code, ii.item_name
            FROM dispatch_challan_lines dcl
            JOIN inventory_items ii ON dcl.item_id = ii.id
            WHERE dcl.challan_id = :id
        """),
        {"id": str(challan_id)},
    )
    return {**dict(row._mapping), "lines": [dict(l._mapping) for l in lines.fetchall()]}


@router.post("/{challan_id}/delivered")
async def mark_delivered(
    challan_id: uuid.UUID,
    body: DeliveryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            UPDATE dispatch_challans
            SET status = 'delivered',
                delivered_at = :delivered_at,
                pod_url = :pod_url,
                updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id
            RETURNING id
        """),
        {
            "delivered_at": body.delivered_at or datetime.utcnow(),
            "pod_url": body.pod_url,
            "id": str(challan_id),
            "org_id": str(current_user.organization_id),
        },
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Challan not found")
    return {"ok": True}


async def _push_to_fleetbase(
    db: AsyncSession, org_id: uuid.UUID, challan_id: uuid.UUID, body: ChallanCreate
) -> None:
    cfg = await db.execute(
        text("""
            SELECT api_base_url, api_key_encrypted, is_enabled, sync_dispatches
            FROM fleetbase_configs
            WHERE organization_id = :org_id AND is_enabled = TRUE AND sync_dispatches = TRUE
        """),
        {"org_id": str(org_id)},
    )
    row = cfg.fetchone()
    if not row:
        return

    from app.api.v1.llm_configs import _decrypt
    api_key = _decrypt(row.api_key_encrypted) if row.api_key_encrypted else None
    if not api_key:
        return

    payload = {
        "customer": {"name": body.customer_name, "phone": None, "address": body.customer_address},
        "payload": {
            "entities": [
                {"name": f"Item {str(l.item_id)[:8]}", "quantity": l.quantity}
                for l in body.lines
            ]
        },
        "meta": {"challan_id": str(challan_id), "source": "greyhook-mes"},
    }
    if body.vehicle_number:
        payload["driver_assigned"] = {"vehicle": body.vehicle_number}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{row.api_base_url.rstrip('/')}/v1/fleet-ops/orders",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code in (200, 201):
                fleet_order_id = resp.json().get("data", {}).get("id")
                if fleet_order_id:
                    await db.execute(
                        text("UPDATE dispatch_challans SET fleetbase_order_id = :fid WHERE id = :id"),
                        {"fid": fleet_order_id, "id": str(challan_id)},
                    )
                    await db.commit()
    except Exception:
        pass
