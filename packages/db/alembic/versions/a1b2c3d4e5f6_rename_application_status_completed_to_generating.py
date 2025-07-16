"""rename application status COMPLETED to GENERATING

Revision ID: a1b2c3d4e5f6
Revises: 9e705a03c433
Create Date: 2025-07-16 08:53:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "9e705a03c433"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    op.execute("UPDATE grant_applications SET status = 'GENERATING' WHERE status = 'COMPLETED'")

    op.execute("ALTER TYPE applicationstatusenum RENAME VALUE 'COMPLETED' TO 'GENERATING'")


def downgrade() -> None:
    """Downgrade schema."""

    op.execute("UPDATE grant_applications SET status = 'COMPLETED' WHERE status = 'GENERATING'")

    op.execute("ALTER TYPE applicationstatusenum RENAME VALUE 'GENERATING' TO 'COMPLETED'")
