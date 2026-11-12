"""0007 - fleet vehicles/drivers/orders, warehouse pick lists/cycle counts, sales orders"""
from refinery import migration, op


@migration("0007")
def upgrade():
    op.execute("""
    CREATE TABLE IF NOT EXISTS fleet_vehicles (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id          UUID REFERENCES factories(id),
        registration_number TEXT NOT NULL,
        vehicle_type        TEXT NOT NULL DEFAULT 'truck',
        make                TEXT,
        model               TEXT,
        year                INTEGER,
        capacity_kg         NUMERIC(10,2),
        capacity_m3         NUMERIC(10,2),
        gps_device_id       TEXT,
        status              TEXT NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available','in_use','maintenance','retired')),
        current_lat         NUMERIC(10,7),
        current_lng         NUMERIC(10,7),
        last_location_at    TIMESTAMPTZ,
        current_driver_id   UUID,
        notes               TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, registration_number)
    );
    CREATE INDEX IF NOT EXISTS ix_fleet_vehicles_org ON fleet_vehicles(organization_id);

    CREATE TABLE IF NOT EXISTS fleet_drivers (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id          UUID REFERENCES factories(id),
        name                TEXT NOT NULL,
        phone               TEXT NOT NULL,
        license_number      TEXT NOT NULL,
        license_expiry      DATE,
        employee_id         TEXT,
        status              TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive','on_leave')),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_fleet_drivers_org ON fleet_drivers(organization_id);

    ALTER TABLE fleet_vehicles
        ADD CONSTRAINT fk_vehicle_driver
        FOREIGN KEY (current_driver_id) REFERENCES fleet_drivers(id)
        ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS fleet_location_history (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id      UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
        lat             NUMERIC(10,7) NOT NULL,
        lng             NUMERIC(10,7) NOT NULL,
        speed_kmh       NUMERIC(6,2),
        heading         NUMERIC(6,2),
        recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_fleet_loc_vehicle ON fleet_location_history(vehicle_id, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS fleet_delivery_orders (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id          UUID REFERENCES factories(id),
        order_number        TEXT NOT NULL,
        dispatch_challan_id UUID REFERENCES dispatch_challans(id),
        vehicle_id          UUID REFERENCES fleet_vehicles(id),
        driver_id           UUID REFERENCES fleet_drivers(id),
        customer_name       TEXT NOT NULL,
        customer_phone      TEXT,
        pickup_address      TEXT,
        delivery_address    TEXT NOT NULL,
        status              TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','assigned','picked_up','in_transit','delivered','failed','cancelled')),
        scheduled_at        TIMESTAMPTZ,
        actual_delivery_at  TIMESTAMPTZ,
        pod_url             TEXT,
        fleetbase_order_id  TEXT,
        notes               TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, order_number)
    );
    CREATE INDEX IF NOT EXISTS ix_fdo_org ON fleet_delivery_orders(organization_id);
    CREATE INDEX IF NOT EXISTS ix_fdo_status ON fleet_delivery_orders(status);

    CREATE TABLE IF NOT EXISTS warehouse_pick_lists (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id          UUID REFERENCES factories(id),
        pick_list_number    TEXT NOT NULL,
        reference_type      TEXT NOT NULL DEFAULT 'production_order',
        reference_id        UUID,
        dispatch_challan_id UUID REFERENCES dispatch_challans(id),
        status              TEXT NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','in_progress','completed','cancelled')),
        notes               TEXT,
        created_by          UUID REFERENCES users(id),
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, pick_list_number)
    );
    CREATE INDEX IF NOT EXISTS ix_wpl_org ON warehouse_pick_lists(organization_id);

    CREATE TABLE IF NOT EXISTS warehouse_pick_list_lines (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pick_list_id    UUID NOT NULL REFERENCES warehouse_pick_lists(id) ON DELETE CASCADE,
        item_id         UUID NOT NULL REFERENCES inventory_items(id),
        required_qty    NUMERIC(14,4) NOT NULL,
        picked_qty      NUMERIC(14,4) NOT NULL DEFAULT 0,
        bin_location    TEXT,
        picked_by       UUID REFERENCES users(id),
        picked_at       TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_wpll_pl ON warehouse_pick_list_lines(pick_list_id);

    CREATE TABLE IF NOT EXISTS warehouse_cycle_counts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id      UUID REFERENCES factories(id),
        count_number    TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
        notes           TEXT,
        created_by      UUID REFERENCES users(id),
        closed_at       TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, count_number)
    );
    CREATE INDEX IF NOT EXISTS ix_wcc_org ON warehouse_cycle_counts(organization_id);

    CREATE TABLE IF NOT EXISTS warehouse_cycle_count_lines (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cycle_count_id  UUID NOT NULL REFERENCES warehouse_cycle_counts(id) ON DELETE CASCADE,
        item_id         UUID NOT NULL REFERENCES inventory_items(id),
        system_qty      NUMERIC(14,4),
        counted_qty     NUMERIC(14,4),
        variance        NUMERIC(14,4),
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_wccl_cc ON warehouse_cycle_count_lines(cycle_count_id);

    CREATE TABLE IF NOT EXISTS sales_orders (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id          UUID REFERENCES factories(id),
        so_number           TEXT NOT NULL,
        customer_name       TEXT NOT NULL,
        customer_phone      TEXT,
        customer_email      TEXT,
        customer_address    TEXT,
        po_number           TEXT,
        delivery_date       DATE,
        status              TEXT NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','confirmed','in_production','ready','dispatched','delivered','cancelled')),
        priority            TEXT NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('low','normal','high','urgent')),
        total_value         NUMERIC(14,2) DEFAULT 0,
        notes               TEXT,
        created_by          UUID REFERENCES users(id),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, so_number)
    );
    CREATE INDEX IF NOT EXISTS ix_so_org ON sales_orders(organization_id);
    CREATE INDEX IF NOT EXISTS ix_so_status ON sales_orders(status);

    CREATE TABLE IF NOT EXISTS sales_order_lines (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        so_id           UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        item_id         UUID NOT NULL REFERENCES inventory_items(id),
        quantity        NUMERIC(14,4) NOT NULL,
        delivered_qty   NUMERIC(14,4) NOT NULL DEFAULT 0,
        unit_rate       NUMERIC(14,4),
        delivery_date   DATE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_sol_so ON sales_order_lines(so_id);
    """)


@migration("0007", direction="down")
def downgrade():
    op.execute("""
    DROP TABLE IF EXISTS sales_order_lines CASCADE;
    DROP TABLE IF EXISTS sales_orders CASCADE;
    DROP TABLE IF EXISTS warehouse_cycle_count_lines CASCADE;
    DROP TABLE IF EXISTS warehouse_cycle_counts CASCADE;
    DROP TABLE IF EXISTS warehouse_pick_list_lines CASCADE;
    DROP TABLE IF EXISTS warehouse_pick_lists CASCADE;
    DROP TABLE IF EXISTS fleet_delivery_orders CASCADE;
    DROP TABLE IF EXISTS fleet_location_history CASCADE;
    ALTER TABLE fleet_vehicles DROP CONSTRAINT IF EXISTS fk_vehicle_driver;
    DROP TABLE IF EXISTS fleet_drivers CASCADE;
    DROP TABLE IF EXISTS fleet_vehicles CASCADE;
    """)
