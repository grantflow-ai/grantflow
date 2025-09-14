from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e810e7122a0d"
down_revision: str | None = "a1c898f24cb9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("grant_templates", sa.Column("cfp_section_analysis", sa.JSON(), nullable=True))
    op.add_column("grant_templates", sa.Column("cfp_analysis_metadata", sa.JSON(), nullable=True))
    op.add_column("grant_templates", sa.Column("cfp_analyzed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("grant_templates", "cfp_analyzed_at")
    op.drop_column("grant_templates", "cfp_analysis_metadata")
    op.drop_column("grant_templates", "cfp_section_analysis")
