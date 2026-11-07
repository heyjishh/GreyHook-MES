import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreateRequest, UserRole, UserSchema, UserUpdateRequest

router = APIRouter()


@router.get("/users", response_model=dict)
async def list_users(
    is_active: bool | None = None,
    role: UserRole | None = None,
    limit: int = 50,
    cursor: str | None = None,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.organization_id == current_user.organization_id)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if role is not None:
        stmt = stmt.where(User.role == role.value)

    count_result = await db.execute(
        select(func.count()).select_from(stmt.subquery())
    )
    total = count_result.scalar_one()

    stmt = stmt.order_by(User.created_at).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()

    return {
        "items": [UserSchema.model_validate(u) for u in users],
        "total": total,
        "next_cursor": None,
    }


@router.post("/users", response_model=UserSchema, status_code=201)
async def create_user(
    body: UserCreateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    if len(body.password) < 10:
        raise ValidationError("Password must be at least 10 characters")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("Email already exists")

    new_user = User(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        email=body.email,
        name=body.name,
        role=body.role.value,
        hashed_password=hash_password(body.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserSchema.model_validate(new_user)


@router.patch("/users/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError(f"User {user_id} not found")

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role.value
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return UserSchema.model_validate(user)


@router.get("/users/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserSchema.model_validate(current_user)
