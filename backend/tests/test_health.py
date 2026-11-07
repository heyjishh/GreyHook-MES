import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_no_auth_required(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_returns_version(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_health_no_bearer_token_accepted(async_client: AsyncClient):
    response = await async_client.get(
        "/api/v1/health",
        headers={"Authorization": "Bearer invalid-token-should-not-matter"},
    )
    assert response.status_code == 200
