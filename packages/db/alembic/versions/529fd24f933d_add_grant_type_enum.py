"""add-grant-type-enum

Revision ID: 529fd24f933d
Revises: b46a477cc352
Create Date: 2025-10-24 16:49:13.844315

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "529fd24f933d"
down_revision: str | None = "b46a477cc352"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first
    grant_type_enum = sa.Enum("RESEARCH", "TRANSLATIONAL", name="granttype")
    grant_type_enum.create(op.get_bind(), checkfirst=True)

    # Add the column as nullable first
    op.add_column(
        "grant_templates",
        sa.Column("grant_type", grant_type_enum, nullable=True),
    )

    # Set default value for existing rows (assuming RESEARCH as default)
    op.execute("UPDATE grant_templates SET grant_type = 'RESEARCH' WHERE grant_type IS NULL")

    # Make the column non-nullable
    op.alter_column("grant_templates", "grant_type", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the column first
    op.drop_column("grant_templates", "grant_type")

    # Then drop the enum type
    grant_type_enum = sa.Enum("RESEARCH", "TRANSLATIONAL", name="granttype")
    grant_type_enum.drop(op.get_bind(), checkfirst=True)
