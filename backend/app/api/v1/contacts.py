"""Contacts — customer/vendor contacts (Fleetbase Contact model)."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/contacts", tags=["contacts"])


class ContactCreate(BaseModel):
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: str = "customer"
    place_id: Optional[uuid.UUID] = None
    avatar_url: Optional[str] = None
    internal_id: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO contacts
                (organization_id, place_id, name, title, email, phone, type,
                 avatar_url, internal_id)
            VALUES (:org_id, :place_id, :name, :title, :email, :phone, :type,
                    :avatar_url, :internal_id)
            RETURNING id, name, type
        """),
        {
            "org_id": str(current_user.organization_id),
            "place_id": str(body.place_id) if body.place_id else None,
            "name": body.name, "title": body.title, "email": body.email,
            "phone": body.phone, "type": body.type,
            "avatar_url": body.avatar_url, "internal_id": body.internal_id,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name, "type": row.type}


@router.get("")
async def list_contacts(
    q: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["c.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if q:
        filters.append("(c.name ILIKE :q OR c.email ILIKE :q OR c.phone ILIKE :q)")
        params["q"] = f"%{q}%"
    if type:
        filters.append("c.type = :type"); params["type"] = type

    rows = await db.execute(
        text(f"""
            SELECT c.id, c.name, c.title, c.email, c.phone, c.type,
                   c.avatar_url, p.city
            FROM contacts c
            LEFT JOIN places p ON c.place_id = p.id
            WHERE {' AND '.join(filters)}
            ORDER BY c.name
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.get("/{contact_id}")
async def get_contact(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text("""
            SELECT c.*, p.street1, p.city, p.province, p.country AS place_country
            FROM contacts c
            LEFT JOIN places p ON c.place_id = p.id
            WHERE c.id = :id AND c.organization_id = :org_id
        """),
        {"id": str(contact_id), "org_id": str(current_user.organization_id)},
    )
    c = row.fetchone()
    if not c:
        raise HTTPException(404, "Contact not found")
    return dict(c._mapping)


@router.patch("/{contact_id}")
async def update_contact(
    contact_id: uuid.UUID,
    body: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            UPDATE contacts
            SET name=:name, title=:title, email=:email, phone=:phone,
                type=:type, avatar_url=:avatar_url, updated_at=NOW()
            WHERE id=:id AND organization_id=:org_id
            RETURNING id
        """),
        {
            "name": body.name, "title": body.title, "email": body.email,
            "phone": body.phone, "type": body.type, "avatar_url": body.avatar_url,
            "id": str(contact_id), "org_id": str(current_user.organization_id),
        },
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Contact not found")
    return {"ok": True}
