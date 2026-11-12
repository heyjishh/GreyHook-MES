"""Fleet groups (named collections of drivers + vehicles) — Fleetbase Fleet model."""
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

router = APIRouter(prefix="/fleet-groups", tags=["fleet-groups"])


class FleetCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    task: Optional[str] = None
    parent_fleet_id: Optional[uuid.UUID] = None


class MemberAssign(BaseModel):
    driver_ids: list[uuid.UUID] = []
    vehicle_ids: list[uuid.UUID] = []


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_fleet(
    body: FleetCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO fleets (organization_id, parent_fleet_id, name, color, task)
            VALUES (:org_id, :parent_id, :name, :color, :task)
            RETURNING id, name
        """),
        {
            "org_id": str(current_user.organization_id),
            "parent_id": str(body.parent_fleet_id) if body.parent_fleet_id else None,
            "name": body.name, "color": body.color, "task": body.task,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name}


@router.get("")
async def list_fleets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT f.id, f.name, f.color, f.task, f.status,
                   COUNT(DISTINCT fda.driver_id) AS driver_count,
                   COUNT(DISTINCT fva.vehicle_id) AS vehicle_count
            FROM fleets f
            LEFT JOIN fleet_driver_assignments fda ON fda.fleet_id = f.id
            LEFT JOIN fleet_vehicle_assignments fva ON fva.fleet_id = f.id
            WHERE f.organization_id = :org_id
            GROUP BY f.id
            ORDER BY f.name
        """),
        {"org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{fleet_id}")
async def get_fleet(
    fleet_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hdr = await db.execute(
        text("SELECT * FROM fleets WHERE id = :id AND organization_id = :org_id"),
        {"id": str(fleet_id), "org_id": str(current_user.organization_id)},
    )
    row = hdr.fetchone()
    if not row:
        raise HTTPException(404, "Fleet not found")

    drivers = await db.execute(
        text("""
            SELECT d.id, d.name, d.phone, d.status, d.online
            FROM fleet_driver_assignments fda
            JOIN fleet_drivers d ON fda.driver_id = d.id
            WHERE fda.fleet_id = :id
        """),
        {"id": str(fleet_id)},
    )
    vehicles = await db.execute(
        text("""
            SELECT v.id, v.registration_number, v.vehicle_type, v.status, v.online
            FROM fleet_vehicle_assignments fva
            JOIN fleet_vehicles v ON fva.vehicle_id = v.id
            WHERE fva.fleet_id = :id
        """),
        {"id": str(fleet_id)},
    )
    return {
        **dict(row._mapping),
        "drivers": [dict(d._mapping) for d in drivers.fetchall()],
        "vehicles": [dict(v._mapping) for v in vehicles.fetchall()],
    }


@router.post("/{fleet_id}/assign")
async def assign_members(
    fleet_id: uuid.UUID,
    body: MemberAssign,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    check = await db.execute(
        text("SELECT id FROM fleets WHERE id = :id AND organization_id = :org_id"),
        {"id": str(fleet_id), "org_id": str(current_user.organization_id)},
    )
    if not check.fetchone():
        raise HTTPException(404, "Fleet not found")

    for driver_id in body.driver_ids:
        await db.execute(
            text("INSERT INTO fleet_driver_assignments (fleet_id, driver_id) VALUES (:fid, :did) ON CONFLICT DO NOTHING"),
            {"fid": str(fleet_id), "did": str(driver_id)},
        )
    for vehicle_id in body.vehicle_ids:
        await db.execute(
            text("INSERT INTO fleet_vehicle_assignments (fleet_id, vehicle_id) VALUES (:fid, :vid) ON CONFLICT DO NOTHING"),
            {"fid": str(fleet_id), "vid": str(vehicle_id)},
        )

    await db.commit()
    return {"ok": True}


@router.delete("/{fleet_id}/assign")
async def remove_members(
    fleet_id: uuid.UUID,
    body: MemberAssign,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    for driver_id in body.driver_ids:
        await db.execute(
            text("DELETE FROM fleet_driver_assignments WHERE fleet_id = :fid AND driver_id = :did"),
            {"fid": str(fleet_id), "did": str(driver_id)},
        )
    for vehicle_id in body.vehicle_ids:
        await db.execute(
            text("DELETE FROM fleet_vehicle_assignments WHERE fleet_id = :fid AND vehicle_id = :vid"),
            {"fid": str(fleet_id), "vid": str(vehicle_id)},
        )
    await db.commit()
    return {"ok": True}
