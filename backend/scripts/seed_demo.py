"""Seed the database with Sunrise Auto Parts demo data."""
import asyncio
import os
import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://greyhook:devpassword@localhost:5435/greyhook_mes",
)

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
FACTORY_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
LINE_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")

MACHINE_IDS = [
    uuid.UUID("10000000-0000-0000-0000-000000000001"),
    uuid.UUID("10000000-0000-0000-0000-000000000002"),
    uuid.UUID("10000000-0000-0000-0000-000000000003"),
    uuid.UUID("10000000-0000-0000-0000-000000000004"),
]

MACHINES = [
    {"id": MACHINE_IDS[0], "name": "CNC Lathe #1", "machine_type": "cnc_lathe", "asset_tag": "MCH-001"},
    {"id": MACHINE_IDS[1], "name": "Press Machine", "machine_type": "press", "asset_tag": "MCH-002"},
    {"id": MACHINE_IDS[2], "name": "Welding Robot", "machine_type": "robot_welder", "asset_tag": "MCH-003"},
    {"id": MACHINE_IDS[3], "name": "QC Station", "machine_type": "inspection", "asset_tag": "MCH-004"},
]

PRODUCT_ID = uuid.UUID("20000000-0000-0000-0000-000000000001")
ORDER_ID = uuid.UUID("30000000-0000-0000-0000-000000000001")
SHIFT_ID = uuid.UUID("40000000-0000-0000-0000-000000000001")
ADMIN_ID = uuid.UUID("50000000-0000-0000-0000-000000000001")


def _hash_password(password: str) -> str:
    from argon2 import PasswordHasher
    return PasswordHasher().hash(password)


