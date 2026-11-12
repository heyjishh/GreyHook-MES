"""Synchronous LLM caller for simple inline AI features."""
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.org_llm_config import OrgLLMConfig

import uuid as _uuid


async def _get_api_key(db: AsyncSession, org_id: _uuid.UUID) -> tuple[str, str]:
    settings = get_settings()
    result = await db.execute(
        select(OrgLLMConfig).where(
            OrgLLMConfig.organization_id == org_id,
            OrgLLMConfig.is_active.is_(True),
            OrgLLMConfig.api_key_encrypted.isnot(None),
        )
    )
    cfg = result.scalar_one_or_none()
    if cfg:
        from app.api.v1.llm_configs import _decrypt
        return _decrypt(cfg.api_key_encrypted), cfg.model_id or "claude-sonnet-4-6"
    return settings.anthropic_api_key, "claude-sonnet-4-6"


async def ask_claude(prompt: str, db: AsyncSession, org_id: _uuid.UUID, max_tokens: int = 400) -> str:
    api_key, model_id = await _get_api_key(db, org_id)
    if not api_key:
        return "AI commentary unavailable (no API key configured)."
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model_id, "max_tokens": max_tokens, "messages": [{"role": "user", "content": prompt}]},
        )
        if resp.status_code != 200:
            return "AI commentary unavailable."
        data = resp.json()
        return data["content"][0]["text"].strip()
