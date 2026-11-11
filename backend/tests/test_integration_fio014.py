"""FIO-014 integration tests — alert rules, shift handover, downtime logging,
AI investigation list endpoint, tenant isolation across all new endpoints."""
import uuid

import pytest
from httpx import AsyncClient

from app.models.organization import Organization
from app.models.user import User
from app.core.security import create_access_token, hash_password


# ── helpers ──────────────────────────────────────────────────────────────────

def _auth(user: User) -> dict:
    token = create_access_token(
        subject=str(user.id),
        extra_claims={"org": str(user.organization_id), "role": user.role},
    )
    return {"Authorization": f"Bearer {token}"}


# ── alert rules ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_alert_rules_lifecycle(async_client: AsyncClient, admin_user: User):
    hdrs = _auth(admin_user)

    # list empty
    r = await async_client.get("/api/v1/settings/alert-rules", headers=hdrs)
    assert r.status_code == 200
    assert r.json() == []

    # create
    r = await async_client.post(
        "/api/v1/settings/alert-rules",
        headers=hdrs,
        json={
            "name": "Machine Fault Alert",
            "event_type": "machine_fault",
            "threshold": None,
            "channel_type": "email",
            "channel_config": {"endpoint": "ops@factory.com"},
        },
    )
    assert r.status_code == 201
    rule = r.json()
    rule_id = rule["id"]
    assert rule["event_type"] == "machine_fault"
    assert rule["enabled"] is True

    # list includes it
    r = await async_client.get("/api/v1/settings/alert-rules", headers=hdrs)
    assert len(r.json()) == 1

    # update — disable
    r = await async_client.patch(
        f"/api/v1/settings/alert-rules/{rule_id}",
        headers=hdrs,
        json={"enabled": False},
    )
    assert r.status_code == 200
    assert r.json()["enabled"] is False

    # delete
    r = await async_client.delete(f"/api/v1/settings/alert-rules/{rule_id}", headers=hdrs)
    assert r.status_code == 204

    r = await async_client.get("/api/v1/settings/alert-rules", headers=hdrs)
    assert r.json() == []


