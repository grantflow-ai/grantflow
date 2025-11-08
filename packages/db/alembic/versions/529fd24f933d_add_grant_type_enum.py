from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "529fd24f933d"
down_revision: str | None = "b46a477cc352"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    grant_type_enum = sa.Enum("RESEARCH", "TRANSLATIONAL", name="granttype")
    grant_type_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "grant_templates",
        sa.Column("grant_type", grant_type_enum, nullable=True),
    )

    op.execute("UPDATE grant_templates SET grant_type = 'RESEARCH' WHERE grant_type IS NULL")

    op.alter_column("grant_templates", "grant_type", nullable=False)


def downgrade() -> None:
    op.drop_column("grant_templates", "grant_type")

    grant_type_enum = sa.Enum("RESEARCH", "TRANSLATIONAL", name="granttype")
    grant_type_enum.drop(op.get_bind(), checkfirst=True)
