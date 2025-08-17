"""

Revision ID: afdaf177fb87
Revises: 701e07131937
Create Date: 2025-07-23 09:36:05.633294

"""

from collections.abc import Sequence

from alembic import op

revision: str = "afdaf177fb87"
down_revision: str | None = "701e07131937"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f("uq_organization_name"), "organizations", type_="unique")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_unique_constraint(
        op.f("uq_organization_name"), "organizations", ["name"], postgresql_nulls_not_distinct=False
    )
