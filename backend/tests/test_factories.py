import pytest
from httpx import AsyncClient

from app.models.factory import Factory
from app.models.machine import Machine
from app.models.organization import Organization
from app.models.user import User


@pytest.mark.asyncio
async def test_list_factories_requires_auth(async_client: AsyncClient):
    response = await async_client.get("/api/v1/factories")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_factories_returns_own_org_factories(
    async_client: AsyncClient,
    admin_token: str,
    test_factory: Factory,
):
    response = await async_client.get(
        "/api/v1/factories",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    factory_ids = [item["id"] for item in data["items"]]
    assert str(test_factory.id) in factory_ids


@pytest.mark.asyncio
async def test_get_factory(
    async_client: AsyncClient,
    admin_token: str,
    test_factory: Factory,
):
    response = await async_client.get(
        f"/api/v1/factories/{test_factory.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_factory.id)
    assert data["name"] == test_factory.name


@pytest.mark.asyncio
async def test_create_factory_admin(
    async_client: AsyncClient,
    admin_token: str,
):
    response = await async_client.post(
        "/api/v1/factories",
        json={"name": "New Factory", "location": "Plant B"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Factory"
    assert data["location"] == "Plant B"


@pytest.mark.asyncio
async def test_create_factory_operator_forbidden(
    async_client: AsyncClient,
    operator_token: str,
):
    response = await async_client.post(
        "/api/v1/factories",
        json={"name": "Unauthorized Factory"},
        headers={"Authorization": f"Bearer {operator_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_factory(
    async_client: AsyncClient,
    admin_token: str,
    test_factory: Factory,
):
    response = await async_client.put(
        f"/api/v1/factories/{test_factory.id}",
        json={"name": "Updated Factory", "location": "New Location"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Factory"


@pytest.mark.asyncio
async def test_get_factory_not_found(
    async_client: AsyncClient,
    admin_token: str,
):
    import uuid
    response = await async_client.get(
        f"/api/v1/factories/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_factory_lines(
    async_client: AsyncClient,
    admin_token: str,
    test_factory: Factory,
    test_line,
):
    response = await async_client.get(
        f"/api/v1/factories/{test_factory.id}/lines",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_machine_on_line(
    async_client: AsyncClient,
    admin_token: str,
    test_line,
):
    response = await async_client.post(
        f"/api/v1/lines/{test_line.id}/machines",
        json={
            "name": "New Machine",
            "machine_type": "Lathe",
            "protocol": "simulated",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Machine"
    assert data["protocol"] == "simulated"


@pytest.mark.asyncio
async def test_deactivate_machine(
    async_client: AsyncClient,
    admin_token: str,
    test_machine: Machine,
):
    response = await async_client.delete(
        f"/api/v1/machines/{test_machine.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["deactivated"] is True
