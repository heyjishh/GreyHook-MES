import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/gate-pass", tags=["gate-pass"])


class GatePassCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    pass_type: str
    vehicle_number: str
    vehicle_type: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    party_name: str
    party_type: str
    material_desc: Optional[str] = None
    gross_weight_kg: Optional[float] = None
    tare_weight_kg: Optional[float] = None
    purpose: Optional[str] = None
    security_note: Optional[str] = None
    in_time: Optional[datetime] = None


class GatePassApprove(BaseModel):
    action: str
    security_note: Optional[str] = None


class GatePassClose(BaseModel):
    out_time: Optional[datetime] = None
    tare_weight_kg: Optional[float] = None
    gross_weight_kg: Optional[float] = None


def _next_pass_number(org_id: uuid.UUID, pass_type: str) -> str:
    prefix = "GP-IN" if pass_type == "inbound" else "GP-OUT"
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{ts}"


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_gate_pass(
    body: GatePassCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.pass_type not in ("inbound", "outbound"):
        raise HTTPException(400, "pass_type must be inbound or outbound")
    if body.party_type not in ("supplier", "customer", "transporter", "other"):
        raise HTTPException(400, "Invalid party_type")

    pass_number = _next_pass_number(current_user.organization_id, body.pass_type)
    row = await db.execute(
        text("""
            INSERT INTO gate_passes
                (organization_id, factory_id, pass_number, pass_type, vehicle_number,
                 vehicle_type, driver_name, driver_phone, party_name, party_type,
                 material_desc, gross_weight_kg, tare_weight_kg, purpose, security_note,
                 in_time, created_by)
            VALUES
                (:org_id, :factory_id, :pass_number, :pass_type, :vehicle_number,
                 :vehicle_type, :driver_name, :driver_phone, :party_name, :party_type,
                 :material_desc, :gross_weight_kg, :tare_weight_kg, :purpose, :security_note,
                 :in_time, :created_by)
            RETURNING id, pass_number, status
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "pass_number": pass_number,
            "pass_type": body.pass_type,
            "vehicle_number": body.vehicle_number.upper().strip(),
            "vehicle_type": body.vehicle_type,
            "driver_name": body.driver_name,
            "driver_phone": body.driver_phone,
            "party_name": body.party_name,
            "party_type": body.party_type,
            "material_desc": body.material_desc,
            "gross_weight_kg": body.gross_weight_kg,
            "tare_weight_kg": body.tare_weight_kg,
            "purpose": body.purpose,
            "security_note": body.security_note,
            "in_time": body.in_time or datetime.utcnow(),
            "created_by": str(current_user.id),
        },
    )
    await db.commit()
    created = row.fetchone()
    return {"id": str(created.id), "pass_number": created.pass_number, "status": created.status}


@router.get("")
async def list_gate_passes(
    factory_id: Optional[uuid.UUID] = None,
    pass_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if factory_id:
        filters.append("factory_id = :factory_id")
        params["factory_id"] = str(factory_id)
    if pass_type:
        filters.append("pass_type = :pass_type")
        params["pass_type"] = pass_type
    if status:
        filters.append("gp.status = :status")
        params["status"] = status

    where = " AND ".join(filters)
    rows = await db.execute(
        text(f"""
            SELECT id, pass_number, pass_type, status, vehicle_number, driver_name,
                   party_name, party_type, material_desc, gross_weight_kg, tare_weight_kg,
                   net_weight_kg, in_time, out_time, purpose, fleetbase_order_id
            FROM gate_passes gp
            WHERE {where}
            ORDER BY in_time DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{pass_id}")
async def get_gate_pass(
    pass_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("""
            SELECT * FROM gate_passes
            WHERE id = :id AND organization_id = :org_id
        """),
        {"id": str(pass_id), "org_id": str(current_user.organization_id)},
    )
    gp = row.fetchone()
    if not gp:
        raise HTTPException(404, "Gate pass not found")
    return dict(gp._mapping)


@router.post("/{pass_id}/approve")
async def approve_gate_pass(
    pass_id: uuid.UUID,
    body: GatePassApprove,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    if body.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be approve or reject")
    new_status = "approved" if body.action == "approve" else "rejected"
    result = await db.execute(
        text("""
            UPDATE gate_passes
            SET status = :status,
                approved_by = :approver,
                security_note = COALESCE(:note, security_note),
                updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id
            RETURNING id, status
        """),
        {
            "status": new_status,
            "approver": str(current_user.id),
            "note": body.security_note,
            "id": str(pass_id),
            "org_id": str(current_user.organization_id),
        },
    )
    await db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Gate pass not found")
    return {"id": str(row.id), "status": row.status}


@router.post("/{pass_id}/close")
async def close_gate_pass(
    pass_id: uuid.UUID,
    body: GatePassClose,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = ["status = 'closed'", "out_time = :out_time", "updated_at = NOW()"]
    params: dict = {
        "out_time": body.out_time or datetime.utcnow(),
        "id": str(pass_id),
        "org_id": str(current_user.organization_id),
    }
    if body.tare_weight_kg is not None:
        updates.append("tare_weight_kg = :tare")
        params["tare"] = body.tare_weight_kg
    if body.gross_weight_kg is not None:
        updates.append("gross_weight_kg = :gross")
        params["gross"] = body.gross_weight_kg

    result = await db.execute(
        text(f"""
            UPDATE gate_passes
            SET {', '.join(updates)}
            WHERE id = :id AND organization_id = :org_id
            RETURNING id, status, net_weight_kg
        """),
        params,
    )
    await db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Gate pass not found")
    return {"id": str(row.id), "status": row.status, "net_weight_kg": row.net_weight_kg}
