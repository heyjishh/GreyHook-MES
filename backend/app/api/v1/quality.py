import uuid
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/quality", tags=["quality"])


class InspectionCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    machine_id: Optional[uuid.UUID] = None
    inspection_type: str = "visual"
    sample_size: Optional[int] = None
    notes: Optional[str] = None


class InspectionUpdate(BaseModel):
    status: Optional[str] = None
    result: Optional[str] = None
    defect_count: Optional[int] = None
    notes: Optional[str] = None


class InspectionSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    factory_id: Optional[uuid.UUID]
    machine_id: Optional[uuid.UUID]
    inspection_type: str
    status: str
    result: Optional[str]
    defect_count: int
    sample_size: Optional[int]
    inspector_id: Optional[uuid.UUID]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("/inspections", response_model=list[InspectionSchema])
async def list_inspections(
    factory_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    where = "WHERE organization_id = :org_id"
    params: dict = {"org_id": org_id}
    if factory_id:
        where += " AND factory_id = :factory_id"
        params["factory_id"] = str(factory_id)
    if status_filter:
        where += " AND status = :status"
        params["status"] = status_filter
    rows = await db.execute(
        text(f"SELECT * FROM quality_inspections {where} ORDER BY created_at DESC LIMIT :lim"),
        {**params, "lim": limit},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.post("/inspections", response_model=InspectionSchema, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    body: InspectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    new_id = str(uuid.uuid4())
    now = datetime.now(UTC)
    await db.execute(
        text("""
            INSERT INTO quality_inspections
              (id, organization_id, factory_id, machine_id, inspection_type, status,
               defect_count, sample_size, inspector_id, notes, created_at, updated_at)
            VALUES
              (:id, :org_id, :factory_id, :machine_id, :inspection_type, 'pending',
               0, :sample_size, :inspector_id, :notes, :now, :now)
        """),
        {
            "id": new_id, "org_id": org_id,
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "machine_id": str(body.machine_id) if body.machine_id else None,
            "inspection_type": body.inspection_type,
            "sample_size": body.sample_size,
            "inspector_id": str(current_user.id),
            "notes": body.notes,
            "now": now,
        },
    )
    await db.commit()
    row = await db.execute(text("SELECT * FROM quality_inspections WHERE id = :id"), {"id": new_id})
    return dict(row.fetchone()._mapping)


@router.patch("/inspections/{inspection_id}", response_model=InspectionSchema)
async def update_inspection(
    inspection_id: uuid.UUID,
    body: InspectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    check = await db.execute(
        text("SELECT id FROM quality_inspections WHERE id = :id AND organization_id = :org_id"),
        {"id": str(inspection_id), "org_id": org_id},
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Inspection not found")

    updates: list[str] = ["updated_at = :now"]
    params: dict = {"id": str(inspection_id), "org_id": org_id, "now": datetime.now(UTC)}
    if body.status is not None:
        updates.append("status = :status"); params["status"] = body.status
    if body.result is not None:
        updates.append("result = :result"); params["result"] = body.result
    if body.defect_count is not None:
        updates.append("defect_count = :defect_count"); params["defect_count"] = body.defect_count
    if body.notes is not None:
        updates.append("notes = :notes"); params["notes"] = body.notes

    await db.execute(
        text(f"UPDATE quality_inspections SET {', '.join(updates)} WHERE id = :id AND organization_id = :org_id"),
        params,
    )
    await db.commit()
    row = await db.execute(text("SELECT * FROM quality_inspections WHERE id = :id"), {"id": str(inspection_id)})
    return dict(row.fetchone()._mapping)
