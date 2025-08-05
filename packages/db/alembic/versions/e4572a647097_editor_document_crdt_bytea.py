"""editor-document-crdt-bytea

Revision ID: e4572a647097
Revises: b3156e7b1d07
Create Date: 2025-08-05 21:50:13.518962

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e4572a647097"
down_revision: str | None = "b3156e7b1d07"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop and recreate the column to avoid type conversion issues
    op.drop_column("editor_documents", "crdt")
    op.add_column("editor_documents", sa.Column("crdt", sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Drop and recreate the column to avoid type conversion issues
    op.drop_column("editor_documents", "crdt")
    op.add_column("editor_documents", sa.Column("crdt", postgresql.JSON(astext_type=sa.Text()), nullable=True))
