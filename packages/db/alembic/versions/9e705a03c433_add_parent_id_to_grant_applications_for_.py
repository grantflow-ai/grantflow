"""add parent_id to grant_applications for forking model

Revision ID: 9e705a03c433
Revises: 389ad9aa95a0
Create Date: 2025-07-16 02:31:44.892012

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "9e705a03c433"
down_revision: str | None = "389ad9aa95a0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    
    op.add_column("grant_applications", sa.Column("parent_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_grant_applications_parent_id"), "grant_applications", ["parent_id"], unique=False)
    op.create_foreign_key(
        "fk_grant_applications_parent_id",
        "grant_applications",
        "grant_applications",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    


def downgrade() -> None:
    """Downgrade schema."""
    
    op.drop_constraint("fk_grant_applications_parent_id", "grant_applications", type_="foreignkey")
    op.drop_index(op.f("ix_grant_applications_parent_id"), table_name="grant_applications")
    op.drop_column("grant_applications", "parent_id")
    
