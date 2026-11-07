from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import func, select

from app.core.audit import _resource_from_path
from app.models.audit import AuditLog


def _make_session_ctx(db_session):
    """Return an async context manager that yields db_session."""
    class _Ctx:
        async def __aenter__(self):
            return db_session
        async def __aexit__(self, *_):
            pass
    return _Ctx()


async def _audit_count(db_session):
    result = await db_session.execute(select(func.count()).select_from(AuditLog))
    return result.scalar_one()


@pytest.mark.asyncio
async def test_resource_from_path_factories():
    resource, rid = _resource_from_path("/api/v1/factories")
    assert resource == "factories"
    assert rid is None


@pytest.mark.asyncio
async def test_resource_from_path_with_id():
    import uuid
    uid = uuid.uuid4()
    resource, rid = _resource_from_path(f"/api/v1/machines/{uid}")
    assert resource == "machines"
    assert rid == uid


@pytest.mark.asyncio
async def test_mutating_post_creates_audit_log(
    async_client, admin_token, db_session, test_org
):
    with patch("app.core.audit.AsyncSessionLocal", return_value=_make_session_ctx(db_session)):
        before = await _audit_count(db_session)
        response = await async_client.post(
            "/api/v1/factories",
            json={"name": "Audit Test Factory", "location": "Test City", "timezone": "UTC"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code in (200, 201)
        after = await _audit_count(db_session)
        assert after > before

        result = await db_session.execute(
            select(AuditLog).where(AuditLog.action.like("POST:%"))
        )
        row = result.scalars().first()
        assert row is not None
        assert row.resource_type == "factories"


@pytest.mark.asyncio
async def test_get_request_does_not_create_audit_log(
    async_client, admin_token, db_session
):
    with patch("app.core.audit.AsyncSessionLocal", return_value=_make_session_ctx(db_session)):
        before = await _audit_count(db_session)
        response = await async_client.get(
            "/api/v1/factories",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        after = await _audit_count(db_session)
        assert after == before


@pytest.mark.asyncio
async def test_auth_route_excluded_from_audit_log(
    async_client, db_session
):
    with patch("app.core.audit.AsyncSessionLocal", return_value=_make_session_ctx(db_session)):
        before = await _audit_count(db_session)
        await async_client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "badpassword"},
        )
        after = await _audit_count(db_session)
        assert after == before


@pytest.mark.asyncio
async def test_audit_log_records_user_and_org(
    async_client, admin_token, admin_user, db_session, test_org
):
    with patch("app.core.audit.AsyncSessionLocal", return_value=_make_session_ctx(db_session)):
        await async_client.post(
            "/api/v1/factories",
            json={"name": "User Org Factory", "location": "Pune", "timezone": "Asia/Kolkata"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        result = await db_session.execute(
            select(AuditLog).where(AuditLog.action.like("POST:%"))
        )
        row = result.scalars().first()
        assert row is not None
        assert row.user_id == admin_user.id
        assert row.organization_id == test_org.id
