"""0009 Fleetbase gap models: contacts, vendors, fuel reports, issues, stock adjustments,
   vehicle devices, service quotes, warehouses, inventory batches API, route results."""
import sqlalchemy as sa
from alembic import op


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            place_id UUID REFERENCES places(id),
            name TEXT NOT NULL,
            title TEXT,
            email TEXT,
            phone TEXT,
            type TEXT DEFAULT 'customer',
            meta JSONB DEFAULT '{}',
            avatar_url TEXT,
            slug TEXT,
            internal_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
        CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

        CREATE TABLE IF NOT EXISTS vendors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            place_id UUID REFERENCES places(id),
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            website TEXT,
            type TEXT DEFAULT '3pl',
            status TEXT DEFAULT 'active',
            country TEXT DEFAULT 'IN',
            currency TEXT DEFAULT 'INR',
            logo_url TEXT,
            meta JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);

        CREATE TABLE IF NOT EXISTS vehicle_devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            vehicle_id UUID REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
            vendor_id UUID REFERENCES vendors(id),
            device_id TEXT NOT NULL,
            type TEXT DEFAULT 'gps',
            model TEXT,
            firmware TEXT,
            serial TEXT,
            status TEXT DEFAULT 'active',
            meta JSONB DEFAULT '{}',
            last_seen_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vehicle_devices_org ON vehicle_devices(organization_id);
        CREATE INDEX IF NOT EXISTS idx_vehicle_devices_vehicle ON vehicle_devices(vehicle_id);

        CREATE TABLE IF NOT EXISTS fuel_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            driver_id UUID REFERENCES fleet_drivers(id),
            vehicle_id UUID REFERENCES fleet_vehicles(id),
            odometer NUMERIC(12,2),
            lat NUMERIC(10,7),
            lng NUMERIC(10,7),
            amount NUMERIC(14,2),
            currency TEXT DEFAULT 'INR',
            volume NUMERIC(10,4),
            metric_unit TEXT DEFAULT 'liters',
            fuel_type TEXT DEFAULT 'diesel',
            notes TEXT,
            reported_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_fuel_reports_org ON fuel_reports(organization_id);
        CREATE INDEX IF NOT EXISTS idx_fuel_reports_vehicle ON fuel_reports(vehicle_id);

        CREATE TABLE IF NOT EXISTS fleet_issues (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            vehicle_id UUID REFERENCES fleet_vehicles(id),
            driver_id UUID REFERENCES fleet_drivers(id),
            reported_by UUID REFERENCES users(id),
            assigned_to UUID REFERENCES users(id),
            issue_number TEXT NOT NULL,
            type TEXT DEFAULT 'mechanical',
            report TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            odometer NUMERIC(12,2),
            lat NUMERIC(10,7),
            lng NUMERIC(10,7),
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_fleet_issues_org ON fleet_issues(organization_id);
        CREATE INDEX IF NOT EXISTS idx_fleet_issues_vehicle ON fleet_issues(vehicle_id);
        CREATE INDEX IF NOT EXISTS idx_fleet_issues_status ON fleet_issues(status);

        CREATE TABLE IF NOT EXISTS service_quotes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            payload_id UUID REFERENCES payloads(id),
            vendor_id UUID REFERENCES vendors(id),
            customer_id UUID REFERENCES contacts(id),
            quote_number TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            amount NUMERIC(14,2),
            currency TEXT DEFAULT 'INR',
            notes TEXT,
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_service_quotes_org ON service_quotes(organization_id);

        CREATE TABLE IF NOT EXISTS service_quote_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_id UUID NOT NULL REFERENCES service_quotes(id) ON DELETE CASCADE,
            service_rate_id UUID REFERENCES service_rates(id),
            description TEXT,
            amount NUMERIC(14,2),
            currency TEXT DEFAULT 'INR',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS purchase_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            order_id UUID REFERENCES fleet_delivery_orders(id),
            quote_id UUID REFERENCES service_quotes(id),
            customer_id UUID REFERENCES contacts(id),
            status TEXT DEFAULT 'pending',
            amount NUMERIC(14,2),
            currency TEXT DEFAULT 'INR',
            meta JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_purchase_rates_org ON purchase_rates(organization_id);

        CREATE TABLE IF NOT EXISTS route_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            order_id UUID REFERENCES fleet_delivery_orders(id),
            engine TEXT DEFAULT 'osrm',
            encoded_polyline TEXT,
            distance_m NUMERIC(12,2),
            duration_s NUMERIC(12,2),
            waypoints_sequence JSONB DEFAULT '[]',
            meta JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_route_results_order ON route_results(order_id);

        CREATE TABLE IF NOT EXISTS warehouses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            place_id UUID REFERENCES places(id),
            name TEXT NOT NULL,
            code TEXT,
            type TEXT DEFAULT 'standard',
            status TEXT DEFAULT 'active',
            meta JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id);

        CREATE TABLE IF NOT EXISTS warehouse_docks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
            dock_number TEXT NOT NULL,
            type TEXT DEFAULT 'inbound',
            status TEXT DEFAULT 'available',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_warehouse_docks_warehouse ON warehouse_docks(warehouse_id);

        CREATE TABLE IF NOT EXISTS stock_adjustments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id),
            item_id UUID NOT NULL REFERENCES inventory_items(id),
            created_by UUID REFERENCES users(id),
            approved_by UUID REFERENCES users(id),
            type TEXT DEFAULT 'manual',
            reason TEXT,
            before_quantity NUMERIC(14,4),
            after_quantity NUMERIC(14,4),
            quantity NUMERIC(14,4),
            approval_required BOOLEAN DEFAULT FALSE,
            approved_at TIMESTAMPTZ,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_stock_adjustments_org ON stock_adjustments(organization_id);
        CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item ON stock_adjustments(item_id);
    """)


def downgrade():
    op.execute("""
        DROP TABLE IF EXISTS stock_adjustments;
        DROP TABLE IF EXISTS warehouse_docks;
        DROP TABLE IF EXISTS warehouses;
        DROP TABLE IF EXISTS route_results;
        DROP TABLE IF EXISTS purchase_rates;
        DROP TABLE IF EXISTS service_quote_items;
        DROP TABLE IF EXISTS service_quotes;
        DROP TABLE IF EXISTS fleet_issues;
        DROP TABLE IF EXISTS fuel_reports;
        DROP TABLE IF EXISTS vehicle_devices;
        DROP TABLE IF EXISTS vendors;
        DROP TABLE IF EXISTS contacts;
    """)
