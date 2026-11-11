"""add org_llm_configs table

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-11 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "org_llm_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("model_id", sa.Text(), nullable=False, server_default="claude-sonnet-4-6"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint("uq_org_provider", "org_llm_configs", ["organization_id", "provider"])
    op.create_index("idx_org_llm_configs_org", "org_llm_configs", ["organization_id"])


def downgrade() -> None:
    op.drop_index("idx_org_llm_configs_org", table_name="org_llm_configs")
    op.drop_constraint("uq_org_provider", "org_llm_configs", type_="unique")
    op.drop_table("org_llm_configs")
