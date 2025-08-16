"""Remove unique constraint on project names

Revision ID: b22ffa3669e7
Revises: afdaf177fb87
Create Date: 2025-07-28 18:07:06.949801

"""

from collections.abc import Sequence

from alembic import op

revision: str = "b22ffa3669e7"
down_revision: str | None = "afdaf177fb87"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f("uq_project_org_name"), "projects", type_="unique")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_unique_constraint(
        op.f("uq_project_org_name"), "projects", ["organization_id", "name"], postgresql_nulls_not_distinct=False
    )
