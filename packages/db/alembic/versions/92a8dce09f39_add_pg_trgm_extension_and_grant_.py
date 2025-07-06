"""Add pg_trgm extension and grant application indexes

Revision ID: 92a8dce09f39
Revises: 9320600ca6b3
Create Date: 2025-07-06 09:42:46.942246

"""

from collections.abc import Sequence

from alembic import op

revision: str = "92a8dce09f39"
down_revision: str | None = "9320600ca6b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_title_fts
        ON grant_applications
        USING gin(to_tsvector('english', title))
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_title_trgm
        ON grant_applications
        USING gin(title gin_trgm_ops)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_filtering
        ON grant_applications (project_id, status, updated_at DESC)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_created_at
        ON grant_applications (project_id, created_at DESC)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_title_sort
        ON grant_applications (project_id, title)
    """)


def downgrade() -> None:
    """Downgrade schema."""

    op.execute("DROP INDEX IF EXISTS idx_grant_applications_title_sort")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_created_at")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_filtering")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_title_trgm")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_title_fts")
