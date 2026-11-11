import uuid
from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.org_llm_config import OrgLLMConfig
from app.models.user import User
from app.schemas.llm_config import LLMProviderInfo, LLMProvidersResponse, SaveLLMProviderRequest
from app.schemas.user import UserRole

router = APIRouter()

SUPPORTED_PROVIDERS = {"anthropic", "openai", "gemini", "xai"}

_FERNET: Any = None


def _get_fernet():
    global _FERNET
    if _FERNET is None:
        try:
            from cryptography.fernet import Fernet
            from app.core.config import get_settings
            settings = get_settings()
            key = getattr(settings, "encryption_key", None)
            if key:
                _FERNET = Fernet(key.encode() if isinstance(key, str) else key)
        except Exception:
            pass
    return _FERNET


def _encrypt(value: str) -> str:
    f = _get_fernet()
    if f:
        return f.encrypt(value.encode()).decode()
    return value


def _decrypt(value: str) -> str:
    f = _get_fernet()
    if f:
        try:
            return f.decrypt(value.encode()).decode()
        except Exception:
            pass
    return value


@router.get("/settings/llm-providers", response_model=LLMProvidersResponse)
async def get_llm_providers(
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(OrgLLMConfig).where(OrgLLMConfig.organization_id == current_user.organization_id)
    )
    configs = {r.provider: r for r in rows.scalars().all()}

    providers: dict[str, LLMProviderInfo] = {}
    for p in SUPPORTED_PROVIDERS:
        cfg = configs.get(p)
        providers[p] = LLMProviderInfo(
            has_key=cfg is not None and bool(cfg.api_key_encrypted),
            model=cfg.model_id if cfg else _default_model(p),
            is_active=cfg.is_active if cfg else False,
        )
    return LLMProvidersResponse(providers=providers)


@router.put("/settings/llm-providers/{provider}", status_code=status.HTTP_200_OK)
async def save_llm_provider(
    provider: str,
    body: SaveLLMProviderRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    if provider not in SUPPORTED_PROVIDERS:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(f"Unknown provider: {provider}")

    result = await db.execute(
        select(OrgLLMConfig).where(
            OrgLLMConfig.organization_id == current_user.organization_id,
            OrgLLMConfig.provider == provider,
        )
    )
    cfg = result.scalar_one_or_none()

    if cfg is None:
        cfg = OrgLLMConfig(
            organization_id=current_user.organization_id,
            provider=provider,
            model_id=body.model_id,
        )
        db.add(cfg)
    else:
        cfg.model_id = body.model_id

    if body.api_key:
        cfg.api_key_encrypted = _encrypt(body.api_key)

    await db.commit()
    return {"ok": True}


@router.put("/settings/llm-providers/{provider}/activate", status_code=status.HTTP_200_OK)
async def activate_llm_provider(
    provider: str,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    if provider not in SUPPORTED_PROVIDERS:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(f"Unknown provider: {provider}")

    await db.execute(
        update(OrgLLMConfig)
        .where(OrgLLMConfig.organization_id == current_user.organization_id)
        .values(is_active=False)
    )

    result = await db.execute(
        select(OrgLLMConfig).where(
            OrgLLMConfig.organization_id == current_user.organization_id,
            OrgLLMConfig.provider == provider,
        )
    )
    cfg = result.scalar_one_or_none()
    if cfg is None:
        cfg = OrgLLMConfig(
            organization_id=current_user.organization_id,
            provider=provider,
            model_id=_default_model(provider),
            is_active=True,
        )
        db.add(cfg)
    else:
        cfg.is_active = True

    await db.commit()
    return {"ok": True}


@router.get("/settings/llm-providers/active-config")
async def get_active_provider_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(OrgLLMConfig).where(
            OrgLLMConfig.organization_id == current_user.organization_id,
            OrgLLMConfig.is_active == True,
            OrgLLMConfig.api_key_encrypted.isnot(None),
        )
    )
    cfg = result.scalar_one_or_none()
    if cfg is None:
        return {"provider": None, "api_key": None, "model_id": None}
    return {
        "provider": cfg.provider,
        "api_key": _decrypt(cfg.api_key_encrypted),
        "model_id": cfg.model_id,
    }


def _default_model(provider: str) -> str:
    return {
        "anthropic": "claude-sonnet-4-6",
        "openai": "gpt-4o",
        "gemini": "gemini-1.5-pro",
        "xai": "grok-2",
    }.get(provider, "unknown")
