"""create user workspace invitations

Revision ID: 8a7b6c5d4e3f
Revises: f4a6a4d9bc01
Create Date: 2024-03-21 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "8a7b6c5d4e3f"
down_revision: str | None = "f4a6a4d9bc01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_workspace_invitations",
        sa.Column("id", postgresql.UUID(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("OWNER", "ADMIN", "MEMBER", name="userroleenum"), nullable=False),
        sa.Column("invitation_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_workspace_invitations_created_at"), "user_workspace_invitations", ["created_at"], unique=False
    )
    op.create_index(op.f("ix_user_workspace_invitations_email"), "user_workspace_invitations", ["email"], unique=False)
    op.create_index(
        op.f("ix_user_workspace_invitations_workspace_id"), "user_workspace_invitations", ["workspace_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_workspace_invitations_workspace_id"), table_name="user_workspace_invitations")
    op.drop_index(op.f("ix_user_workspace_invitations_email"), table_name="user_workspace_invitations")
    op.drop_index(op.f("ix_user_workspace_invitations_created_at"), table_name="user_workspace_invitations")
    op.drop_table("user_workspace_invitations")
