from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2155a12ad3de"
down_revision: str | None = "82644dfa527c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("rag_sources", sa.Column("parent_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_rag_sources_parent_id"), "rag_sources", ["parent_id"], unique=False)
    op.create_foreign_key(
        "fk_rag_sources_parent_id", "rag_sources", "rag_sources", ["parent_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    op.drop_constraint("fk_rag_sources_parent_id", "rag_sources", type_="foreignkey")
    op.drop_index(op.f("ix_rag_sources_parent_id"), table_name="rag_sources")
    op.drop_column("rag_sources", "parent_id")
