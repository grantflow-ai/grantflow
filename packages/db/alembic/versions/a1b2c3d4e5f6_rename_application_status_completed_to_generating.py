"""rename application status COMPLETED to GENERATING

Revision ID: a1b2c3d4e5f6
Revises: 9e705a03c433
Create Date: 2025-07-16 08:53:00.000000

"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import text

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "9e705a03c433"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    
    result = (
        op.get_bind()
        .execute(
            text(
                "SELECT 1 FROM pg_enum WHERE enumlabel = 'GENERATING' AND enumtypid = "
                "(SELECT oid FROM pg_type WHERE typname = 'applicationstatusenum')"
            )
        )
        .fetchone()
    )

    if not result:
        
        op.execute("COMMIT")
        op.execute("ALTER TYPE applicationstatusenum ADD VALUE 'GENERATING'")
        op.execute("BEGIN")

    
    op.execute("UPDATE grant_applications SET status = 'GENERATING' WHERE status = 'COMPLETED'")

    
    


def downgrade() -> None:
    """Downgrade schema."""
    
    op.execute("UPDATE grant_applications SET status = 'COMPLETED' WHERE status = 'GENERATING'")

    
