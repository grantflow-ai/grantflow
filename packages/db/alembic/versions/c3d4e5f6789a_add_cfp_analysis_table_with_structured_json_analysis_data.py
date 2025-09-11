from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# ~keep revision identifiers, used by Alembic.
revision: str = "c3d4e5f6789a"
down_revision: str | None = "5130dc110c69"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cfp_analyses",
        sa.Column("grant_template_id", sa.UUID(), nullable=False),
        sa.Column("analysis_data", sa.JSON(), nullable=False),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["grant_template_id"], ["grant_templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("grant_template_id"),
    )
    op.create_index(op.f("ix_cfp_analyses_analyzed_at"), "cfp_analyses", ["analyzed_at"], unique=False)
    op.create_index(op.f("ix_cfp_analyses_created_at"), "cfp_analyses", ["created_at"], unique=False)
    op.create_index(op.f("ix_cfp_analyses_deleted_at"), "cfp_analyses", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_cfp_analyses_grant_template_id"), "cfp_analyses", ["grant_template_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_cfp_analyses_grant_template_id"), table_name="cfp_analyses")
    op.drop_index(op.f("ix_cfp_analyses_deleted_at"), table_name="cfp_analyses")
    op.drop_index(op.f("ix_cfp_analyses_created_at"), table_name="cfp_analyses")
    op.drop_index(op.f("ix_cfp_analyses_analyzed_at"), table_name="cfp_analyses")
    op.drop_table("cfp_analyses")