async def run(session: AsyncSession) -> None:
    now = datetime.now(UTC)

    await session.execute(text("""
        INSERT INTO organizations (id, name, slug, timezone)
        VALUES (:id, :name, :slug, :tz)
        ON CONFLICT (id) DO NOTHING
    """), {"id": str(ORG_ID), "name": "Sunrise Auto Parts Ltd", "slug": "sunrise-auto", "tz": "Asia/Kolkata"})

    await session.execute(text("""
        INSERT INTO factories (id, organization_id, name, location)
        VALUES (:id, :org, :name, :loc)
        ON CONFLICT (id) DO NOTHING
    """), {"id": str(FACTORY_ID), "org": str(ORG_ID), "name": "Sunrise Plant 1", "loc": "Pune, Maharashtra"})

    await session.execute(text("""
        INSERT INTO production_lines (id, organization_id, factory_id, name)
        VALUES (:id, :org, :fac, :name)
        ON CONFLICT (id) DO NOTHING
    """), {"id": str(LINE_ID), "org": str(ORG_ID), "fac": str(FACTORY_ID), "name": "Assembly Line A"})

    for m in MACHINES:
        await session.execute(text("""
            INSERT INTO machines
                (id, organization_id, line_id, name, machine_type, asset_tag, protocol, is_active)
            VALUES (:id, :org, :line, :name, :mtype, :tag, 'simulated', TRUE)
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": str(m["id"]), "org": str(ORG_ID), "line": str(LINE_ID),
            "name": m["name"], "mtype": m["machine_type"], "tag": m["asset_tag"],
        })

    await session.execute(text("""
        INSERT INTO product_definitions
            (id, organization_id, product_code, name, ideal_cycle_time_seconds, unit)
        VALUES (:id, :org, :code, :name, :cycle, 'piece')
        ON CONFLICT (id) DO NOTHING
    """), {"id": str(PRODUCT_ID), "org": str(ORG_ID), "code": "AP-500", "name": "Auto Part 500", "cycle": 45.0})

    await session.execute(text("""
        INSERT INTO shifts
            (id, organization_id, factory_id, name, start_time, end_time,
             days_of_week, is_active)
        VALUES (:id, :org, :fac, :name, '08:00', '16:00', '{1,2,3,4,5}', TRUE)
        ON CONFLICT (id) DO NOTHING
    """), {"id": str(SHIFT_ID), "org": str(ORG_ID), "fac": str(FACTORY_ID), "name": "Morning Shift"})

    await session.execute(text("""
        INSERT INTO production_orders
            (id, organization_id, line_id, product_id, order_number, product_code,
             planned_qty, actual_qty, rejected_qty,
             status, planned_start, planned_end, actual_start)
        VALUES (:id, :org, :line, :prod, :num, 'AP-500', 500, 312, 8, 'running', :pstart, :pend, :astart)
        ON CONFLICT (id) DO NOTHING
    """), {
        "id": str(ORDER_ID), "org": str(ORG_ID), "line": str(LINE_ID),
        "prod": str(PRODUCT_ID), "num": "ORD-2024-001",
        "pstart": now - timedelta(hours=6),
        "pend": now + timedelta(hours=2),
        "astart": now - timedelta(hours=4),
    })

    hashed_pw = _hash_password("demo1234")
    await session.execute(text("""
        INSERT INTO users (id, organization_id, email, name, hashed_password, role, is_active)
        VALUES (:id, :org, :email, :name, :pw, 'admin', TRUE)
        ON CONFLICT (id) DO NOTHING
    """), {
        "id": str(ADMIN_ID), "org": str(ORG_ID),
        "email": "admin@sunrise.com", "name": "Demo Admin", "pw": hashed_pw,
    })

    oee_records = []
    for machine_id in MACHINE_IDS:
        for i in range(8):
            period_start = now - timedelta(hours=8 - i)
            period_end = period_start + timedelta(hours=1)
            random.seed(hash(str(machine_id)) + i)
            avail = round(random.uniform(0.70, 0.95), 4)
            perf = round(random.uniform(0.75, 0.95), 4)
            qual = round(random.uniform(0.90, 0.99), 4)
            oee = round(avail * perf * qual, 4)
            good = int(random.uniform(55, 72))
            rejected = int(good * (1 - qual))
            idle = int((1 - avail) * 3600 * 0.6)
            fault = int((1 - avail) * 3600 * 0.4)
            oee_records.append({
                "org": str(ORG_ID), "machine": str(machine_id),
                "gran": "hour", "start": period_start, "end": period_end,
                "planned": 3600, "run": int(avail * 3600),
                "idle": idle, "fault": fault,
                "planned_qty": 72, "actual_qty": good, "rejected_qty": rejected,
                "avail": avail, "perf": perf, "qual": qual, "oee": oee,
            })

    for r in oee_records:
        await session.execute(text("""
            INSERT INTO oee_aggregates
                (organization_id, machine_id,
                 granularity, period_start, period_end,
                 planned_time_s, run_time_s, idle_time_s, fault_time_s,
                 planned_qty, actual_qty, rejected_qty,
                 availability, performance, quality, oee)
            VALUES
                (:org, :machine,
                 :gran, :start, :end,
                 :planned, :run, :idle, :fault,
                 :planned_qty, :actual_qty, :rejected_qty,
                 :avail, :perf, :qual, :oee)
            ON CONFLICT (machine_id, period_start, granularity) DO NOTHING
        """), r)

    downtime_categories = ["Mechanical Failure", "Setup & Changeover", "Material Shortage", "Quality Hold"]
    for idx, machine_id in enumerate(MACHINE_IDS[:3]):
        started = now - timedelta(hours=2, minutes=idx * 20)
        ended = started + timedelta(minutes=25 + idx * 10)
        dur = int((ended - started).total_seconds())
        await session.execute(text("""
            INSERT INTO downtime_events
                (id, organization_id, machine_id, order_id, category, reason,
                 started_at, ended_at, duration_seconds, is_planned)
            VALUES
                (:id, :org, :machine, :order, :cat, :reason,
                 :started, :ended, :dur, FALSE)
            ON CONFLICT DO NOTHING
        """), {
            "id": str(uuid.uuid4()), "org": str(ORG_ID), "machine": str(machine_id),
            "order": str(ORDER_ID), "cat": downtime_categories[idx],
            "reason": f"Demo downtime event #{idx+1}",
            "started": started, "ended": ended, "dur": dur,
        })

    extra_users = [
        {"id": uuid.UUID("50000000-0000-0000-0000-000000000002"), "email": "supervisor@sunrise.com", "name": "Ravi Singh",   "role": "supervisor"},
        {"id": uuid.UUID("50000000-0000-0000-0000-000000000003"), "email": "operator@sunrise.com",   "name": "Meena Patel", "role": "operator"},
        {"id": uuid.UUID("50000000-0000-0000-0000-000000000004"), "email": "manager@sunrise.com",    "name": "Deepak Kumar","role": "manager"},
    ]
    for u in extra_users:
        await session.execute(text("""
            INSERT INTO users (id, organization_id, email, name, hashed_password, role, is_active)
            VALUES (:id, :org, :email, :name, :pw, :role, TRUE)
            ON CONFLICT (id) DO NOTHING
        """), {"id": str(u["id"]), "org": str(ORG_ID), "email": u["email"],
               "name": u["name"], "pw": hashed_pw, "role": u["role"]})

    machine_states = ["running", "running", "fault", "idle"]
    for idx, machine_id in enumerate(MACHINE_IDS):
        await session.execute(text("""
            INSERT INTO machine_state_periods
                (id, organization_id, machine_id, state, started_at, ended_at, source)
            VALUES (:id, :org, :machine, :state, :started, NULL, 'telemetry')
            ON CONFLICT DO NOTHING
        """), {
            "id": str(uuid.uuid4()), "org": str(ORG_ID), "machine": str(machine_id),
            "state": machine_states[idx],
            "started": now - timedelta(minutes=random.randint(5, 60)),
        })

    await session.commit()
    print("✓ Seed complete.")
    print()
    print("Demo credentials (password: demo1234 for all):")
    print("  admin@sunrise.com      — admin")
    print("  supervisor@sunrise.com — supervisor")
    print("  manager@sunrise.com    — manager")
    print("  operator@sunrise.com   — operator")
    print()
    print(f"Factory ID: {FACTORY_ID}")
    print(f"Line ID:    {LINE_ID}")


async def main() -> None:
    async with SessionLocal() as session:
        await run(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
