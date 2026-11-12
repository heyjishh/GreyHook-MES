"""add quality_inspections table

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-12 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quality_inspections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False),
        sa.Column("factory_id", UUID(as_uuid=True), nullable=True),
        sa.Column("machine_id", UUID(as_uuid=True), nullable=True),
        sa.Column("inspection_type", sa.String(64), nullable=False, server_default="visual"),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("result", sa.String(32), nullable=True),
        sa.Column("defect_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sample_size", sa.Integer(), nullable=True),
        sa.Column("inspector_id", UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_quality_inspections_org", "quality_inspections", ["organization_id"])
    op.create_index("ix_quality_inspections_factory", "quality_inspections", ["factory_id"])
    op.create_index("ix_quality_inspections_machine", "quality_inspections", ["machine_id"])
    op.create_index("ix_quality_inspections_status", "quality_inspections", ["status"])


def downgrade() -> None:
    op.drop_index("ix_quality_inspections_status", "quality_inspections")
    op.drop_index("ix_quality_inspections_machine", "quality_inspections")
    op.drop_index("ix_quality_inspections_factory", "quality_inspections")
    op.drop_index("ix_quality_inspections_org", "quality_inspections")
    op.drop_table("quality_inspections")
