"""Fleet management: vehicles, drivers, delivery orders, live tracking.

Native equivalent of Fleetbase Fleet-Ops module.
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRole

router = APIRouter(prefix="/fleet", tags=["fleet"])


# ─── Vehicles ───────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    registration_number: str
    vehicle_type: str = "truck"
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    capacity_kg: Optional[float] = None
    capacity_m3: Optional[float] = None
    gps_device_id: Optional[str] = None
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    status: Optional[str] = None
    gps_device_id: Optional[str] = None
    notes: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class DriverCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    name: str
    phone: str
    license_number: str
    license_expiry: Optional[str] = None
    employee_id: Optional[str] = None


class DeliveryOrderCreate(BaseModel):
    factory_id: Optional[uuid.UUID] = None
    dispatch_challan_id: Optional[uuid.UUID] = None
    vehicle_id: Optional[uuid.UUID] = None
    driver_id: Optional[uuid.UUID] = None
    customer_name: str
    customer_phone: Optional[str] = None
    pickup_address: Optional[str] = None
    delivery_address: str
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None


class LocationUpdate(BaseModel):
    lat: float
    lng: float
    speed_kmh: Optional[float] = None
    heading: Optional[float] = None


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    pod_url: Optional[str] = None


@router.get("/vehicles")
async def list_vehicles(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id)}
    if status:
        filters.append("status = :status"); params["status"] = status

    rows = await db.execute(
        text(f"""
            SELECT v.id, v.registration_number, v.vehicle_type, v.make, v.model,
                   v.capacity_kg, v.status, v.current_lat, v.current_lng,
                   v.last_location_at, d.name AS assigned_driver
            FROM fleet_vehicles v
            LEFT JOIN fleet_drivers d ON d.id = v.current_driver_id
            WHERE {' AND '.join(filters)}
            ORDER BY v.registration_number
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    body: VehicleCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO fleet_vehicles
                (organization_id, factory_id, registration_number, vehicle_type,
                 make, model, year, capacity_kg, capacity_m3, gps_device_id, notes)
            VALUES
                (:org_id, :factory_id, :reg_no, :vtype,
                 :make, :model, :year, :cap_kg, :cap_m3, :gps_id, :notes)
            RETURNING id, registration_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "reg_no": body.registration_number.upper().strip(),
            "vtype": body.vehicle_type,
            "make": body.make, "model": body.model, "year": body.year,
            "cap_kg": body.capacity_kg, "cap_m3": body.capacity_m3,
            "gps_id": body.gps_device_id, "notes": body.notes,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "registration_number": row.registration_number}


@router.patch("/vehicles/{vehicle_id}/location")
async def update_vehicle_location(
    vehicle_id: uuid.UUID,
    body: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            UPDATE fleet_vehicles
            SET current_lat = :lat, current_lng = :lng,
                last_location_at = NOW(), updated_at = NOW()
            WHERE id = :id AND organization_id = :org_id
            RETURNING id
        """),
        {"lat": body.lat, "lng": body.lng, "id": str(vehicle_id),
         "org_id": str(current_user.organization_id)},
    )
    await db.execute(
        text("""
            INSERT INTO fleet_location_history
                (vehicle_id, lat, lng, speed_kmh, heading, recorded_at)
            VALUES (:vid, :lat, :lng, :speed, :heading, NOW())
        """),
        {"vid": str(vehicle_id), "lat": body.lat, "lng": body.lng,
         "speed": body.speed_kmh, "heading": body.heading},
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Vehicle not found")
    return {"ok": True}


# ─── Drivers ────────────────────────────────────────────────────────────────

@router.get("/drivers")
async def list_drivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT d.id, d.name, d.phone, d.license_number, d.license_expiry,
                   d.employee_id, d.status,
                   v.registration_number AS current_vehicle
            FROM fleet_drivers d
            LEFT JOIN fleet_vehicles v ON v.current_driver_id = d.id
            WHERE d.organization_id = :org_id
            ORDER BY d.name
        """),
        {"org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.post("/drivers", status_code=status.HTTP_201_CREATED)
async def create_driver(
    body: DriverCreate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            INSERT INTO fleet_drivers
                (organization_id, factory_id, name, phone, license_number,
                 license_expiry, employee_id)
            VALUES (:org_id, :factory_id, :name, :phone, :license_no, :expiry, :emp_id)
            RETURNING id, name
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "name": body.name, "phone": body.phone,
            "license_no": body.license_number,
            "expiry": body.license_expiry, "emp_id": body.employee_id,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "name": row.name}


# ─── Delivery Orders ─────────────────────────────────────────────────────────

@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_delivery_order(
    body: DeliveryOrderCreate,
    current_user: User = Depends(require_role(UserRole.supervisor)),
    db: AsyncSession = Depends(get_db),
):
    order_no = f"DO-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    result = await db.execute(
        text("""
            INSERT INTO fleet_delivery_orders
                (organization_id, factory_id, order_number, dispatch_challan_id,
                 vehicle_id, driver_id, customer_name, customer_phone,
                 pickup_address, delivery_address, scheduled_at, notes)
            VALUES
                (:org_id, :factory_id, :order_no, :challan_id,
                 :vehicle_id, :driver_id, :cust_name, :cust_phone,
                 :pickup, :delivery, :scheduled_at, :notes)
            RETURNING id, order_number
        """),
        {
            "org_id": str(current_user.organization_id),
            "factory_id": str(body.factory_id) if body.factory_id else None,
            "order_no": order_no,
            "challan_id": str(body.dispatch_challan_id) if body.dispatch_challan_id else None,
            "vehicle_id": str(body.vehicle_id) if body.vehicle_id else None,
            "driver_id": str(body.driver_id) if body.driver_id else None,
            "cust_name": body.customer_name, "cust_phone": body.customer_phone,
            "pickup": body.pickup_address, "delivery": body.delivery_address,
            "scheduled_at": body.scheduled_at, "notes": body.notes,
        },
    )
    await db.commit()
    row = result.fetchone()
    return {"id": str(row.id), "order_number": row.order_number}


