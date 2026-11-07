import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.ai import get_temporal_client
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app
from app.models.ai import AIInvestigation
from app.models.organization import Organization
from app.models.user import User
from app.core.security import hash_password


def _make_temporal_mock():
    mock_handle = MagicMock()
    mock_handle.id = f"ai-investigation-{uuid.uuid4()}"
    mock_client = AsyncMock()
    mock_client.start_workflow = AsyncMock(return_value=mock_handle)
    return mock_client


VALID_CONTEXT = {
    "from": "2026-11-04T06:00:00Z",
    "to": "2026-11-04T14:00:00Z",
}


@pytest_asyncio.fixture
async def second_org(db_session: AsyncSession) -> Organization:
    org = Organization(
        id=uuid.uuid4(),
        name="Other Organization",
        slug="other-org",
        timezone="UTC",
    )
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def other_org_supervisor(db_session: AsyncSession, second_org: Organization) -> User:
    user = User(
        id=uuid.uuid4(),
        organization_id=second_org.id,
        email="other-supervisor@test.com",
        name="Other Supervisor",
        role="supervisor",
        hashed_password=hash_password("supervisorpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def ai_client(db_session: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db_session

    mock_temporal = _make_temporal_mock()

    async def override_get_temporal():
        return mock_temporal

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_temporal_client] = override_get_temporal

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def existing_investigation(db_session: AsyncSession, test_org: Organization, supervisor_user: User) -> AIInvestigation:
    investigation = AIInvestigation(
        id=uuid.uuid4(),
        organization_id=test_org.id,
        initiated_by=supervisor_user.id,
        question="Why did Machine 3 stop?",
        context_window={"from": "2026-11-04T06:00:00Z", "to": "2026-11-04T14:00:00Z"},
        status="completed",
        model_provider="anthropic",
        model_id="claude-sonnet-4-6",
        result={
            "summary": "Machine 3 had a fault.",
            "observations": [{"claim": "Fault detected", "evidence": []}],
            "hypotheses": [{"text": "Bearing failure", "confidence": "high", "supporting_evidence": []}],
            "recommendations": [{"action": "Replace bearing", "rationale": "High confidence"}],
        },
        completed_at=datetime.now(UTC),
    )
    db_session.add(investigation)
    await db_session.commit()
    await db_session.refresh(investigation)
    return investigation


class TestCreateInvestigation:
    async def test_create_investigation_returns_202(self, ai_client: AsyncClient, supervisor_user: User, supervisor_token: str):
        response = await ai_client.post(
            "/api/v1/ai/investigations",
            json={"question": "Why did production drop?", "context": VALID_CONTEXT},
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 202
        data = response.json()
        assert "investigation_id" in data
        assert data["status"] == "pending"

    async def test_create_investigation_forbidden_for_operator(self, ai_client: AsyncClient, operator_user: User, operator_token: str):
        response = await ai_client.post(
            "/api/v1/ai/investigations",
            json={"question": "Why did production drop?", "context": VALID_CONTEXT},
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert response.status_code == 403

    async def test_create_investigation_validates_empty_question(self, ai_client: AsyncClient, supervisor_token: str):
        response = await ai_client.post(
            "/api/v1/ai/investigations",
            json={"question": "", "context": VALID_CONTEXT},
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 422

    async def test_rate_limit_429_after_10_investigations(
        self,
        db_session: AsyncSession,
        ai_client: AsyncClient,
        supervisor_user: User,
        supervisor_token: str,
        test_org: Organization,
    ):
        for i in range(10):
            inv = AIInvestigation(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                initiated_by=supervisor_user.id,
                question=f"Question {i}",
                context_window=VALID_CONTEXT,
                status="pending",
            )
            db_session.add(inv)
        await db_session.commit()

        response = await ai_client.post(
            "/api/v1/ai/investigations",
            json={"question": "One more?", "context": VALID_CONTEXT},
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 429

    async def test_rate_limit_does_not_count_old_investigations(
        self,
        db_session: AsyncSession,
        ai_client: AsyncClient,
        supervisor_user: User,
        supervisor_token: str,
        test_org: Organization,
    ):
        old_time = datetime.now(UTC) - timedelta(hours=2)
        for i in range(10):
            inv = AIInvestigation(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                initiated_by=supervisor_user.id,
                question=f"Old question {i}",
                context_window=VALID_CONTEXT,
                status="pending",
            )
            db_session.add(inv)
        await db_session.commit()

        for inv in (await db_session.execute(
            __import__("sqlalchemy", fromlist=["select"]).select(AIInvestigation).where(
                AIInvestigation.organization_id == test_org.id
            )
        )).scalars().all():
            inv.created_at = old_time
        await db_session.commit()

        response = await ai_client.post(
            "/api/v1/ai/investigations",
            json={"question": "Fresh question", "context": VALID_CONTEXT},
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 202


class TestGetInvestigation:
    async def test_get_investigation_returns_200(
        self,
        ai_client: AsyncClient,
        supervisor_user: User,
        supervisor_token: str,
        existing_investigation: AIInvestigation,
    ):
        response = await ai_client.get(
            f"/api/v1/ai/investigations/{existing_investigation.id}",
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(existing_investigation.id)
        assert data["status"] == "completed"
        assert data["result"] is not None
        assert "summary" in data["result"]

    async def test_get_investigation_404_for_unknown_id(self, ai_client: AsyncClient, supervisor_token: str):
        response = await ai_client.get(
            f"/api/v1/ai/investigations/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 404

    async def test_get_investigation_403_org_isolation(
        self,
        db_session: AsyncSession,
        ai_client: AsyncClient,
        existing_investigation: AIInvestigation,
        second_org: Organization,
        other_org_supervisor: User,
    ):
        other_token = create_access_token(
            subject=str(other_org_supervisor.id),
            extra_claims={
                "org": str(other_org_supervisor.organization_id),
                "role": other_org_supervisor.role,
            },
        )
        response = await ai_client.get(
            f"/api/v1/ai/investigations/{existing_investigation.id}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert response.status_code == 403


class TestFeedback:
    async def test_submit_feedback_returns_200(
        self,
        ai_client: AsyncClient,
        supervisor_token: str,
        existing_investigation: AIInvestigation,
    ):
        response = await ai_client.post(
            f"/api/v1/ai/investigations/{existing_investigation.id}/feedback",
            json={"feedback": "positive", "comment": "Great analysis"},
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 200
        assert response.json() == {"ok": True}

    async def test_submit_feedback_409_on_duplicate(
        self,
        db_session: AsyncSession,
        ai_client: AsyncClient,
        supervisor_token: str,
        existing_investigation: AIInvestigation,
    ):
        existing_investigation.feedback = "positive"
        await db_session.commit()

        response = await ai_client.post(
            f"/api/v1/ai/investigations/{existing_investigation.id}/feedback",
            json={"feedback": "negative"},
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )
        assert response.status_code == 409

    async def test_submit_feedback_forbidden_for_operator(
        self,
        ai_client: AsyncClient,
        operator_token: str,
        existing_investigation: AIInvestigation,
    ):
        response = await ai_client.post(
            f"/api/v1/ai/investigations/{existing_investigation.id}/feedback",
            json={"feedback": "positive"},
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert response.status_code == 403
