from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "82644dfa527c"
down_revision: str | None = "3fa14d45207c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("rag_sources", sa.Column("indexing_started_at", sa.DateTime(timezone=True), nullable=True))
    op.drop_constraint(op.f("rag_urls_url_key"), "rag_urls", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint(op.f("rag_urls_url_key"), "rag_urls", ["url"], postgresql_nulls_not_distinct=False)
    op.drop_column("rag_sources", "indexing_started_at")
