"""add-description-to-application

Revision ID: 389ad9aa95a0
Revises: de55e0b9ba74
Create Date: 2025-07-12 11:23:56.973243

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "389ad9aa95a0"
down_revision: str | None = "de55e0b9ba74"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column("grant_applications", sa.Column("description", sa.Text(), nullable=True))
    op.drop_index(op.f("idx_grant_applications_created_at_desc"), table_name="grant_applications")
    op.drop_index(op.f("idx_grant_applications_filtering"), table_name="grant_applications")
    op.drop_index(op.f("idx_grant_applications_title_fts"), table_name="grant_applications", postgresql_using="gin")
    op.drop_index(op.f("idx_grant_applications_title_sort"), table_name="grant_applications")
    op.drop_index(op.f("idx_grant_applications_title_trgm"), table_name="grant_applications", postgresql_using="gin")


def downgrade() -> None:
    """Downgrade schema."""

    op.create_index(
        op.f("idx_grant_applications_title_trgm"), "grant_applications", ["title"], unique=False, postgresql_using="gin"
    )
    op.create_index(
        op.f("idx_grant_applications_title_sort"), "grant_applications", ["project_id", "title"], unique=False
    )
    op.create_index(
        op.f("idx_grant_applications_title_fts"),
        "grant_applications",
        [sa.literal_column("to_tsvector('english'::regconfig, title)")],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        op.f("idx_grant_applications_filtering"),
        "grant_applications",
        ["project_id", "status", sa.literal_column("updated_at DESC")],
        unique=False,
    )
    op.create_index(
        op.f("idx_grant_applications_created_at_desc"),
        "grant_applications",
        ["project_id", sa.literal_column("created_at DESC")],
        unique=False,
    )
    op.drop_column("grant_applications", "description")