@router.get("/orders")
async def list_delivery_orders(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = ["o.organization_id = :org_id"]
    params: dict = {"org_id": str(current_user.organization_id), "limit": limit}
    if status:
        filters.append("o.status = :status"); params["status"] = status

    rows = await db.execute(
        text(f"""
            SELECT o.id, o.order_number, o.customer_name, o.delivery_address,
                   o.status, o.scheduled_at, o.actual_delivery_at, o.pod_url,
                   v.registration_number AS vehicle, d.name AS driver
            FROM fleet_delivery_orders o
            LEFT JOIN fleet_vehicles v ON o.vehicle_id = v.id
            LEFT JOIN fleet_drivers d ON o.driver_id = d.id
            WHERE {' AND '.join(filters)}
            ORDER BY o.created_at DESC
            LIMIT :limit
        """),
        params,
    )
    return [dict(r._mapping) for r in rows.fetchall()]


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    body: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    valid = ("pending", "assigned", "picked_up", "in_transit", "delivered", "failed", "cancelled")
    if body.status not in valid:
        raise HTTPException(400, f"status must be one of {valid}")

    extra_sets = []
    params: dict = {
        "status": body.status, "notes": body.notes,
        "id": str(order_id), "org_id": str(current_user.organization_id),
    }
    if body.status == "delivered":
        extra_sets.append("actual_delivery_at = NOW()")
    if body.pod_url:
        extra_sets.append("pod_url = :pod_url"); params["pod_url"] = body.pod_url

    sets = ["status = :status", "notes = COALESCE(:notes, notes)", "updated_at = NOW()"] + extra_sets
    result = await db.execute(
        text(f"""
            UPDATE fleet_delivery_orders SET {', '.join(sets)}
            WHERE id = :id AND organization_id = :org_id
            RETURNING id
        """),
        params,
    )
    if body.status == "delivered" and result.fetchone():
        row2 = await db.execute(
            text("SELECT dispatch_challan_id FROM fleet_delivery_orders WHERE id = :id"),
            {"id": str(order_id)},
        )
        r = row2.fetchone()
        if r and r.dispatch_challan_id:
            await db.execute(
                text("""
                    UPDATE dispatch_challans
                    SET status = 'delivered', delivered_at = NOW(),
                        pod_url = :pod_url, updated_at = NOW()
                    WHERE id = :cid
                """),
                {"pod_url": body.pod_url, "cid": str(r.dispatch_challan_id)},
            )

    await db.commit()
    return {"ok": True}


@router.get("/orders/{order_id}/track")
async def track_delivery(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.execute(
        text("""
            SELECT o.*, v.registration_number, v.current_lat, v.current_lng,
                   v.last_location_at, d.name AS driver_name, d.phone AS driver_phone
            FROM fleet_delivery_orders o
            LEFT JOIN fleet_vehicles v ON o.vehicle_id = v.id
            LEFT JOIN fleet_drivers d ON o.driver_id = d.id
            WHERE o.id = :id AND o.organization_id = :org_id
        """),
        {"id": str(order_id), "org_id": str(current_user.organization_id)},
    )
    row = order.fetchone()
    if not row:
        raise HTTPException(404, "Order not found")
    return dict(row._mapping)


@router.get("/live-map")
async def live_fleet_map(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text("""
            SELECT v.id, v.registration_number, v.vehicle_type, v.status,
                   v.current_lat, v.current_lng, v.last_location_at,
                   d.name AS driver_name,
                   COUNT(o.id) FILTER (WHERE o.status = 'in_transit') AS active_orders
            FROM fleet_vehicles v
            LEFT JOIN fleet_drivers d ON v.current_driver_id = d.id
            LEFT JOIN fleet_delivery_orders o ON o.vehicle_id = v.id
            WHERE v.organization_id = :org_id
              AND v.current_lat IS NOT NULL
            GROUP BY v.id, d.name
            ORDER BY v.last_location_at DESC NULLS LAST
        """),
        {"org_id": str(current_user.organization_id)},
    )
    return [dict(r._mapping) for r in rows.fetchall()]


# ─── Fleetbase webhook receiver ─────────────────────────────────────────────

@router.post("/webhook/fleetbase", include_in_schema=False)
async def fleetbase_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    event = payload.get("event")
    data = payload.get("data", {})
    order_id = data.get("id")

    if not order_id:
        return {"ok": True}

    if event == "order.dispatched":
        await db.execute(
            text("""
                UPDATE fleet_delivery_orders SET status = 'in_transit', updated_at = NOW()
                WHERE fleetbase_order_id = :fid
            """),
            {"fid": order_id},
        )
    elif event == "order.completed":
        pod_url = data.get("proof_of_delivery_url")
        await db.execute(
            text("""
                UPDATE fleet_delivery_orders
                SET status = 'delivered', actual_delivery_at = NOW(),
                    pod_url = :pod, updated_at = NOW()
                WHERE fleetbase_order_id = :fid
            """),
            {"pod": pod_url, "fid": order_id},
        )
    elif event in ("order.cancelled", "order.failed"):
        await db.execute(
            text("""
                UPDATE fleet_delivery_orders SET status = :status, updated_at = NOW()
                WHERE fleetbase_order_id = :fid
            """),
            {"status": event.split(".")[1], "fid": order_id},
        )

    await db.commit()
    return {"ok": True}
