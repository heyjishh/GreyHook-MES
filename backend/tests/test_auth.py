import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_login_valid_credentials(async_client: AsyncClient, admin_user: User):
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900
    assert data["user"]["email"] == "admin@test.com"


@pytest.mark.asyncio
async def test_login_wrong_password(async_client: AsyncClient, admin_user: User):
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_login_unknown_email(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@test.com", "password": "somepassword"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_access_protected_without_token(async_client: AsyncClient):
    response = await async_client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_access_protected_with_expired_token(async_client: AsyncClient, admin_user: User):
    from datetime import timedelta
    from app.core.config import get_settings
    import jwt as pyjwt
    from datetime import datetime, UTC

    settings = get_settings()
    payload = {
        "sub": str(admin_user.id),
        "org": str(admin_user.organization_id),
        "role": admin_user.role,
        "type": "access",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) - timedelta(minutes=1),
    }
    from jose import jwt
    expired_token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    response = await async_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_valid_token(async_client: AsyncClient, admin_user: User):
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpassword123"},
    )
    refresh_token = login_response.json()["refresh_token"]

    refresh_response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_response.status_code == 200
    data = refresh_response.json()
    assert "access_token" in data
    assert data["expires_in"] == 900


@pytest.mark.asyncio
async def test_refresh_with_invalid_token(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "completely-invalid-token-value"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_refresh_token_rotation(async_client: AsyncClient, admin_user: User):
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpassword123"},
    )
    refresh_token = login_response.json()["refresh_token"]

    await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    second_refresh = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert second_refresh.status_code == 401
