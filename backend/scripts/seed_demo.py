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

ORG_ID       = uuid.UUID("00000000-0000-0000-0000-000000000001")
FACTORY_ID   = uuid.UUID("00000000-0000-0000-0000-000000000002")
LINE_ID      = uuid.UUID("00000000-0000-0000-0000-000000000003")
LINE_B_ID    = uuid.UUID("00000000-0000-0000-0000-000000000004")

MACHINE_IDS = [
    uuid.UUID("10000000-0000-0000-0000-000000000001"),
    uuid.UUID("10000000-0000-0000-0000-000000000002"),
    uuid.UUID("10000000-0000-0000-0000-000000000003"),
    uuid.UUID("10000000-0000-0000-0000-000000000004"),
    uuid.UUID("10000000-0000-0000-0000-000000000005"),
    uuid.UUID("10000000-0000-0000-0000-000000000006"),
]

MACHINES = [
    {"id": MACHINE_IDS[0], "line": LINE_ID,   "name": "CNC Lathe #1",    "machine_type": "cnc_lathe",    "asset_tag": "MCH-001", "protocol": "simulated"},
    {"id": MACHINE_IDS[1], "line": LINE_ID,   "name": "Press Machine",   "machine_type": "press",         "asset_tag": "MCH-002", "protocol": "mqtt"},
    {"id": MACHINE_IDS[2], "line": LINE_ID,   "name": "Welding Robot",   "machine_type": "robot_welder",  "asset_tag": "MCH-003", "protocol": "opcua"},
    {"id": MACHINE_IDS[3], "line": LINE_ID,   "name": "QC Station",      "machine_type": "inspection",    "asset_tag": "MCH-004", "protocol": "simulated"},
    {"id": MACHINE_IDS[4], "line": LINE_B_ID, "name": "CNC Lathe #2",    "machine_type": "cnc_lathe",    "asset_tag": "MCH-005", "protocol": "simulated"},
    {"id": MACHINE_IDS[5], "line": LINE_B_ID, "name": "Assembly Robot",  "machine_type": "robot_welder",  "asset_tag": "MCH-006", "protocol": "opcua"},
]

PRODUCT_ID   = uuid.UUID("20000000-0000-0000-0000-000000000001")
PRODUCT_B_ID = uuid.UUID("20000000-0000-0000-0000-000000000002")
ADMIN_ID     = uuid.UUID("50000000-0000-0000-0000-000000000001")

SHIFT_MORNING_ID   = uuid.UUID("40000000-0000-0000-0000-000000000001")
SHIFT_AFTERNOON_ID = uuid.UUID("40000000-0000-0000-0000-000000000002")
SHIFT_NIGHT_ID     = uuid.UUID("40000000-0000-0000-0000-000000000003")

