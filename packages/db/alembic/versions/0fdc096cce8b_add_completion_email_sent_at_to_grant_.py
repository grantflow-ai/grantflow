from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0fdc096cce8b"
down_revision: str | None = "13b87034ef39"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "grant_applications", sa.Column("completion_email_sent_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("grant_applications", "completion_email_sent_at")
