from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.integrations.module_catalog import (
    ALL_MODULES,
    INDUSTRY_TEMPLATES,
    IndustryId,
    get_template_modules,
    modules_as_dict,
)
from app.models.module import OrganizationModule
from app.models.user import User

router = APIRouter(prefix="/modules", tags=["modules"])


class ModuleToggle(BaseModel):
    module_id: str
    is_enabled: bool


class ModuleBulkSet(BaseModel):
    module_ids: list[str]


class ApplyTemplate(BaseModel):
    industry: str


class OrgModuleOut(BaseModel):
    module_id: str
    is_enabled: bool

    model_config = {"from_attributes": True}


@router.get("/catalog")
async def list_catalog(
    industry: str | None = Query(None),
    category: str | None = Query(None),
):
    mods = modules_as_dict()
    if industry:
        mods = [m for m in mods if industry in m["industries"]]
    if category:
        mods = [m for m in mods if m["category"] == category]
    return {"modules": mods, "total": len(mods)}


@router.get("/templates")
async def list_templates():
    return {
        industry: {
            "module_count": len(ids),
            "module_ids": ids,
        }
        for industry, ids in INDUSTRY_TEMPLATES.items()
    }


@router.get("/org/{org_id}", response_model=list[OrgModuleOut])
async def get_org_modules(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != org_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(OrganizationModule).where(OrganizationModule.organization_id == org_id)
    )
    rows = result.scalars().all()

    if not rows:
        all_ids = [m.id for m in ALL_MODULES]
        return [OrgModuleOut(module_id=mid, is_enabled=True) for mid in all_ids]

    return rows


@router.put("/org/{org_id}/toggle", response_model=OrgModuleOut)
async def toggle_module(
    org_id: uuid.UUID,
    body: ModuleToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "supervisor"):
        raise HTTPException(status_code=403, detail="Admin required")
    if current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(OrganizationModule).where(
            OrganizationModule.organization_id == org_id,
            OrganizationModule.module_id == body.module_id,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        row.is_enabled = body.is_enabled
    else:
        row = OrganizationModule(
            organization_id=org_id,
            module_id=body.module_id,
            is_enabled=body.is_enabled,
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return row


@router.post("/org/{org_id}/apply-template", response_model=list[OrgModuleOut])
async def apply_industry_template(
    org_id: uuid.UUID,
    body: ApplyTemplate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin required")
    if current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    industry = body.industry
    if industry not in INDUSTRY_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown industry: {industry}")

    enabled_ids = set(get_template_modules(industry))
    all_ids = {m.id for m in ALL_MODULES}

    await db.execute(
        delete(OrganizationModule).where(OrganizationModule.organization_id == org_id)
    )

    rows = []
    for mid in all_ids:
        row = OrganizationModule(
            organization_id=org_id,
            module_id=mid,
            is_enabled=(mid in enabled_ids),
        )
        db.add(row)
        rows.append(row)

    await db.commit()
    for r in rows:
        await db.refresh(r)
    return rows
