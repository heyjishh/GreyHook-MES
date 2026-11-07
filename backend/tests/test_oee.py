import uuid
from datetime import UTC, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.downtime import DowntimeEvent
from app.models.oee import OEEAggregate
from app.models.telemetry import MachineStatePeriod


def _now_utc() -> datetime:
    return datetime.now(UTC)


def _make_oee_agg(
    org_id: uuid.UUID,
    machine_id: uuid.UUID,
    granularity: str = "shift",
    period_start: datetime | None = None,
    period_end: datetime | None = None,
    availability: float = 0.85,
    performance: float = 0.90,
    quality: float = 0.97,
    oee: float = 0.742,
) -> OEEAggregate:
    if period_start is None:
        period_start = _now_utc().replace(hour=6, minute=0, second=0, microsecond=0)
    if period_end is None:
        period_end = period_start + timedelta(hours=8)
    return OEEAggregate(
        organization_id=org_id,
        machine_id=machine_id,
        period_start=period_start,
        period_end=period_end,
        granularity=granularity,
        planned_time_s=28800,
        run_time_s=24480,
        idle_time_s=2160,
        fault_time_s=2160,
        planned_qty=500,
        actual_qty=440,
        rejected_qty=14,
        availability=availability,
        performance=performance,
        quality=quality,
        oee=oee,
    )


