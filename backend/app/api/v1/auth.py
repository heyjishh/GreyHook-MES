import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, LoginResponse, LogoutRequest, RefreshRequest, RefreshResponse
from app.schemas.user import UserSchema

router = APIRouter()


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")

    settings = get_settings()
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"org": str(user.organization_id), "role": user.role},
    )
    raw_refresh = create_refresh_token()
    token_hash = _hash_token(raw_refresh)
    expires_at = (datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)).replace(tzinfo=None)

    refresh_token_row = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(refresh_token_row)
    await db.commit()

    return LoginResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=UserSchema.model_validate(user),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = _hash_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at == None,
        )
    )
    token_row = result.scalar_one_or_none()

    if token_row is None or token_row.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise UnauthorizedError("Invalid or expired refresh token")

    token_row.revoked_at = datetime.now(UTC)

    user_result = await db.execute(
        select(User).where(User.id == token_row.user_id, User.is_active == True)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        await db.commit()
        raise UnauthorizedError("User not found")

    settings = get_settings()
    raw_new_refresh = create_refresh_token()
    new_hash = _hash_token(raw_new_refresh)
    expires_at = (datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)).replace(tzinfo=None)

    new_token_row = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=new_hash,
        expires_at=expires_at,
    )
    db.add(new_token_row)
    await db.commit()

    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"org": str(user.organization_id), "role": user.role},
    )
    return RefreshResponse(access_token=access_token)


@router.post("/logout")
async def logout(body: LogoutRequest, db: AsyncSession = Depends(get_db)):
    token_hash = _hash_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at == None,
        )
    )
    token_row = result.scalar_one_or_none()
    if token_row is not None:
        token_row.revoked_at = datetime.now(UTC)
        await db.commit()
    return {"ok": True}
