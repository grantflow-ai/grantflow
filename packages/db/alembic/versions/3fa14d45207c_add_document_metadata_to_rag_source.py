from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3fa14d45207c"
down_revision: str | None = "7b54cb873ba4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("rag_sources", sa.Column("document_metadata", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("rag_sources", "document_metadata")
