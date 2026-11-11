"""add alert_rules and shift_handover_reports tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-11 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alert_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("event_type", sa.Text, nullable=False),
        sa.Column("threshold", sa.Float, nullable=True),
        sa.Column("channel_type", sa.Text, nullable=False),
        sa.Column("channel_config", JSONB, nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_alert_rules_org", "alert_rules", ["organization_id"])

    op.create_table(
        "shift_handover_reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False),
        sa.Column("shift_name", sa.Text, nullable=False),
        sa.Column("shift_date", sa.Text, nullable=False),
        sa.Column("from_time", sa.Text, nullable=False),
        sa.Column("to_time", sa.Text, nullable=False),
        sa.Column("supervisor_name", sa.Text, nullable=False),
        sa.Column("production_target", sa.Integer, nullable=False, server_default="0"),
        sa.Column("production_actual", sa.Integer, nullable=False, server_default="0"),
        sa.Column("fpy_pct", sa.Float, nullable=False, server_default="0"),
        sa.Column("oee_pct", sa.Float, nullable=False, server_default="0"),
        sa.Column("downtime_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("open_ncrs", sa.Integer, nullable=False, server_default="0"),
        sa.Column("notes", sa.Text, nullable=False, server_default="''"),
        sa.Column("issues", JSONB, nullable=False, server_default="[]"),
        sa.Column("handover_items", JSONB, nullable=False, server_default="[]"),
        sa.Column("status", sa.Text, nullable=False, server_default="'submitted'"),
        sa.Column("submitted_by", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_shift_handover_org", "shift_handover_reports", ["organization_id"])
    op.create_index("idx_shift_handover_date", "shift_handover_reports", ["shift_date"])


def downgrade() -> None:
    op.drop_table("shift_handover_reports")
    op.drop_table("alert_rules")
