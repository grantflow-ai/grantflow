"""add_scientific_analysis_to_rag_source

Revision ID: 81d79f23e2ab
Revises: 212e35358ac5
Create Date: 2025-11-30 12:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "81d79f23e2ab"
down_revision: str | None = "212e35358ac5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "rag_sources",
        sa.Column("scientific_analysis_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("rag_sources", "scientific_analysis_json")
