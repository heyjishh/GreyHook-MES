"""Fleet issues — vehicle/driver defect tracking (Fleetbase Issue model)."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/fleet-issues", tags=["fleet-issues"])


class IssueCreate(BaseModel):
    vehicle_id: Optional[uuid.UUID] = None
    driver_id: Optional[uuid.UUID] = None
    type: str = "mechanical"
    report: str
    priority: str = "medium"
    odometer: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class IssueResolve(BaseModel):
    resolution_notes: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def report_issue(
    body: IssueCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.vehicle_id and not body.driver_id:
        raise HTTPException(400, "Either vehicle_id or driver_id required")

    issue_no = f"ISS-{uuid.uuid4().hex[:8].upper()}"
    result = await db.execute(
        text("""
            INSERT INTO fleet_issues
                (organization_id, vehicle_id, driver_id, reported_by,
                 issue_number, type, report, priority, odometer, lat, lng)
            VALUES (:org_id, :vehicle_id, :driver_id, :reported_by,
                    :issue_no, :type, :report, :priority, :odometer, :lat, :lng)
            RETURNING id, issue_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "vehicle_id": str(body.vehicle_id) if body.vehicle_id else None,
            "driver_id": str(body.driver_id) if body.driver_id else None,
            "reported_by": str(current_user.id),
            "issue_no": issue_no, "type": body.type,
            "report": body.report, "priority": body.priority,
            "odometer": body.odometer, "lat": body.lat, "lng": body.lng,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "issue_number": row.issue_number}


@router.get("")
async def list_issues(
    status: Optional[str] = None,
    vehicle_id: Optional[uuid.UUID] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["i.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if status:
        filters.append("i.status = :status"); params["status"] = status
    if vehicle_id:
        filters.append("i.vehicle_id = :vehicle_id"); params["vehicle_id"] = str(vehicle_id)
    if priority:
        filters.append("i.priority = :priority"); params["priority"] = priority

    rows = await db.execute(
        text(f"""
            SELECT i.id, i.issue_number, i.type, i.priority, i.status,
                   i.report, i.created_at, i.resolved_at,
                   v.registration_number AS vehicle_reg,
                   d.name AS driver_name
            FROM fleet_issues i
            LEFT JOIN fleet_vehicles v ON i.vehicle_id = v.id
            LEFT JOIN fleet_drivers d ON i.driver_id = d.id
            WHERE {' AND '.join(filters)}
            ORDER BY
                CASE i.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                                 WHEN 'medium' THEN 3 ELSE 4 END,
                i.created_at DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.post("/{issue_id}/resolve")
async def resolve_issue(
    issue_id: uuid.UUID,
    body: IssueResolve,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            UPDATE fleet_issues
            SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id AND status != 'resolved'
            RETURNING id
        """),
        {"id": str(issue_id), "org_id": str(current_user.organization_id)},
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Issue not found or already resolved")
    return {"ok": True}


@router.post("/{issue_id}/assign")
async def assign_issue(
    issue_id: uuid.UUID,
    assigned_to: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("""
            UPDATE fleet_issues
            SET assigned_to = :assigned_to, status = 'in_progress', updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id
        """),
        {"assigned_to": str(assigned_to), "id": str(issue_id),
         "org_id": str(current_user.organization_id)},
    )
    await db.commit()
    return {"ok": True}