class TestOEE7Day:
    async def test_returns_items_for_factory(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc()
        for i in range(3):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            agg = _make_oee_agg(
                test_org.id,
                test_machine.id,
                granularity="day",
                period_start=day_start,
                period_end=day_start + timedelta(days=1),
            )
            db_session.add(agg)
            await db_session.flush()
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/oee/7day?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert len(body["items"]) == 3
        assert body["factory_id"] == str(test_factory.id)

    async def test_items_have_oee_components(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc()
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        agg = _make_oee_agg(
            test_org.id,
            test_machine.id,
            granularity="day",
            period_start=day_start,
            period_end=day_start + timedelta(days=1),
            availability=0.85,
            performance=0.90,
            quality=0.97,
            oee=0.742,
        )
        db_session.add(agg)
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/oee/7day?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        item = resp.json()["items"][0]
        assert item["availability"] == pytest.approx(0.85, abs=0.01)
        assert item["performance"] == pytest.approx(0.90, abs=0.01)
        assert item["quality"] == pytest.approx(0.97, abs=0.01)
        assert item["oee"] == pytest.approx(0.742, abs=0.01)

    async def test_returns_empty_when_no_aggregates(
        self,
        async_client: AsyncClient,
        test_factory,
        admin_token: str,
    ):
        resp = await async_client.get(
            f"/api/v1/oee/7day?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    async def test_404_for_unknown_factory(
        self,
        async_client: AsyncClient,
        admin_token: str,
    ):
        resp = await async_client.get(
            f"/api/v1/oee/7day?factory_id={uuid.uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404

    async def test_requires_auth(self, async_client: AsyncClient, test_factory):
        resp = await async_client.get(f"/api/v1/oee/7day?factory_id={test_factory.id}")
        assert resp.status_code == 401


class TestOEEPerMachine:
    async def test_returns_per_machine_oee(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        agg = _make_oee_agg(test_org.id, test_machine.id, granularity="shift")
        db_session.add(agg)
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/oee/per-machine?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 1
        item = body["items"][0]
        assert item["machine_id"] == str(test_machine.id)
        assert item["machine_name"] == test_machine.name

    async def test_oee_values_in_response(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        agg = _make_oee_agg(
            test_org.id, test_machine.id, granularity="shift",
            availability=0.80, performance=0.85, quality=0.95, oee=0.646,
        )
        db_session.add(agg)
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/oee/per-machine?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        item = resp.json()["items"][0]
        assert item["availability"] == pytest.approx(0.80, abs=0.01)
        assert item["performance"] == pytest.approx(0.85, abs=0.01)
        assert item["quality"] == pytest.approx(0.95, abs=0.01)
        assert item["oee"] == pytest.approx(0.646, abs=0.01)

    async def test_machine_with_no_aggregates_has_null_oee(
        self,
        async_client: AsyncClient,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        resp = await async_client.get(
            f"/api/v1/oee/per-machine?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        item = resp.json()["items"][0]
        assert item["oee"] is None

    async def test_404_for_unknown_factory(self, async_client: AsyncClient, admin_token: str):
        resp = await async_client.get(
            f"/api/v1/oee/per-machine?factory_id={uuid.uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404


class TestOEEMachineHourly:
    async def test_returns_hourly_aggregates(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc().replace(minute=0, second=0, microsecond=0)
        for i in range(3):
            hour_start = now - timedelta(hours=i + 1)
            agg = _make_oee_agg(
                test_org.id,
                test_machine.id,
                granularity="hour",
                period_start=hour_start,
                period_end=hour_start + timedelta(hours=1),
            )
            db_session.add(agg)
            await db_session.flush()
        await db_session.commit()

        from_time = (now - timedelta(hours=4)).isoformat()
        to_time = now.isoformat()
        resp = await async_client.get(
            f"/api/v1/oee/machines/{test_machine.id}/hourly",
            params={"from_time": from_time, "to_time": to_time},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["machine_id"] == str(test_machine.id)
        assert len(body["items"]) == 3

    async def test_items_ordered_chronologically(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc().replace(minute=0, second=0, microsecond=0)
        hour_starts = [now - timedelta(hours=i + 1) for i in range(3)]
        for hs in reversed(hour_starts):
            agg = _make_oee_agg(
                test_org.id,
                test_machine.id,
                granularity="hour",
                period_start=hs,
                period_end=hs + timedelta(hours=1),
            )
            db_session.add(agg)
            await db_session.flush()
        await db_session.commit()

        from_time = (now - timedelta(hours=5)).isoformat()
        to_time = now.isoformat()
        resp = await async_client.get(
            f"/api/v1/oee/machines/{test_machine.id}/hourly",
            params={"from_time": from_time, "to_time": to_time},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        items = resp.json()["items"]
        starts = [item["period_start"] for item in items]
        assert starts == sorted(starts)

    async def test_404_for_unknown_machine(self, async_client: AsyncClient, admin_token: str):
        resp = await async_client.get(
            f"/api/v1/oee/machines/{uuid.uuid4()}/hourly",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404

    async def test_requires_auth(self, async_client: AsyncClient, test_machine):
        resp = await async_client.get(f"/api/v1/oee/machines/{test_machine.id}/hourly")
        assert resp.status_code == 401


class TestDowntimePareto:
    async def test_pareto_sorted_by_duration(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc()
        events = [
            DowntimeEvent(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                machine_id=test_machine.id,
                category="ME-01",
                started_at=now - timedelta(hours=3),
                ended_at=now - timedelta(hours=2),
                duration_seconds=3600,
                is_planned=False,
            ),
            DowntimeEvent(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                machine_id=test_machine.id,
                category="MA-02",
                started_at=now - timedelta(hours=2),
                ended_at=now - timedelta(hours=1, minutes=30),
                duration_seconds=1800,
                is_planned=False,
            ),
            DowntimeEvent(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                machine_id=test_machine.id,
                category="OP-01",
                started_at=now - timedelta(hours=1),
                ended_at=now - timedelta(minutes=30),
                duration_seconds=600,
                is_planned=False,
            ),
        ]
        for e in events:
            db_session.add(e)
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/lines/{test_line.id}/downtime/pareto",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        durations = [item["duration_s"] for item in items]
        assert durations == sorted(durations, reverse=True)

    async def test_pareto_cumulative_pct(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_line,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc()
        events = [
            DowntimeEvent(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                machine_id=test_machine.id,
                category="A",
                started_at=now - timedelta(hours=4),
                ended_at=now - timedelta(hours=3),
                duration_seconds=3600,
                is_planned=False,
            ),
            DowntimeEvent(
                id=uuid.uuid4(),
                organization_id=test_org.id,
                machine_id=test_machine.id,
                category="B",
                started_at=now - timedelta(hours=3),
                ended_at=now - timedelta(hours=2),
                duration_seconds=3600,
                is_planned=False,
            ),
        ]
        for e in events:
            db_session.add(e)
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/lines/{test_line.id}/downtime/pareto",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        items = resp.json()["items"]
        assert len(items) == 2
        assert items[0]["pct"] == pytest.approx(0.5, abs=0.01)
        assert items[0]["cumulative_pct"] == pytest.approx(0.5, abs=0.01)
        assert items[1]["cumulative_pct"] == pytest.approx(1.0, abs=0.01)

    async def test_factory_level_pareto(
        self,
        async_client: AsyncClient,
        db_session,
        test_org,
        test_factory,
        test_line,
        test_machine,
        admin_token: str,
    ):
        now = _now_utc()
        event = DowntimeEvent(
            id=uuid.uuid4(),
            organization_id=test_org.id,
            machine_id=test_machine.id,
            category="ME-01",
            started_at=now - timedelta(hours=2),
            ended_at=now - timedelta(hours=1),
            duration_seconds=3600,
            is_planned=False,
        )
        db_session.add(event)
        await db_session.commit()

        resp = await async_client.get(
            f"/api/v1/downtime/pareto?factory_id={test_factory.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_duration_s"] == 3600
        assert body["items"][0]["category"] == "ME-01"
        assert body["items"][0]["cumulative_pct"] == pytest.approx(1.0, abs=0.01)

    async def test_factory_pareto_404_for_unknown(
        self, async_client: AsyncClient, admin_token: str
    ):
        resp = await async_client.get(
            f"/api/v1/downtime/pareto?factory_id={uuid.uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 404


class TestOEECalculatorUnit:
    async def test_availability_formula(self):
        from app.services.oee_calculator import OEEResult, _clamp

        run_time_s = 24480
        planned_time_s = 28800
        availability = _clamp(run_time_s / planned_time_s)
        assert availability == pytest.approx(0.85, abs=0.01)

    async def test_quality_formula(self):
        from app.services.oee_calculator import _clamp

        actual_qty = 440
        rejected_qty = 14
        good_qty = actual_qty - rejected_qty
        quality = _clamp(good_qty / actual_qty)
        assert quality == pytest.approx(0.9682, abs=0.001)

    async def test_performance_formula(self):
        from app.services.oee_calculator import _clamp

        ideal_cycle_time_s = 50.0
        actual_qty = 440
        run_time_s = 24480
        performance = _clamp((ideal_cycle_time_s * actual_qty) / run_time_s)
        assert performance == pytest.approx(0.898, abs=0.01)

    async def test_oee_product_formula(self):
        from app.services.oee_calculator import _clamp

        availability = 0.85
        performance = 0.90
        quality = 0.97
        oee = _clamp(availability * performance * quality)
        assert oee == pytest.approx(0.742, abs=0.01)

    async def test_clamp_caps_at_one(self):
        from app.services.oee_calculator import _clamp

        assert _clamp(1.5) == 1.0
        assert _clamp(-0.1) == 0.0
        assert _clamp(0.75) == pytest.approx(0.75)

    async def test_oee_none_when_no_actual_qty(self):
        actual_qty = 0
        quality = None if actual_qty == 0 else (actual_qty - 0) / actual_qty
        assert quality is None

    async def test_shift_planned_time_calculation(self):
        from datetime import time
        from unittest.mock import MagicMock

        from app.services.oee_calculator import _shift_planned_time_s

        shift = MagicMock()
        shift.start_time = time(6, 0)
        shift.end_time = time(14, 0)
        shift.planned_stops = [
            {"name": "Lunch", "duration_minutes": 30},
            {"name": "Break 1", "duration_minutes": 10},
            {"name": "Break 2", "duration_minutes": 10},
        ]
        planned_s = _shift_planned_time_s(shift)
        expected_s = (8 * 60 - 50) * 60
        assert planned_s == expected_s

    async def test_shift_planned_time_midnight_crossing(self):
        from datetime import time
        from unittest.mock import MagicMock

        from app.services.oee_calculator import _shift_planned_time_s

        shift = MagicMock()
        shift.start_time = time(22, 0)
        shift.end_time = time(6, 0)
        shift.planned_stops = [{"name": "Break", "duration_minutes": 30}]
        planned_s = _shift_planned_time_s(shift)
        expected_s = (8 * 60 - 30) * 60
        assert planned_s == expected_s

    async def test_compute_oee_integration(
        self,
        db_session,
        test_org,
        test_line,
        test_machine,
    ):
        from app.models.telemetry import MachineStatePeriod
        from app.services.oee_calculator import compute_oee

        now = _now_utc()
        period_start = now - timedelta(hours=1)
        period_end = now

        running_period = MachineStatePeriod(
            id=uuid.uuid4(),
            organization_id=test_org.id,
            machine_id=test_machine.id,
            state="running",
            started_at=period_start,
            ended_at=period_start + timedelta(minutes=45),
            duration_seconds=2700,
            source="telemetry",
        )
        fault_period = MachineStatePeriod(
            id=uuid.uuid4(),
            organization_id=test_org.id,
            machine_id=test_machine.id,
            state="fault",
            started_at=period_start + timedelta(minutes=45),
            ended_at=period_end,
            duration_seconds=900,
            source="telemetry",
        )
        db_session.add(running_period)
        db_session.add(fault_period)
        await db_session.commit()

        result = await compute_oee(
            db=db_session,
            machine_id=test_machine.id,
            org_id=test_org.id,
            period_start=period_start,
            period_end=period_end,
            granularity="hour",
        )

        assert result.run_time_s == 2700
        assert result.fault_time_s == 900
        assert result.availability is not None
        assert result.availability == pytest.approx(2700 / 3600, abs=0.01)
        assert result.quality is None
        assert result.performance is None
        assert result.oee is None

    async def test_compute_and_store_oee_upserts(
        self,
        db_session,
        test_org,
        test_line,
        test_machine,
    ):
        from sqlalchemy import select

        from app.models.oee import OEEAggregate
        from app.services.oee_calculator import compute_and_store_oee

        now = _now_utc()
        period_start = now - timedelta(hours=1)
        period_end = now

        await compute_and_store_oee(
            db=db_session,
            machine_id=test_machine.id,
            org_id=test_org.id,
            period_start=period_start,
            period_end=period_end,
            granularity="hour",
        )

        result = await db_session.execute(
            select(OEEAggregate).where(
                OEEAggregate.machine_id == test_machine.id,
                OEEAggregate.period_start == period_start,
                OEEAggregate.granularity == "hour",
            )
        )
        agg = result.scalar_one_or_none()
        assert agg is not None

        await compute_and_store_oee(
            db=db_session,
            machine_id=test_machine.id,
            org_id=test_org.id,
            period_start=period_start,
            period_end=period_end,
            granularity="hour",
        )

        result2 = await db_session.execute(
            select(OEEAggregate).where(
                OEEAggregate.machine_id == test_machine.id,
                OEEAggregate.period_start == period_start,
                OEEAggregate.granularity == "hour",
            )
        )
        aggs = result2.scalars().all()
        assert len(aggs) == 1