@pytest.mark.asyncio
async def test_alert_rules_operator_cannot_create(async_client: AsyncClient, operator_user: User):
    r = await async_client.post(
        "/api/v1/settings/alert-rules",
        headers=_auth(operator_user),
        json={
            "name": "Bad Rule",
            "event_type": "oee_below_target",
            "threshold": 70.0,
            "channel_type": "slack",
            "channel_config": {},
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_alert_rules_tenant_isolation(
    async_client: AsyncClient,
    admin_user: User,
    db_session,
):
    from app.models.organization import Organization
    from app.models.alert_rule import AlertRule

    other_org = Organization(id=uuid.uuid4(), name="Other Co", slug="other-co", timezone="UTC")
    db_session.add(other_org)
    await db_session.commit()

    other_rule = AlertRule(
        id=uuid.uuid4(),
        organization_id=other_org.id,
        name="Other org rule",
        event_type="machine_fault",
        channel_type="email",
        channel_config={"endpoint": "x@other.com"},
    )
    db_session.add(other_rule)
    await db_session.commit()

    r = await async_client.get("/api/v1/settings/alert-rules", headers=_auth(admin_user))
    ids = [x["id"] for x in r.json()]
    assert str(other_rule.id) not in ids


# ── shift handover ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_shift_handover_lifecycle(async_client: AsyncClient, admin_user: User):
    hdrs = _auth(admin_user)

    r = await async_client.get("/api/v1/shift-handovers", headers=hdrs)
    assert r.status_code == 200
    assert r.json() == []

    r = await async_client.post(
        "/api/v1/shift-handovers",
        headers=hdrs,
        json={
            "shift_name": "B",
            "shift_date": "2026-11-12",
            "from_time": "14:00",
            "to_time": "22:00",
            "supervisor_name": "Ravi Singh",
            "production_target": 500,
            "production_actual": 468,
            "fpy_pct": 96.4,
            "oee_pct": 72.3,
            "downtime_minutes": 48,
            "open_ncrs": 2,
            "notes": "CNC-001 vibration alarm cleared by maintenance.",
            "issues": [
                {
                    "severity": "high",
                    "description": "Spindle bearing alarm",
                    "action": "Lubrication increased",
                    "resolved": True,
                }
            ],
            "handover_items": [
                {
                    "category": "Open Orders",
                    "item": "PO-001 55% complete",
                    "from_name": "Ravi Singh",
                }
            ],
        },
    )
    assert r.status_code == 201
    report = r.json()
    report_id = report["id"]
    assert report["shift_name"] == "B"
    assert report["status"] == "submitted"
    assert len(report["issues"]) == 1

    r = await async_client.get("/api/v1/shift-handovers", headers=hdrs)
    assert len(r.json()) == 1

    r = await async_client.patch(
        f"/api/v1/shift-handovers/{report_id}",
        headers=hdrs,
        json={"status": "acknowledged"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "acknowledged"


@pytest.mark.asyncio
async def test_shift_handover_operator_cannot_create(async_client: AsyncClient, operator_user: User):
    r = await async_client.post(
        "/api/v1/shift-handovers",
        headers=_auth(operator_user),
        json={
            "shift_name": "A",
            "shift_date": "2026-11-12",
            "from_time": "06:00",
            "to_time": "14:00",
            "supervisor_name": "Nobody",
            "production_target": 100,
            "production_actual": 90,
            "fpy_pct": 99.0,
            "oee_pct": 80.0,
            "downtime_minutes": 10,
            "open_ncrs": 0,
            "notes": "",
            "issues": [],
            "handover_items": [],
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_shift_handover_tenant_isolation(
    async_client: AsyncClient,
    admin_user: User,
    db_session,
):
    from app.models.organization import Organization
    from app.models.shift_handover import ShiftHandoverReport

    other_org = Organization(id=uuid.uuid4(), name="Org B", slug="org-b", timezone="UTC")
    db_session.add(other_org)
    await db_session.commit()

    other_report = ShiftHandoverReport(
        id=uuid.uuid4(),
        organization_id=other_org.id,
        shift_name="C",
        shift_date="2026-11-12",
        from_time="22:00",
        to_time="06:00",
        supervisor_name="X",
        production_target=200,
        production_actual=180,
        fpy_pct=99.0,
        oee_pct=70.0,
        downtime_minutes=30,
        open_ncrs=0,
        notes="",
        issues=[],
        handover_items=[],
        status="submitted",
    )
    db_session.add(other_report)
    await db_session.commit()

    r = await async_client.get("/api/v1/shift-handovers", headers=_auth(admin_user))
    ids = [x["id"] for x in r.json()]
    assert str(other_report.id) not in ids


# ── downtime logging ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_downtime_log_create_and_get(
    async_client: AsyncClient,
    admin_user: User,
    test_machine,
):
    hdrs = _auth(admin_user)
    from datetime import UTC, datetime, timedelta

    started = datetime.now(UTC) - timedelta(hours=1)
    ended = datetime.now(UTC) - timedelta(minutes=30)

    r = await async_client.post(
        f"/api/v1/machines/{test_machine.id}/downtime",
        headers=hdrs,
        json={
            "category": "Mechanical Failure",
            "reason": "Spindle bearing alarm",
            "started_at": started.isoformat(),
            "ended_at": ended.isoformat(),
            "is_planned": False,
        },
    )
    assert r.status_code in (200, 201)
    data = r.json()
    assert data["category"] == "Mechanical Failure"

    r2 = await async_client.get(
        f"/api/v1/machines/{test_machine.id}/downtime",
        headers=hdrs,
    )
    assert r2.status_code == 200
    assert len(r2.json()) >= 1


# ── AI investigation list endpoint ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ai_investigations_list_empty(async_client: AsyncClient, admin_user: User):
    r = await async_client.get("/api/v1/ai/investigations", headers=_auth(admin_user))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_ai_investigations_list_tenant_isolation(
    async_client: AsyncClient,
    admin_user: User,
    db_session,
):
    from app.models.ai import AIInvestigation
    from app.models.organization import Organization

    other_org = Organization(id=uuid.uuid4(), name="Spy Corp", slug="spy-corp", timezone="UTC")
    db_session.add(other_org)
    await db_session.commit()

    other_inv = AIInvestigation(
        id=uuid.uuid4(),
        organization_id=other_org.id,
        question="Why is OEE low?",
        context_window={"machines": [], "time_range_hours": 24},
        status="completed",
        result={"summary": "test"},
    )
    db_session.add(other_inv)
    await db_session.commit()

    r = await async_client.get("/api/v1/ai/investigations", headers=_auth(admin_user))
    ids = [x["id"] for x in r.json()]
    assert str(other_inv.id) not in ids


# ── rate limit ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ai_investigation_rate_limit(
    async_client: AsyncClient,
    admin_user: User,
    db_session,
):
    from app.models.ai import AIInvestigation
    from datetime import UTC, datetime, timedelta

    for _ in range(10):
        inv = AIInvestigation(
            id=uuid.uuid4(),
            organization_id=admin_user.organization_id,
            question="OEE?",
            context_window={"machines": [], "time_range_hours": 24},
            status="completed",
            result={},
            created_at=datetime.now(UTC) - timedelta(minutes=5),
        )
        db_session.add(inv)
    await db_session.commit()

    from datetime import UTC, datetime, timedelta as td
    now = datetime.now(UTC)
    r = await async_client.post(
        "/api/v1/ai/investigations",
        headers=_auth(admin_user),
        json={
            "question": "One more?",
            "context": {
                "from": (now - td(hours=1)).isoformat(),
                "to": now.isoformat(),
            },
        },
    )
    assert r.status_code == 429
