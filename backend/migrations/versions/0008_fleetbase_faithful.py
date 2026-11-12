"""0008 - Fleetbase faithful schema: places, tracking, payload/entity/waypoint,
proofs, fleets, service_areas/zones/rates, suppliers, PO, warehouse hierarchy,
batches. Extends fleet_vehicles and fleet_drivers with missing fields.
"""
from refinery import migration, op


@migration("0008")
def upgrade():
    op.execute("""
    -- ─── Places (reusable geocoded address book) ────────────────────────────────
    CREATE TABLE IF NOT EXISTS places (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        owner_id             UUID,
        owner_type           TEXT,
        name                 TEXT,
        type                 TEXT DEFAULT 'address',
        street1              TEXT,
        street2              TEXT,
        city                 TEXT,
        province             TEXT,
        postal_code          TEXT,
        neighborhood         TEXT,
        district             TEXT,
        building             TEXT,
        country              TEXT DEFAULT 'IN',
        security_access_code TEXT,
        lat                  NUMERIC(10,7),
        lng                  NUMERIC(10,7),
        phone                TEXT,
        meta                 JSONB DEFAULT '{}',
        slug                 TEXT,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_places_org ON places(organization_id);
    CREATE INDEX IF NOT EXISTS ix_places_lat_lng ON places(lat, lng) WHERE lat IS NOT NULL;

    -- ─── Tracking numbers ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS tracking_numbers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        sequence        BIGSERIAL,
        tracking_number TEXT NOT NULL,
        barcode         TEXT,
        qr_code         TEXT,
        region          TEXT DEFAULT 'IN',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, tracking_number)
    );
    CREATE INDEX IF NOT EXISTS ix_tn_org ON tracking_numbers(organization_id);

    -- ─── Proofs (photo/signature/barcode at delivery) ────────────────────────────
    CREATE TABLE IF NOT EXISTS proofs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        order_id        UUID,
        driver_id       UUID REFERENCES fleet_drivers(id),
        type            TEXT NOT NULL DEFAULT 'photo'
                            CHECK (type IN ('photo','signature','barcode','qr_code','pin')),
        file_url        TEXT,
        signature_data  TEXT,
        notes           TEXT,
        lat             NUMERIC(10,7),
        lng             NUMERIC(10,7),
        captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_proofs_org ON proofs(organization_id);

    -- ─── Tracking statuses (full log per tracking_number) ───────────────────────
    CREATE TABLE IF NOT EXISTS tracking_statuses (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        tracking_number_id  UUID REFERENCES tracking_numbers(id) ON DELETE CASCADE,
        order_id            UUID REFERENCES fleet_delivery_orders(id) ON DELETE CASCADE,
        proof_id            UUID REFERENCES proofs(id),
        status              TEXT NOT NULL,
        code                TEXT NOT NULL,
        details             TEXT,
        city                TEXT,
        province            TEXT,
        postal_code         TEXT,
        country             TEXT DEFAULT 'IN',
        lat                 NUMERIC(10,7),
        lng                 NUMERIC(10,7),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_ts_order ON tracking_statuses(order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS ix_ts_tn ON tracking_statuses(tracking_number_id, created_at DESC);

    -- ─── Payloads (what's being transported, links order→entities→waypoints) ─────
    CREATE TABLE IF NOT EXISTS payloads (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        pickup_place_id      UUID REFERENCES places(id),
        dropoff_place_id     UUID REFERENCES places(id),
        return_place_id      UUID REFERENCES places(id),
        current_waypoint_id  UUID,
        payment_method       TEXT DEFAULT 'account',
        cod_amount           NUMERIC(14,2),
        cod_currency         TEXT DEFAULT 'INR',
        cod_payment_method   TEXT,
        type                 TEXT DEFAULT 'default',
        meta                 JSONB DEFAULT '{}',
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_payloads_org ON payloads(organization_id);

    -- ─── Waypoints (multi-stop per payload) ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS waypoints (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payload_id      UUID NOT NULL REFERENCES payloads(id) ON DELETE CASCADE,
        place_id        UUID REFERENCES places(id),
        sequence        INTEGER NOT NULL DEFAULT 0,
        status          TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','arrived','completed','skipped')),
        arrived_at      TIMESTAMPTZ,
        completed_at    TIMESTAMPTZ,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_waypoints_payload ON waypoints(payload_id, sequence);

    ALTER TABLE payloads ADD CONSTRAINT fk_payload_waypoint
        FOREIGN KEY (current_waypoint_id) REFERENCES waypoints(id) ON DELETE SET NULL;

    -- ─── Entities (cargo items on a payload, with barcode/QR/dims) ──────────────
    CREATE TABLE IF NOT EXISTS cargo_entities (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        payload_id          UUID REFERENCES payloads(id) ON DELETE CASCADE,
        tracking_number_id  UUID REFERENCES tracking_numbers(id),
        destination_place_id UUID REFERENCES places(id),
        internal_id         TEXT,
        name                TEXT NOT NULL,
        type                TEXT DEFAULT 'item',
        description         TEXT,
        currency            TEXT DEFAULT 'INR',
        barcode             TEXT,
        qr_code             TEXT,
        weight              NUMERIC(10,4),
        weight_unit         TEXT DEFAULT 'kg',
        length              NUMERIC(10,2),
        width               NUMERIC(10,2),
        height              NUMERIC(10,2),
        dimensions_unit     TEXT DEFAULT 'cm',
        declared_value      NUMERIC(14,2),
        sku                 TEXT,
        price               NUMERIC(14,2),
        sale_price          NUMERIC(14,2),
        meta                JSONB DEFAULT '{}',
        slug                TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_ce_payload ON cargo_entities(payload_id);
    CREATE INDEX IF NOT EXISTS ix_ce_org ON cargo_entities(organization_id);
    CREATE UNIQUE INDEX IF NOT EXISTS ix_ce_barcode ON cargo_entities(organization_id, barcode)
        WHERE barcode IS NOT NULL;

    -- Link delivery orders to payload
    ALTER TABLE fleet_delivery_orders
        ADD COLUMN IF NOT EXISTS payload_id UUID REFERENCES payloads(id),
        ADD COLUMN IF NOT EXISTS tracking_number_id UUID REFERENCES tracking_numbers(id),
        ADD COLUMN IF NOT EXISTS pickup_place_id UUID REFERENCES places(id),
        ADD COLUMN IF NOT EXISTS dropoff_place_id UUID REFERENCES places(id),
        ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,3),
        ADD COLUMN IF NOT EXISTS pod_method TEXT DEFAULT 'photo'
                                CHECK (pod_method IN ('photo','signature','barcode','pin')),
        ADD COLUMN IF NOT EXISTS pod_required BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS adhoc BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'delivery',
        ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

    -- ─── Extend fleet_vehicles ───────────────────────────────────────────────────
    ALTER TABLE fleet_vehicles
        ADD COLUMN IF NOT EXISTS vin TEXT,
        ADD COLUMN IF NOT EXISTS vin_data JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS plate_number TEXT,
        ADD COLUMN IF NOT EXISTS trim TEXT,
        ADD COLUMN IF NOT EXISTS altitude NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS bearing NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS speed NUMERIC(8,2),
        ADD COLUMN IF NOT EXISTS online BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS telematics JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS slug TEXT;

    -- ─── Extend fleet_drivers ────────────────────────────────────────────────────
    ALTER TABLE fleet_drivers
        ADD COLUMN IF NOT EXISTS altitude NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS bearing NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS speed NUMERIC(8,2),
        ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7),
        ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7),
        ADD COLUMN IF NOT EXISTS online BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS auth_token TEXT,
        ADD COLUMN IF NOT EXISTS heading NUMERIC(6,2),
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN',
        ADD COLUMN IF NOT EXISTS avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.00,
        ADD COLUMN IF NOT EXISTS slug TEXT;

    -- ─── Fleet groups (named collections of drivers + vehicles) ──────────────────
    CREATE TABLE IF NOT EXISTS fleets (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        parent_fleet_id     UUID REFERENCES fleets(id),
        name                TEXT NOT NULL,
        color               TEXT DEFAULT '#3B82F6',
        task                TEXT,
        status              TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive')),
        slug                TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS fleet_driver_assignments (
        fleet_id  UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES fleet_drivers(id) ON DELETE CASCADE,
        PRIMARY KEY (fleet_id, driver_id)
    );
    CREATE TABLE IF NOT EXISTS fleet_vehicle_assignments (
        fleet_id   UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
        vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
        PRIMARY KEY (fleet_id, vehicle_id)
    );

    -- ─── Service areas + zones (geofenced regions) ───────────────────────────────
    CREATE TABLE IF NOT EXISTS service_areas (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        type            TEXT DEFAULT 'circle',
        border          JSONB DEFAULT '[]',
        status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_sa_org ON service_areas(organization_id);

    CREATE TABLE IF NOT EXISTS service_zones (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        service_area_id UUID REFERENCES service_areas(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        color           TEXT DEFAULT '#10B981',
        border          JSONB DEFAULT '[]',
        status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ─── Service rates + fees ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS service_rates (
        id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        service_area_id          UUID REFERENCES service_areas(id),
        zone_id                  UUID REFERENCES service_zones(id),
        service_name             TEXT NOT NULL,
        service_type             TEXT DEFAULT 'default',
        per_meter_flat_rate_fee  NUMERIC(14,4) DEFAULT 0,
        per_meter_unit           TEXT DEFAULT 'km',
        base_fee                 NUMERIC(14,2) DEFAULT 0,
        algorithm                TEXT DEFAULT 'flat',
        rate_calculation_method  TEXT DEFAULT 'per_meter',
        has_cod_fee              BOOLEAN DEFAULT FALSE,
        cod_flat_fee             NUMERIC(14,2) DEFAULT 0,
        cod_percent              NUMERIC(5,2) DEFAULT 0,
        has_peak_hours_fee       BOOLEAN DEFAULT FALSE,
        peak_hours_flat_fee      NUMERIC(14,2) DEFAULT 0,
        peak_hours_percent       NUMERIC(5,2) DEFAULT 0,
        peak_hours_start         TIME,
        peak_hours_end           TIME,
        currency                 TEXT DEFAULT 'INR',
        estimated_days           INTEGER DEFAULT 1,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS service_rate_fees (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_rate_id UUID NOT NULL REFERENCES service_rates(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        type            TEXT DEFAULT 'flat',
        calculation_method TEXT DEFAULT 'flat',
        amount          NUMERIC(14,2) DEFAULT 0,
        currency        TEXT DEFAULT 'INR',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ─── Suppliers ───────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS suppliers (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        place_id             UUID REFERENCES places(id),
        name                 TEXT NOT NULL,
        code                 TEXT,
        type                 TEXT DEFAULT 'vendor',
        contact_name         TEXT,
        email                TEXT,
        phone                TEXT,
        gstin                TEXT,
        pan                  TEXT,
        payment_terms_days   INTEGER DEFAULT 30,
        credit_limit         NUMERIC(14,2),
        currency             TEXT DEFAULT 'INR',
        status               TEXT NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','inactive','blacklisted')),
        notes                TEXT,
        meta                 JSONB DEFAULT '{}',
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, COALESCE(code, name))
    );
    CREATE INDEX IF NOT EXISTS ix_suppliers_org ON suppliers(organization_id);

    -- ─── Purchase orders ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id           UUID REFERENCES factories(id),
        supplier_id          UUID REFERENCES suppliers(id),
        po_number            TEXT NOT NULL,
        status               TEXT NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','sent','acknowledged','partial','received','cancelled')),
        order_date           DATE NOT NULL DEFAULT CURRENT_DATE,
        expected_delivery    DATE,
        currency             TEXT DEFAULT 'INR',
        total_value          NUMERIC(14,2) DEFAULT 0,
        tax_amount           NUMERIC(14,2) DEFAULT 0,
        discount_amount      NUMERIC(14,2) DEFAULT 0,
        notes                TEXT,
        payment_terms_days   INTEGER DEFAULT 30,
        created_by           UUID REFERENCES users(id),
        approved_by          UUID REFERENCES users(id),
        approved_at          TIMESTAMPTZ,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, po_number)
    );
    CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        item_id         UUID NOT NULL REFERENCES inventory_items(id),
        quantity        NUMERIC(14,4) NOT NULL,
        received_qty    NUMERIC(14,4) NOT NULL DEFAULT 0,
        unit_rate       NUMERIC(14,4) NOT NULL,
        tax_rate        NUMERIC(5,2) DEFAULT 0,
        total_amount    NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
        delivery_date   DATE,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ─── Extend inventory_items with Pallet/Entity fields ───────────────────────
    ALTER TABLE inventory_items
        ADD COLUMN IF NOT EXISTS sku TEXT,
        ADD COLUMN IF NOT EXISTS barcode TEXT,
        ADD COLUMN IF NOT EXISTS qr_code TEXT,
        ADD COLUMN IF NOT EXISTS weight NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg',
        ADD COLUMN IF NOT EXISTS length NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS width NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS height NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS dimensions_unit TEXT DEFAULT 'cm',
        ADD COLUMN IF NOT EXISTS declared_value NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS sale_price NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS bin_location TEXT,
        ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

    CREATE UNIQUE INDEX IF NOT EXISTS ix_inventory_sku
        ON inventory_items(organization_id, sku) WHERE sku IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ix_inventory_barcode
        ON inventory_items(organization_id, barcode) WHERE barcode IS NOT NULL;

    -- ─── Batches (Pallet batch/lot tracking) ────────────────────────────────────
    CREATE TABLE IF NOT EXISTS inventory_batches (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        item_id             UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        batch_number        TEXT NOT NULL,
        manufactured_at     DATE,
        expiry_at           DATE,
        quantity            NUMERIC(14,4) NOT NULL DEFAULT 0,
        status              TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','quarantine','expired','depleted')),
        supplier_id         UUID REFERENCES suppliers(id),
        notes               TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, item_id, batch_number)
    );
    CREATE INDEX IF NOT EXISTS ix_batches_item ON inventory_batches(item_id);

    -- Add batch + bin to stock_movements
    ALTER TABLE stock_movements
        ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES inventory_batches(id),
        ADD COLUMN IF NOT EXISTS bin_location TEXT,
        ADD COLUMN IF NOT EXISTS from_bin TEXT,
        ADD COLUMN IF NOT EXISTS to_bin TEXT;

    -- ─── Warehouse hierarchy: Section → Aisle → Rack → Bin ──────────────────────
    CREATE TABLE IF NOT EXISTS warehouse_sections (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        factory_id  UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        code        TEXT,
        notes       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS warehouse_aisles (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id  UUID NOT NULL REFERENCES warehouse_sections(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        code        TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS warehouse_racks (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        aisle_id    UUID NOT NULL REFERENCES warehouse_aisles(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        code        TEXT,
        max_weight_kg NUMERIC(10,2),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS warehouse_bins (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rack_id     UUID NOT NULL REFERENCES warehouse_racks(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        code        TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','occupied','reserved','blocked')),
        item_id     UUID REFERENCES inventory_items(id),
        batch_id    UUID REFERENCES inventory_batches(id),
        quantity    NUMERIC(14,4) DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_bins_rack ON warehouse_bins(rack_id);
    CREATE INDEX IF NOT EXISTS ix_bins_item ON warehouse_bins(item_id);
    """)


