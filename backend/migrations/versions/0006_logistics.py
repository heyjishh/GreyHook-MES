"""0006 - logistics: gate pass, inventory, GRN, dispatch challan, Fleetbase config"""
from refinery import migration, op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


@migration("0006")
def upgrade():
    op.execute("""
    CREATE TABLE IF NOT EXISTS gate_passes (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id      UUID REFERENCES factories(id),
        pass_number     TEXT NOT NULL,
        pass_type       TEXT NOT NULL CHECK (pass_type IN ('inbound','outbound')),
        status          TEXT NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','approved','rejected','closed')),
        vehicle_number  TEXT NOT NULL,
        vehicle_type    TEXT,
        driver_name     TEXT,
        driver_phone    TEXT,
        party_name      TEXT NOT NULL,
        party_type      TEXT NOT NULL CHECK (party_type IN ('supplier','customer','transporter','other')),
        material_desc   TEXT,
        gross_weight_kg NUMERIC(10,2),
        tare_weight_kg  NUMERIC(10,2),
        net_weight_kg   NUMERIC(10,2) GENERATED ALWAYS AS
                            (gross_weight_kg - COALESCE(tare_weight_kg, 0)) STORED,
        purpose         TEXT,
        security_note   TEXT,
        fleetbase_order_id TEXT,
        in_time         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        out_time        TIMESTAMPTZ,
        approved_by     UUID REFERENCES users(id),
        created_by      UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_gate_passes_org ON gate_passes(organization_id);
    CREATE INDEX IF NOT EXISTS ix_gate_passes_factory ON gate_passes(factory_id);
    CREATE UNIQUE INDEX IF NOT EXISTS ix_gate_passes_pass_number
        ON gate_passes(organization_id, pass_number);

    CREATE TABLE IF NOT EXISTS inventory_items (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id      UUID REFERENCES factories(id),
        item_code       TEXT NOT NULL,
        item_name       TEXT NOT NULL,
        item_type       TEXT NOT NULL DEFAULT 'raw_material'
                            CHECK (item_type IN ('raw_material','wip','finished_good','consumable','spare_part')),
        unit            TEXT NOT NULL DEFAULT 'pcs',
        reorder_level   NUMERIC(14,4) DEFAULT 0,
        reorder_qty     NUMERIC(14,4) DEFAULT 0,
        current_stock   NUMERIC(14,4) NOT NULL DEFAULT 0,
        valuation_rate  NUMERIC(14,4) DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, item_code)
    );
    CREATE INDEX IF NOT EXISTS ix_inventory_items_org ON inventory_items(organization_id);

    CREATE TABLE IF NOT EXISTS stock_movements (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id      UUID REFERENCES factories(id),
        item_id         UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        movement_type   TEXT NOT NULL
                            CHECK (movement_type IN ('grn','issue','return','dispatch','adjustment','transfer')),
        quantity        NUMERIC(14,4) NOT NULL,
        unit_rate       NUMERIC(14,4),
        reference_type  TEXT,
        reference_id    UUID,
        notes           TEXT,
        moved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_stock_movements_org ON stock_movements(organization_id);
    CREATE INDEX IF NOT EXISTS ix_stock_movements_item ON stock_movements(item_id);

    CREATE TABLE IF NOT EXISTS grn_headers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id      UUID REFERENCES factories(id),
        grn_number      TEXT NOT NULL,
        gate_pass_id    UUID REFERENCES gate_passes(id),
        supplier_name   TEXT NOT NULL,
        purchase_order_ref TEXT,
        invoice_number  TEXT,
        invoice_date    DATE,
        status          TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','accepted','rejected','partial')),
        notes           TEXT,
        received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        received_by     UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, grn_number)
    );
    CREATE INDEX IF NOT EXISTS ix_grn_headers_org ON grn_headers(organization_id);

    CREATE TABLE IF NOT EXISTS grn_lines (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        grn_id          UUID NOT NULL REFERENCES grn_headers(id) ON DELETE CASCADE,
        item_id         UUID NOT NULL REFERENCES inventory_items(id),
        ordered_qty     NUMERIC(14,4),
        received_qty    NUMERIC(14,4) NOT NULL,
        accepted_qty    NUMERIC(14,4),
        rejected_qty    NUMERIC(14,4),
        unit_rate       NUMERIC(14,4),
        batch_number    TEXT,
        expiry_date     DATE,
        qc_status       TEXT DEFAULT 'pending' CHECK (qc_status IN ('pending','passed','failed')),
        qc_notes        TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_grn_lines_grn ON grn_lines(grn_id);

    CREATE TABLE IF NOT EXISTS dispatch_challans (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        factory_id      UUID REFERENCES factories(id),
        challan_number  TEXT NOT NULL,
        gate_pass_id    UUID REFERENCES gate_passes(id),
        customer_name   TEXT NOT NULL,
        customer_address TEXT,
        sales_order_ref TEXT,
        vehicle_number  TEXT,
        transporter     TEXT,
        lr_number       TEXT,
        eway_bill_number TEXT,
        dispatch_date   DATE NOT NULL DEFAULT CURRENT_DATE,
        status          TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','dispatched','delivered','cancelled')),
        total_weight_kg NUMERIC(10,2),
        notes           TEXT,
        fleetbase_order_id TEXT,
        delivered_at    TIMESTAMPTZ,
        pod_url         TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (organization_id, challan_number)
    );
    CREATE INDEX IF NOT EXISTS ix_dispatch_challans_org ON dispatch_challans(organization_id);

    CREATE TABLE IF NOT EXISTS dispatch_challan_lines (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challan_id      UUID NOT NULL REFERENCES dispatch_challans(id) ON DELETE CASCADE,
        item_id         UUID NOT NULL REFERENCES inventory_items(id),
        quantity        NUMERIC(14,4) NOT NULL,
        unit            TEXT,
        unit_rate       NUMERIC(14,4),
        batch_number    TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ix_dispatch_lines_challan ON dispatch_challan_lines(challan_id);

    CREATE TABLE IF NOT EXISTS fleetbase_configs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
        api_base_url    TEXT NOT NULL DEFAULT 'https://api.fleetbase.io',
        api_key_encrypted TEXT,
        webhook_secret  TEXT,
        is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
        sync_dispatches BOOLEAN NOT NULL DEFAULT TRUE,
        sync_deliveries BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)


@migration("0006", direction="down")
def downgrade():
    op.execute("""
    DROP TABLE IF EXISTS fleetbase_configs CASCADE;
    DROP TABLE IF EXISTS dispatch_challan_lines CASCADE;
    DROP TABLE IF EXISTS dispatch_challans CASCADE;
    DROP TABLE IF EXISTS grn_lines CASCADE;
    DROP TABLE IF EXISTS grn_headers CASCADE;
    DROP TABLE IF EXISTS stock_movements CASCADE;
    DROP TABLE IF EXISTS inventory_items CASCADE;
    DROP TABLE IF EXISTS gate_passes CASCADE;
    """)
