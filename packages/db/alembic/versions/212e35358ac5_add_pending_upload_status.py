"""add_pending_upload_status

Revision ID: 212e35358ac5
Revises: fb358c3d4d0e
Create Date: 2025-11-12 08:55:49.289752

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "212e35358ac5"
down_revision: str | None = "fb358c3d4d0e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add PENDING_UPLOAD to SourceIndexingStatusEnum before CREATED
    op.execute("ALTER TYPE sourceindexingstatusenum ADD VALUE IF NOT EXISTS 'PENDING_UPLOAD' BEFORE 'CREATED'")


def downgrade() -> None:
    """Downgrade schema."""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type and updating all dependent columns
