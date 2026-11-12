import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/scheduling", tags=["scheduling"])


class JobSummary(BaseModel):
    id: uuid.UUID
    order_number: str
    product_name: Optional[str]
    machine_name: Optional[str]
    line_name: Optional[str]
    status: str
    priority: int
    planned_start: Optional[datetime]
    planned_end: Optional[datetime]
    actual_start: Optional[datetime]
    target_quantity: int
    actual_good_count: int


class GanttBar(BaseModel):
    job_id: uuid.UUID
    order_number: str
    product_name: Optional[str]
    machine_name: Optional[str]
    start: datetime
    end: datetime
    status: str
    priority: int


class PriorityUpdate(BaseModel):
    priority: int


@router.get("/jobs", response_model=list[JobSummary])
async def list_jobs(
    factory_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    where = "po.organization_id = :org_id"
    params: dict = {"org_id": org_id}
    if factory_id:
        where += " AND pl.factory_id = :factory_id"
        params["factory_id"] = str(factory_id)
    if status:
        where += " AND po.status = :status"
        params["status"] = status

    rows = await db.execute(
        text(f"""
            SELECT
                po.id, po.order_number, po.status,
                COALESCE(po.priority, 5) AS priority,
                po.planned_start, po.planned_end,
                po.started_at AS actual_start,
                COALESCE(po.target_quantity, 0) AS target_quantity,
                COALESCE(po.actual_good_count, 0) AS actual_good_count,
                pd.name AS product_name,
                m.name AS machine_name,
                pl.name AS line_name
            FROM production_orders po
            LEFT JOIN product_definitions pd ON pd.id = po.product_id
            LEFT JOIN machines m ON m.id = po.machine_id
            LEFT JOIN production_lines pl ON pl.id = po.line_id
            WHERE {where}
            ORDER BY COALESCE(po.priority, 5) ASC, po.planned_start ASC NULLS LAST
            LIMIT :lim
        """),
        {**params, "lim": limit},
    )
    result = []
    for r in rows.fetchall():
        rm = dict(r._mapping)
        result.append(JobSummary(
            id=rm["id"],
            order_number=rm["order_number"],
            product_name=rm["product_name"],
            machine_name=rm["machine_name"],
            line_name=rm["line_name"],
            status=rm["status"],
            priority=rm["priority"],
            planned_start=rm["planned_start"],
            planned_end=rm["planned_end"],
            actual_start=rm["actual_start"],
            target_quantity=rm["target_quantity"],
            actual_good_count=rm["actual_good_count"],
        ))
    return result


@router.get("/gantt", response_model=list[GanttBar])
async def get_gantt(
    factory_id: Optional[uuid.UUID] = Query(None),
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    params: dict = {"org_id": org_id}
    factory_filter = ""
    if factory_id:
        factory_filter = "AND pl.factory_id = :factory_id"
        params["factory_id"] = str(factory_id)

    rows = await db.execute(
        text(f"""
            SELECT
                po.id AS job_id,
                po.order_number,
                pd.name AS product_name,
                m.name AS machine_name,
                COALESCE(po.planned_start, po.created_at) AS start,
                COALESCE(po.planned_end, po.planned_start + INTERVAL '8 hours', po.created_at + INTERVAL '8 hours') AS "end",
                po.status,
                COALESCE(po.priority, 5) AS priority
            FROM production_orders po
            LEFT JOIN product_definitions pd ON pd.id = po.product_id
            LEFT JOIN machines m ON m.id = po.machine_id
            LEFT JOIN production_lines pl ON pl.id = po.line_id
            WHERE po.organization_id = :org_id
              AND po.status NOT IN ('cancelled')
              AND COALESCE(po.planned_start, po.created_at) >= NOW() - INTERVAL '1 day'
              AND COALESCE(po.planned_start, po.created_at) <= NOW() + (:days * INTERVAL '1 day')
            {factory_filter}
            ORDER BY start ASC
            LIMIT 500
        """),
        {**params, "days": days},
    )
    result = []
    for r in rows.fetchall():
        rm = dict(r._mapping)
        result.append(GanttBar(
            job_id=rm["job_id"],
            order_number=rm["order_number"],
            product_name=rm["product_name"],
            machine_name=rm["machine_name"],
            start=rm["start"],
            end=rm["end"],
            status=rm["status"],
            priority=rm["priority"],
        ))
    return result


@router.patch("/jobs/{job_id}/priority", response_model=JobSummary)
async def update_job_priority(
    job_id: uuid.UUID,
    body: PriorityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org_id = str(current_user.organization_id)
    check = await db.execute(
        text("SELECT id FROM production_orders WHERE id = :id AND organization_id = :org_id"),
        {"id": str(job_id), "org_id": org_id},
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Job not found")

    await db.execute(
        text("UPDATE production_orders SET priority = :priority WHERE id = :id AND organization_id = :org_id"),
        {"priority": body.priority, "id": str(job_id), "org_id": org_id},
    )
    await db.commit()

    row = await db.execute(
        text("""
            SELECT po.id, po.order_number, po.status, COALESCE(po.priority, 5) AS priority,
                   po.planned_start, po.planned_end, po.started_at AS actual_start,
                   COALESCE(po.target_quantity, 0) AS target_quantity,
                   COALESCE(po.actual_good_count, 0) AS actual_good_count,
                   pd.name AS product_name, m.name AS machine_name, pl.name AS line_name
            FROM production_orders po
            LEFT JOIN product_definitions pd ON pd.id = po.product_id
            LEFT JOIN machines m ON m.id = po.machine_id
            LEFT JOIN production_lines pl ON pl.id = po.line_id
            WHERE po.id = :id
        """),
        {"id": str(job_id)},
    )
    rm = dict(row.fetchone()._mapping)
    return JobSummary(
        id=rm["id"], order_number=rm["order_number"], product_name=rm["product_name"],
        machine_name=rm["machine_name"], line_name=rm["line_name"], status=rm["status"],
        priority=rm["priority"], planned_start=rm["planned_start"], planned_end=rm["planned_end"],
        actual_start=rm["actual_start"], target_quantity=rm["target_quantity"],
        actual_good_count=rm["actual_good_count"],
    )
