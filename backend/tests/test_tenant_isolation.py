import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models.factory import Factory, ProductionLine
from app.models.machine import Machine
from app.models.organization import Organization
from app.models.user import User


async def _create_org_with_user(
    db: AsyncSession,
    org_name: str,
    slug: str,
    email: str,
    role: str = "admin",
) -> tuple[Organization, User]:
    org = Organization(
        id=uuid.uuid4(),
        name=org_name,
        slug=slug,
        timezone="UTC",
    )
    db.add(org)
    await db.flush()

    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=email,
        name=f"User {email}",
        role=role,
        hashed_password=hash_password("password123"),
    )
    db.add(user)
    await db.flush()
    return org, user


async def _create_factory_line_machine(
    db: AsyncSession,
    org: Organization,
) -> tuple[Factory, ProductionLine, Machine]:
    factory = Factory(
        id=uuid.uuid4(),
        organization_id=org.id,
        name=f"Factory for {org.slug}",
    )
    db.add(factory)
    await db.flush()

    line = ProductionLine(
        id=uuid.uuid4(),
        organization_id=org.id,
        factory_id=factory.id,
        name="Line A",
    )
    db.add(line)
    await db.flush()

    machine = Machine(
        id=uuid.uuid4(),
        organization_id=org.id,
        line_id=line.id,
        name="Machine A",
        machine_type="CNC",
        protocol="simulated",
    )
    db.add(machine)
    await db.commit()
    return factory, line, machine


@pytest.mark.asyncio
async def test_cannot_access_other_org_factory(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    org1, user1 = await _create_org_with_user(db_session, "Org 1", "org1", "user1@org1.com")
    org2, user2 = await _create_org_with_user(db_session, "Org 2", "org2", "user2@org2.com")
    factory2, _, _ = await _create_factory_line_machine(db_session, org2)

    token1 = create_access_token(str(user1.id), {"org": str(org1.id), "role": "admin"})

    response = await async_client.get(
        f"/api/v1/factories/{factory2.id}",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_org_machine_status(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    org1, user1 = await _create_org_with_user(db_session, "Org A", "orga", "usera@orga.com")
    org2, user2 = await _create_org_with_user(db_session, "Org B", "orgb", "userb@orgb.com")
    _, _, machine2 = await _create_factory_line_machine(db_session, org2)

    token1 = create_access_token(str(user1.id), {"org": str(org1.id), "role": "admin"})

    response = await async_client.get(
        f"/api/v1/machines/{machine2.id}/status",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_factories_list_scoped_to_own_org(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    org1, user1 = await _create_org_with_user(db_session, "Org X", "orgx", "userx@orgx.com")
    org2, user2 = await _create_org_with_user(db_session, "Org Y", "orgy", "usery@orgy.com")
    await _create_factory_line_machine(db_session, org1)
    await _create_factory_line_machine(db_session, org2)

    token1 = create_access_token(str(user1.id), {"org": str(org1.id), "role": "admin"})

    response = await async_client.get(
        "/api/v1/factories",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert response.status_code == 200
    data = response.json()
    org_ids = {item["organization_id"] for item in data["items"]}
    assert str(org2.id) not in org_ids
    assert str(org1.id) in org_ids


@pytest.mark.asyncio
async def test_cannot_access_other_org_machine_events(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    org1, user1 = await _create_org_with_user(db_session, "Org P", "orgp", "userp@orgp.com")
    org2, user2 = await _create_org_with_user(db_session, "Org Q", "orgq", "userq@orgq.com")
    _, _, machine2 = await _create_factory_line_machine(db_session, org2)

    token1 = create_access_token(str(user1.id), {"org": str(org1.id), "role": "admin"})

    response = await async_client.get(
        f"/api/v1/machines/{machine2.id}/events",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_org_downtime(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    org1, user1 = await _create_org_with_user(db_session, "Org M", "orgm", "userm@orgm.com")
    org2, user2 = await _create_org_with_user(db_session, "Org N", "orgn", "usern@orgn.com")
    _, _, machine2 = await _create_factory_line_machine(db_session, org2)

    token1 = create_access_token(str(user1.id), {"org": str(org1.id), "role": "admin"})

    response = await async_client.get(
        f"/api/v1/machines/{machine2.id}/downtime",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cannot_access_other_org_factory_lines(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    org1, user1 = await _create_org_with_user(db_session, "Org C", "orgc", "userc@orgc.com")
    org2, user2 = await _create_org_with_user(db_session, "Org D", "orgd", "userd@orgd.com")
    factory2, _, _ = await _create_factory_line_machine(db_session, org2)

    token1 = create_access_token(str(user1.id), {"org": str(org1.id), "role": "admin"})

    response = await async_client.get(
        f"/api/v1/factories/{factory2.id}/lines",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert response.status_code == 404