@migration("0008", direction="down")
def downgrade():
    op.execute("""
    DROP TABLE IF EXISTS warehouse_bins CASCADE;
    DROP TABLE IF EXISTS warehouse_racks CASCADE;
    DROP TABLE IF EXISTS warehouse_aisles CASCADE;
    DROP TABLE IF EXISTS warehouse_sections CASCADE;
    DROP TABLE IF EXISTS inventory_batches CASCADE;
    DROP TABLE IF EXISTS purchase_order_lines CASCADE;
    DROP TABLE IF EXISTS purchase_orders CASCADE;
    DROP TABLE IF EXISTS suppliers CASCADE;
    DROP TABLE IF EXISTS service_rate_fees CASCADE;
    DROP TABLE IF EXISTS service_rates CASCADE;
    DROP TABLE IF EXISTS service_zones CASCADE;
    DROP TABLE IF EXISTS service_areas CASCADE;
    DROP TABLE IF EXISTS fleet_vehicle_assignments CASCADE;
    DROP TABLE IF EXISTS fleet_driver_assignments CASCADE;
    DROP TABLE IF EXISTS fleets CASCADE;
    DROP TABLE IF EXISTS cargo_entities CASCADE;
    DROP TABLE IF EXISTS waypoints CASCADE;
    DROP TABLE IF EXISTS payloads CASCADE;
    DROP TABLE IF EXISTS tracking_statuses CASCADE;
    DROP TABLE IF EXISTS proofs CASCADE;
    DROP TABLE IF EXISTS tracking_numbers CASCADE;
    DROP TABLE IF EXISTS places CASCADE;
    """)
