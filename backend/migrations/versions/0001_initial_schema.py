"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-11-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

    op.execute("""
        CREATE TABLE organizations (
            id              UUID PRIMARY KEY,
            name            TEXT NOT NULL,
            slug            TEXT UNIQUE NOT NULL,
            timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE factories (
            id              UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            name            TEXT NOT NULL,
            location        TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX idx_factories_org ON factories(organization_id);")

    op.execute("""
        CREATE TABLE production_lines (
            id              UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            factory_id      UUID NOT NULL REFERENCES factories(id),
            name            TEXT NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX idx_lines_factory ON production_lines(factory_id);")

    op.execute("""
        CREATE TABLE product_definitions (
            id                       UUID PRIMARY KEY,
            organization_id          UUID NOT NULL REFERENCES organizations(id),
            product_code             TEXT NOT NULL,
            name                     TEXT NOT NULL,
            ideal_cycle_time_seconds NUMERIC(10,3) NOT NULL,
            unit                     TEXT NOT NULL DEFAULT 'piece',
            is_active                BOOLEAN NOT NULL DEFAULT TRUE,
            created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (organization_id, product_code)
        );
    """)
    op.execute("CREATE INDEX idx_product_definitions_org ON product_definitions(organization_id);")

    op.execute("""
        CREATE TABLE machines (
            id                  UUID PRIMARY KEY,
            organization_id     UUID NOT NULL REFERENCES organizations(id),
            line_id             UUID NOT NULL REFERENCES production_lines(id),
            name                TEXT NOT NULL,
            machine_type        TEXT NOT NULL,
            asset_tag           TEXT,
            protocol            TEXT NOT NULL CHECK (protocol IN ('mqtt', 'opcua', 'simulated')),
            endpoint_config     JSONB,
            is_active           BOOLEAN NOT NULL DEFAULT TRUE,
            default_product_id  UUID REFERENCES product_definitions(id),
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX idx_machines_line ON machines(line_id);")
    op.execute("CREATE INDEX idx_machines_org ON machines(organization_id);")

    op.execute("""
        CREATE TABLE shifts (
            id              UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            factory_id      UUID NOT NULL REFERENCES factories(id),
            name            TEXT NOT NULL,
            start_time      TIME NOT NULL,
            end_time        TIME NOT NULL,
            days_of_week    INTEGER[] NOT NULL,
            planned_stops   JSONB NOT NULL DEFAULT '[]',
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX idx_shifts_factory ON shifts(factory_id);")

    op.execute("""
        CREATE TABLE users (
            id              UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            email           TEXT UNIQUE NOT NULL,
            name            TEXT NOT NULL,
            role            TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'supervisor', 'operator')),
            hashed_password TEXT NOT NULL,
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX idx_users_org ON users(organization_id);")
    op.execute("CREATE INDEX idx_users_email ON users(email);")

    op.execute("""
        CREATE TABLE refresh_tokens (
            id              UUID PRIMARY KEY,
            user_id         UUID NOT NULL REFERENCES users(id),
            token_hash      TEXT NOT NULL UNIQUE,
            expires_at      TIMESTAMPTZ NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at      TIMESTAMPTZ
        );
    """)
    op.execute("CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);")

    op.execute("""
        CREATE TABLE production_orders (
            id              UUID PRIMARY KEY,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            line_id         UUID NOT NULL REFERENCES production_lines(id),
            shift_id        UUID REFERENCES shifts(id),
            product_id      UUID REFERENCES product_definitions(id),
            order_number    TEXT NOT NULL,
            product_code    TEXT NOT NULL,
            planned_qty     INTEGER NOT NULL,
            actual_qty      INTEGER NOT NULL DEFAULT 0,
            rejected_qty    INTEGER NOT NULL DEFAULT 0,
            status          TEXT NOT NULL CHECK (status IN ('scheduled', 'running', 'paused', 'completed', 'cancelled')),
            planned_start   TIMESTAMPTZ NOT NULL,
            planned_end     TIMESTAMPTZ NOT NULL,
            actual_start    TIMESTAMPTZ,
            actual_end      TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX idx_orders_line_time ON production_orders(line_id, planned_start DESC);")
    op.execute("CREATE INDEX idx_orders_org ON production_orders(organization_id);")
    op.execute("""
        CREATE INDEX idx_orders_status ON production_orders(organization_id, status)
        WHERE status IN ('scheduled', 'running', 'paused');
    """)

    op.execute("""
        CREATE TABLE machine_events (
            event_id        UUID NOT NULL,
            organization_id UUID NOT NULL,
            machine_id      UUID NOT NULL REFERENCES machines(id),
            event_time      TIMESTAMPTZ NOT NULL,
            ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            event_type      TEXT NOT NULL,
            payload         JSONB NOT NULL,
            source_seq      BIGINT,
            gateway_id      TEXT NOT NULL,
            PRIMARY KEY (event_id, event_time)
        );
    """)
    op.execute("SELECT create_hypertable('machine_events', 'event_time', chunk_time_interval => INTERVAL '1 day');")
    op.execute("CREATE INDEX idx_events_machine_time ON machine_events(machine_id, event_time DESC);")
    op.execute("CREATE UNIQUE INDEX idx_events_dedup ON machine_events(event_id, event_time);")

    op.execute("""
        CREATE TABLE machine_state_periods (
            id              UUID NOT NULL,
            organization_id UUID NOT NULL,
            machine_id      UUID NOT NULL REFERENCES machines(id),
            state           TEXT NOT NULL CHECK (state IN ('running', 'idle', 'fault', 'offline')),
            started_at      TIMESTAMPTZ NOT NULL,
            ended_at        TIMESTAMPTZ,
            duration_seconds INTEGER,
            source          TEXT NOT NULL CHECK (source IN ('telemetry', 'manual')),
            PRIMARY KEY (id, started_at)
        );
    """)
    op.execute("SELECT create_hypertable('machine_state_periods', 'started_at', chunk_time_interval => INTERVAL '1 week');")
    op.execute("CREATE INDEX idx_state_machine_time ON machine_state_periods(machine_id, started_at DESC);")

    op.execute("""
        CREATE TABLE downtime_events (
            id              UUID NOT NULL,
            organization_id UUID NOT NULL,
            machine_id      UUID NOT NULL REFERENCES machines(id),
            order_id        UUID REFERENCES production_orders(id),
            category        TEXT NOT NULL,
            reason          TEXT,
            started_at      TIMESTAMPTZ NOT NULL,
            ended_at        TIMESTAMPTZ,
            duration_seconds INTEGER,
            logged_by       UUID REFERENCES users(id),
            is_planned      BOOLEAN NOT NULL DEFAULT FALSE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, started_at)
        );
    """)
    op.execute("SELECT create_hypertable('downtime_events', 'started_at', chunk_time_interval => INTERVAL '1 week');")
    op.execute("CREATE INDEX idx_downtime_machine_time ON downtime_events(machine_id, started_at DESC);")
    op.execute("CREATE INDEX idx_downtime_org_time ON downtime_events(organization_id, started_at DESC);")

    op.execute("""
        CREATE TABLE oee_aggregates (
            organization_id UUID NOT NULL,
            machine_id      UUID NOT NULL REFERENCES machines(id),
            period_start    TIMESTAMPTZ NOT NULL,
            period_end      TIMESTAMPTZ NOT NULL,
            granularity     TEXT NOT NULL CHECK (granularity IN ('hour', 'shift', 'day')),
            planned_time_s  INTEGER NOT NULL,
            run_time_s      INTEGER NOT NULL,
            idle_time_s     INTEGER NOT NULL,
            fault_time_s    INTEGER NOT NULL,
            planned_qty     INTEGER NOT NULL,
            actual_qty      INTEGER NOT NULL,
            rejected_qty    INTEGER NOT NULL,
            availability    NUMERIC(5,4),
            performance     NUMERIC(5,4),
            quality         NUMERIC(5,4),
            oee             NUMERIC(5,4),
            calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (machine_id, period_start, granularity)
        );
    """)
    op.execute("SELECT create_hypertable('oee_aggregates', 'period_start', chunk_time_interval => INTERVAL '1 month');")
    op.execute("CREATE INDEX idx_oee_machine_period ON oee_aggregates(machine_id, period_start DESC, granularity);")

    op.execute("""
        CREATE TABLE ai_investigations (
            id              UUID PRIMARY KEY,
            organization_id UUID NOT NULL,
            initiated_by    UUID REFERENCES users(id),
            temporal_run_id TEXT,
            question        TEXT NOT NULL,
            context_window  JSONB NOT NULL,
            result          JSONB,
            evidence        JSONB,
            status          TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
            model_provider  TEXT,
            model_id        TEXT,
            feedback        TEXT CHECK (feedback IN ('positive', 'negative', NULL)),
            feedback_comment TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at    TIMESTAMPTZ
        );
    """)
    op.execute("CREATE INDEX idx_investigations_org ON ai_investigations(organization_id, created_at DESC);")

    op.execute("""
        CREATE TABLE audit_log (
            id              UUID NOT NULL,
            organization_id UUID,
            user_id         UUID,
            action          TEXT NOT NULL,
            resource_type   TEXT NOT NULL,
            resource_id     UUID,
            request_id      TEXT,
            ip_address      INET,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, created_at)
        );
    """)
    op.execute("SELECT create_hypertable('audit_log', 'created_at', chunk_time_interval => INTERVAL '1 month');")
    op.execute("CREATE INDEX idx_audit_org_time ON audit_log(organization_id, created_at DESC);")
    op.execute("CREATE INDEX idx_audit_user_time ON audit_log(user_id, created_at DESC);")

    op.execute("""
        CREATE TABLE kafka_consumer_checkpoints (
            consumer_group   TEXT NOT NULL,
            topic            TEXT NOT NULL,
            partition        INTEGER NOT NULL,
            committed_offset BIGINT NOT NULL,
            updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (consumer_group, topic, partition)
        );
    """)

    op.execute("ALTER TABLE machine_events SET (timescaledb.compress, timescaledb.compress_segmentby = 'machine_id');")
    op.execute("SELECT add_compression_policy('machine_events', INTERVAL '7 days');")
    op.execute("ALTER TABLE machine_state_periods SET (timescaledb.compress, timescaledb.compress_segmentby = 'machine_id');")
    op.execute("SELECT add_compression_policy('machine_state_periods', INTERVAL '30 days');")
    op.execute("ALTER TABLE downtime_events SET (timescaledb.compress, timescaledb.compress_segmentby = 'machine_id');")
    op.execute("SELECT add_compression_policy('downtime_events', INTERVAL '30 days');")
    op.execute("ALTER TABLE audit_log SET (timescaledb.compress, timescaledb.compress_segmentby = 'organization_id');")
    op.execute("SELECT add_compression_policy('audit_log', INTERVAL '90 days');")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS kafka_consumer_checkpoints;")
    op.execute("DROP TABLE IF EXISTS audit_log;")
    op.execute("DROP TABLE IF EXISTS ai_investigations;")
    op.execute("DROP TABLE IF EXISTS oee_aggregates;")
    op.execute("DROP TABLE IF EXISTS downtime_events;")
    op.execute("DROP TABLE IF EXISTS machine_state_periods;")
    op.execute("DROP TABLE IF EXISTS machine_events;")
    op.execute("DROP TABLE IF EXISTS production_orders;")
    op.execute("DROP TABLE IF EXISTS refresh_tokens;")
    op.execute("DROP TABLE IF EXISTS users;")
    op.execute("DROP TABLE IF EXISTS shifts;")
    op.execute("DROP TABLE IF EXISTS machines;")
    op.execute("DROP TABLE IF EXISTS product_definitions;")
    op.execute("DROP TABLE IF EXISTS production_lines;")
    op.execute("DROP TABLE IF EXISTS factories;")
    op.execute("DROP TABLE IF EXISTS organizations;")
