from collections.abc import Sequence

revision: str = "b46a477cc352"
down_revision: str | None = "5206f759dccb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
