"""add bom_lines and routing_operations tables; expand production_orders

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bom_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("product_definitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bom_ref", sa.Text, nullable=False),
        sa.Column("line_number", sa.Integer, nullable=False),
        sa.Column("component_code", sa.Text, nullable=False),
        sa.Column("component_name", sa.Text, nullable=False),
        sa.Column("quantity", sa.Numeric(12, 4), nullable=False),
        sa.Column("unit", sa.Text, nullable=False, server_default="piece"),
        sa.Column("is_critical", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_bom_lines_product_id", "bom_lines", ["product_id"])
    op.create_index("ix_bom_lines_bom_ref", "bom_lines", ["bom_ref"])

    op.create_table(
        "routing_operations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("product_definitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("routing_ref", sa.Text, nullable=False),
        sa.Column("operation_number", sa.Integer, nullable=False),
        sa.Column("operation_name", sa.Text, nullable=False),
        sa.Column("work_center", sa.Text, nullable=False),
        sa.Column("machine_type", sa.Text, nullable=True),
        sa.Column("setup_time_minutes", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("run_time_minutes_per_unit", sa.Numeric(8, 4), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_routing_operations_product_id", "routing_operations", ["product_id"])
    op.create_index("ix_routing_operations_routing_ref", "routing_operations", ["routing_ref"])

    op.add_column("production_orders", sa.Column("bom_ref", sa.Text, nullable=True))
    op.add_column("production_orders", sa.Column("routing_ref", sa.Text, nullable=True))
    op.add_column("production_orders", sa.Column("notes", sa.Text, nullable=True))
    op.add_column("production_orders", sa.Column("priority", sa.Integer, nullable=False, server_default="50"))


def downgrade() -> None:
    op.drop_column("production_orders", "priority")
    op.drop_column("production_orders", "notes")
    op.drop_column("production_orders", "routing_ref")
    op.drop_column("production_orders", "bom_ref")
    op.drop_index("ix_routing_operations_routing_ref", "routing_operations")
    op.drop_index("ix_routing_operations_product_id", "routing_operations")
    op.drop_table("routing_operations")
    op.drop_index("ix_bom_lines_bom_ref", "bom_lines")
    op.drop_index("ix_bom_lines_product_id", "bom_lines")
    op.drop_table("bom_lines")