ORDER_IDS = [uuid.UUID(f"30000000-0000-0000-0000-{str(i).zfill(12)}") for i in range(1, 9)]


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

    for line in [
        {"id": LINE_ID,   "name": "Assembly Line A"},
        {"id": LINE_B_ID, "name": "Assembly Line B"},
    ]:
        await session.execute(text("""
            INSERT INTO production_lines (id, organization_id, factory_id, name)
            VALUES (:id, :org, :fac, :name)
            ON CONFLICT (id) DO NOTHING
        """), {"id": str(line["id"]), "org": str(ORG_ID), "fac": str(FACTORY_ID), "name": line["name"]})

    for m in MACHINES:
        await session.execute(text("""
            INSERT INTO machines
                (id, organization_id, line_id, name, machine_type, asset_tag, protocol, is_active)
            VALUES (:id, :org, :line, :name, :mtype, :tag, :protocol, TRUE)
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": str(m["id"]), "org": str(ORG_ID), "line": str(m["line"]),
            "name": m["name"], "mtype": m["machine_type"], "tag": m["asset_tag"],
            "protocol": m["protocol"],
        })

    for prod in [
        {"id": PRODUCT_ID,   "code": "AP-500", "name": "Auto Part 500 — Crankshaft Bracket", "cycle": 45.0},
        {"id": PRODUCT_B_ID, "code": "AP-720", "name": "Auto Part 720 — Gear Housing Cover",  "cycle": 60.0},
    ]:
        await session.execute(text("""
            INSERT INTO product_definitions
                (id, organization_id, product_code, name, ideal_cycle_time_seconds, unit)
            VALUES (:id, :org, :code, :name, :cycle, 'piece')
            ON CONFLICT (id) DO NOTHING
        """), {"id": str(prod["id"]), "org": str(ORG_ID), "code": prod["code"],
               "name": prod["name"], "cycle": prod["cycle"]})

    for shift in [
        {"id": SHIFT_MORNING_ID,   "name": "Morning Shift",   "start": "06:00", "end": "14:00", "days": "{1,2,3,4,5,6}"},
        {"id": SHIFT_AFTERNOON_ID, "name": "Afternoon Shift", "start": "14:00", "end": "22:00", "days": "{1,2,3,4,5,6}"},
        {"id": SHIFT_NIGHT_ID,     "name": "Night Shift",     "start": "22:00", "end": "06:00", "days": "{1,2,3,4,5}"},
    ]:
        await session.execute(text("""
            INSERT INTO shifts
                (id, organization_id, factory_id, name, start_time, end_time,
                 days_of_week, is_active)
            VALUES (:id, :org, :fac, :name, :start, :end, :days, TRUE)
            ON CONFLICT (id) DO NOTHING
        """), {"id": str(shift["id"]), "org": str(ORG_ID), "fac": str(FACTORY_ID),
               "name": shift["name"], "start": shift["start"], "end": shift["end"],
               "days": shift["days"]})

    orders = [
        {
            "id": ORDER_IDS[0], "line": LINE_ID,   "prod": PRODUCT_ID,   "num": "ORD-2024-001",
            "code": "AP-500", "planned_qty": 500, "actual_qty": 312, "rejected_qty": 8,
            "status": "running",
            "pstart": now - timedelta(hours=6), "pend": now + timedelta(hours=2),
            "astart": now - timedelta(hours=4),
        },
        {
            "id": ORDER_IDS[1], "line": LINE_B_ID, "prod": PRODUCT_B_ID, "num": "ORD-2024-002",
            "code": "AP-720", "planned_qty": 300, "actual_qty": 285, "rejected_qty": 3,
            "status": "running",
            "pstart": now - timedelta(hours=4), "pend": now + timedelta(hours=4),
            "astart": now - timedelta(hours=3),
        },
        {
            "id": ORDER_IDS[2], "line": LINE_ID,   "prod": PRODUCT_ID,   "num": "ORD-2024-003",
            "code": "AP-500", "planned_qty": 400, "actual_qty": 0, "rejected_qty": 0,
            "status": "scheduled",
            "pstart": now + timedelta(hours=2), "pend": now + timedelta(hours=10),
            "astart": None,
        },
        {
            "id": ORDER_IDS[3], "line": LINE_B_ID, "prod": PRODUCT_B_ID, "num": "ORD-2024-004",
            "code": "AP-720", "planned_qty": 250, "actual_qty": 0, "rejected_qty": 0,
            "status": "scheduled",
            "pstart": now + timedelta(hours=4), "pend": now + timedelta(hours=12),
            "astart": None,
        },
        {
            "id": ORDER_IDS[4], "line": LINE_ID,   "prod": PRODUCT_ID,   "num": "ORD-2024-005",
            "code": "AP-500", "planned_qty": 450, "actual_qty": 180, "rejected_qty": 12,
            "status": "paused",
            "pstart": now - timedelta(hours=8), "pend": now + timedelta(hours=0),
            "astart": now - timedelta(hours=7),
        },
        {
            "id": ORDER_IDS[5], "line": LINE_B_ID, "prod": PRODUCT_B_ID, "num": "ORD-2024-006",
            "code": "AP-720", "planned_qty": 200, "actual_qty": 200, "rejected_qty": 2,
            "status": "completed",
            "pstart": now - timedelta(days=1, hours=4), "pend": now - timedelta(days=1),
            "astart": now - timedelta(days=1, hours=4),
        },
        {
            "id": ORDER_IDS[6], "line": LINE_ID,   "prod": PRODUCT_ID,   "num": "ORD-2024-007",
            "code": "AP-500", "planned_qty": 350, "actual_qty": 350, "rejected_qty": 5,
            "status": "completed",
            "pstart": now - timedelta(hours=16), "pend": now - timedelta(hours=8),
            "astart": now - timedelta(hours=15),
        },
        {
            "id": ORDER_IDS[7], "line": LINE_B_ID, "prod": PRODUCT_ID,   "num": "ORD-2024-008",
            "code": "AP-500", "planned_qty": 100, "actual_qty": 0, "rejected_qty": 0,
            "status": "cancelled",
            "pstart": now - timedelta(days=2), "pend": now - timedelta(days=1, hours=12),
            "astart": None,
        },
    ]

    for o in orders:
        await session.execute(text("""
            INSERT INTO production_orders
                (id, organization_id, line_id, product_id, order_number, product_code,
                 planned_qty, actual_qty, rejected_qty,
                 status, planned_start, planned_end, actual_start,
                 bom_ref, routing_ref, priority)
            VALUES (:id, :org, :line, :prod, :num, :code,
                    :planned_qty, :actual_qty, :rejected_qty,
                    :status, :pstart, :pend, :astart,
                    :bom_ref, :routing_ref, :priority)
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": str(o["id"]), "org": str(ORG_ID), "line": str(o["line"]),
            "prod": str(o["prod"]), "num": o["num"], "code": o["code"],
            "planned_qty": o["planned_qty"], "actual_qty": o["actual_qty"],
            "rejected_qty": o["rejected_qty"], "status": o["status"],
            "pstart": o["pstart"], "pend": o["pend"], "astart": o["astart"],
            "bom_ref": "BOM-AP500-001" if o["code"] == "AP-500" else "BOM-AP720-001",
            "routing_ref": "RTG-AP500-001" if o["code"] == "AP-500" else "RTG-AP720-001",
            "priority": 50,
        })

    hashed_pw = _hash_password("demo1234")
    admin_users = [
        {"id": ADMIN_ID,                                              "email": "admin@sunrise.com",      "name": "Demo Admin",   "role": "admin"},
        {"id": uuid.UUID("50000000-0000-0000-0000-000000000002"),     "email": "supervisor@sunrise.com", "name": "Ravi Singh",   "role": "supervisor"},
        {"id": uuid.UUID("50000000-0000-0000-0000-000000000003"),     "email": "operator@sunrise.com",   "name": "Meena Patel", "role": "operator"},
        {"id": uuid.UUID("50000000-0000-0000-0000-000000000004"),     "email": "manager@sunrise.com",    "name": "Deepak Kumar","role": "manager"},
    ]
    for u in admin_users:
        await session.execute(text("""
            INSERT INTO users (id, organization_id, email, name, hashed_password, role, is_active)
            VALUES (:id, :org, :email, :name, :pw, :role, TRUE)
            ON CONFLICT (id) DO NOTHING
        """), {"id": str(u["id"]), "org": str(ORG_ID), "email": u["email"],
               "name": u["name"], "pw": hashed_pw, "role": u["role"]})

    alert_rules = [
        {
            "id": uuid.UUID("60000000-0000-0000-0000-000000000001"),
            "name": "OEE Below Target",
            "event_type": "oee_below_target",
            "threshold": 65.0,
            "channel_type": "email",
            "channel_config": '{"recipients": ["admin@sunrise.com", "manager@sunrise.com"]}',
        },
        {
            "id": uuid.UUID("60000000-0000-0000-0000-000000000002"),
            "name": "Machine Fault Detected",
            "event_type": "machine_fault",
            "threshold": 1.0,
            "channel_type": "webhook",
            "channel_config": '{"url": "http://localhost:1880/webhook/erp/workorder"}',
        },
        {
            "id": uuid.UUID("60000000-0000-0000-0000-000000000003"),
            "name": "Downtime Exceeds 30 min",
            "event_type": "downtime_above_threshold",
            "threshold": 30.0,
            "channel_type": "email",
            "channel_config": '{"recipients": ["supervisor@sunrise.com"]}',
        },
        {
            "id": uuid.UUID("60000000-0000-0000-0000-000000000004"),
            "name": "Quality Below 95%",
            "event_type": "quality_below_threshold",
            "threshold": 95.0,
            "channel_type": "email",
            "channel_config": '{"recipients": ["manager@sunrise.com"]}',
        },
    ]
    for r in alert_rules:
        await session.execute(text("""
            INSERT INTO alert_rules
                (id, organization_id, name, event_type, threshold, channel_type, channel_config, enabled)
            VALUES (:id, :org, :name, :event_type, :threshold, :channel_type, :channel_config::jsonb, TRUE)
            ON CONFLICT (id) DO NOTHING
        """), {"id": str(r["id"]), "org": str(ORG_ID), "name": r["name"],
               "event_type": r["event_type"], "threshold": r["threshold"],
               "channel_type": r["channel_type"], "channel_config": r["channel_config"]})

    bom_lines = [
        {"product": PRODUCT_ID,   "bom_ref": "BOM-AP500-001", "line_num": 1,  "code": "STL-ROD-25",   "name": "Steel Rod 25mm",         "qty": "2.000", "unit": "piece", "critical": True},
        {"product": PRODUCT_ID,   "bom_ref": "BOM-AP500-001", "line_num": 2,  "code": "BRG-6205",     "name": "Bearing 6205-ZZ",         "qty": "4.000", "unit": "piece", "critical": True},
        {"product": PRODUCT_ID,   "bom_ref": "BOM-AP500-001", "line_num": 3,  "code": "BOLT-M12-50",  "name": "Hex Bolt M12×50",         "qty": "8.000", "unit": "piece", "critical": False},
        {"product": PRODUCT_ID,   "bom_ref": "BOM-AP500-001", "line_num": 4,  "code": "SEAL-NBR-30",  "name": "NBR Oil Seal 30mm",       "qty": "2.000", "unit": "piece", "critical": False},
        {"product": PRODUCT_B_ID, "bom_ref": "BOM-AP720-001", "line_num": 1,  "code": "ALUM-PLATE-5", "name": "Aluminium Plate 5mm",     "qty": "1.500", "unit": "kg",    "critical": True},
        {"product": PRODUCT_B_ID, "bom_ref": "BOM-AP720-001", "line_num": 2,  "code": "GEAR-SPUR-M2", "name": "Spur Gear Module 2",      "qty": "1.000", "unit": "piece", "critical": True},
        {"product": PRODUCT_B_ID, "bom_ref": "BOM-AP720-001", "line_num": 3,  "code": "SCREW-M8-20",  "name": "Cap Screw M8×20",         "qty": "6.000", "unit": "piece", "critical": False},
    ]
    for b in bom_lines:
        await session.execute(text("""
            INSERT INTO bom_lines
                (id, organization_id, product_id, bom_ref, line_number,
                 component_code, component_name, quantity, unit, is_critical)
            VALUES (:id, :org, :prod, :bom_ref, :line_num,
                    :code, :name, :qty, :unit, :critical)
            ON CONFLICT DO NOTHING
        """), {"id": str(uuid.uuid4()), "org": str(ORG_ID), "prod": str(b["product"]),
               "bom_ref": b["bom_ref"], "line_num": b["line_num"],
               "code": b["code"], "name": b["name"],
               "qty": b["qty"], "unit": b["unit"], "critical": b["critical"]})

    routing_ops = [
        {"product": PRODUCT_ID,   "routing_ref": "RTG-AP500-001", "op_num": 10, "name": "Turning",          "work_center": "CNC-WC-01",  "machine_type": "cnc_lathe",   "setup": "15.00", "run": "0.7500"},
        {"product": PRODUCT_ID,   "routing_ref": "RTG-AP500-001", "op_num": 20, "name": "Pressing",         "work_center": "PRESS-WC-01","machine_type": "press",        "setup": "10.00", "run": "0.5000"},
        {"product": PRODUCT_ID,   "routing_ref": "RTG-AP500-001", "op_num": 30, "name": "Welding",          "work_center": "WELD-WC-01", "machine_type": "robot_welder", "setup": "20.00", "run": "0.3000"},
        {"product": PRODUCT_ID,   "routing_ref": "RTG-AP500-001", "op_num": 40, "name": "Quality Control",  "work_center": "QC-WC-01",   "machine_type": "inspection",   "setup": "5.00",  "run": "0.1500"},
        {"product": PRODUCT_B_ID, "routing_ref": "RTG-AP720-001", "op_num": 10, "name": "CNC Milling",      "work_center": "CNC-WC-02",  "machine_type": "cnc_lathe",   "setup": "20.00", "run": "1.0000"},
        {"product": PRODUCT_B_ID, "routing_ref": "RTG-AP720-001", "op_num": 20, "name": "Assembly",         "work_center": "ASSY-WC-01", "machine_type": "robot_welder", "setup": "15.00", "run": "0.5000"},
        {"product": PRODUCT_B_ID, "routing_ref": "RTG-AP720-001", "op_num": 30, "name": "Final Inspection",  "work_center": "QC-WC-02",   "machine_type": "inspection",   "setup": "5.00",  "run": "0.2000"},
    ]
    for op in routing_ops:
        await session.execute(text("""
            INSERT INTO routing_operations
                (id, organization_id, product_id, routing_ref, operation_number,
                 operation_name, work_center, machine_type,
                 setup_time_minutes, run_time_minutes_per_unit)
            VALUES (:id, :org, :prod, :routing_ref, :op_num,
                    :name, :work_center, :machine_type,
                    :setup, :run)
            ON CONFLICT DO NOTHING
        """), {"id": str(uuid.uuid4()), "org": str(ORG_ID), "prod": str(op["product"]),
               "routing_ref": op["routing_ref"], "op_num": op["op_num"],
               "name": op["name"], "work_center": op["work_center"],
               "machine_type": op["machine_type"],
               "setup": op["setup"], "run": op["run"]})

    oee_records = []
    for machine_id in MACHINE_IDS:
        for i in range(24):
            period_start = now - timedelta(hours=24 - i)
            period_end = period_start + timedelta(hours=1)
            random.seed(hash(str(machine_id)) + i)
            avail = round(random.uniform(0.65, 0.95), 4)
            perf  = round(random.uniform(0.70, 0.95), 4)
            qual  = round(random.uniform(0.90, 0.99), 4)
            oee   = round(avail * perf * qual, 4)
            good  = int(random.uniform(50, 72))
            rejected = int(good * (1 - qual))
            idle  = int((1 - avail) * 3600 * 0.6)
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

    downtime_categories = [
        "Mechanical Failure", "Setup & Changeover",
        "Material Shortage", "Quality Hold", "Operator Absence",
    ]
    for idx, machine_id in enumerate(MACHINE_IDS[:4]):
        started = now - timedelta(hours=3, minutes=idx * 30)
        ended = started + timedelta(minutes=20 + idx * 15)
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
            "order": str(ORDER_IDS[0]), "cat": downtime_categories[idx],
            "reason": f"Demo downtime — {downtime_categories[idx]}",
            "started": started, "ended": ended, "dur": dur,
        })

    machine_states = ["running", "running", "fault", "idle", "running", "idle"]
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
    print("Demo credentials (password: demo1234 for all users):")
    print("  admin@sunrise.com      — admin")
    print("  supervisor@sunrise.com — supervisor")
    print("  manager@sunrise.com    — manager")
    print("  operator@sunrise.com   — operator")
    print()
    print(f"Factory ID : {FACTORY_ID}")
    print(f"Line A ID  : {LINE_ID}")
    print(f"Line B ID  : {LINE_B_ID}")
    print()
    print("Production orders seeded:")
    statuses = ["running", "running", "scheduled", "scheduled", "paused", "completed", "completed", "cancelled"]
    for i, (oid, status) in enumerate(zip(ORDER_IDS, statuses)):
        print(f"  ORD-2024-{i+1:03d} → {status}")


async def main() -> None:
    async with SessionLocal() as session:
        await run(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
