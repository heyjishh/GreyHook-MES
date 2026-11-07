import uuid
from datetime import UTC, datetime, timedelta
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.factory import Factory, ProductionLine
from app.models.machine import Machine
from app.models.organization import Organization
from app.models.user import User


def _sqlite_visit_uuid(self, type_, **kw):
    return "TEXT"


def _sqlite_visit_inet(self, type_, **kw):
    return "TEXT"


def _sqlite_visit_jsonb(self, type_, **kw):
    return "TEXT"


def _sqlite_visit_array(self, type_, **kw):
    return "TEXT"


SQLiteTypeCompiler.visit_UUID = _sqlite_visit_uuid  # type: ignore[attr-defined]
SQLiteTypeCompiler.visit_INET = _sqlite_visit_inet  # type: ignore[attr-defined]
SQLiteTypeCompiler.visit_JSONB = _sqlite_visit_jsonb  # type: ignore[attr-defined]
SQLiteTypeCompiler.visit_ARRAY = _sqlite_visit_array  # type: ignore[attr-defined]

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    return Settings(
        database_url=TEST_DATABASE_URL,
        jwt_secret="test-secret-key-for-tests-only",
        jwt_algorithm="HS256",
        kafka_bootstrap_servers="localhost:9092",
        valkey_url="redis://localhost:6379",
        temporal_host="localhost:7233",
        environment="development",
    )


test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_org(db_session: AsyncSession) -> Organization:
    org = Organization(
        id=uuid.uuid4(),
        name="Test Organization",
        slug="test-org",
        timezone="UTC",
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def test_factory(db_session: AsyncSession, test_org: Organization) -> Factory:
    factory = Factory(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        name="Test Factory",
        location="Test Location",
    )
    db_session.add(factory)
    await db_session.commit()
    await db_session.refresh(factory)
    return factory


@pytest_asyncio.fixture
async def test_line(db_session: AsyncSession, test_org: Organization, test_factory: Factory) -> ProductionLine:
    line = ProductionLine(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        factory_id=test_factory.id,
        name="Test Line",
    )
    db_session.add(line)
    await db_session.commit()
    await db_session.refresh(line)
    return line


@pytest_asyncio.fixture
async def test_machine(db_session: AsyncSession, test_org: Organization, test_line: ProductionLine) -> Machine:
    machine = Machine(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        line_id=test_line.id,
        name="Test Machine",
        machine_type="CNC",
        protocol="simulated",
    )
    db_session.add(machine)
    await db_session.commit()
    await db_session.refresh(machine)
    return machine


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession, test_org: Organization) -> User:
    user = User(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        email="admin@test.com",
        name="Admin User",
        role="admin",
        hashed_password=hash_password("adminpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def supervisor_user(db_session: AsyncSession, test_org: Organization) -> User:
    user = User(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        email="supervisor@test.com",
        name="Supervisor User",
        role="supervisor",
        hashed_password=hash_password("supervisorpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def operator_user(db_session: AsyncSession, test_org: Organization) -> User:
    user = User(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        email="operator@test.com",
        name="Operator User",
        role="operator",
        hashed_password=hash_password("operatorpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(
        subject=str(admin_user.id),
        extra_claims={"org": str(admin_user.organization_id), "role": admin_user.role},
    )


@pytest.fixture
def supervisor_token(supervisor_user: User) -> str:
    return create_access_token(
        subject=str(supervisor_user.id),
        extra_claims={"org": str(supervisor_user.organization_id), "role": supervisor_user.role},
    )


@pytest.fixture
def operator_token(operator_user: User) -> str:
    return create_access_token(
        subject=str(operator_user.id),
        extra_claims={"org": str(operator_user.organization_id), "role": operator_user.role},
    )
