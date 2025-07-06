"""Add notifications table and schema

Revision ID: 9dbbdab85cde
Revises: d4dde705a6f3
Create Date: 2025-07-06 00:14:30.906685

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "9dbbdab85cde"
down_revision: str | None = "d4dde705a6f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    
    op.create_table(
        "notifications",
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column(
            "type", sa.Enum("DEADLINE", "INFO", "WARNING", "SUCCESS", name="notificationtypeenum"), nullable=False
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=False),
        sa.Column("dismissed", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_data", sa.JSON(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_notifications_user_active",
        "notifications",
        ["firebase_uid"],
        unique=False,
        postgresql_where=sa.text("dismissed = FALSE"),
    )
    op.create_index("idx_notifications_user_created", "notifications", ["firebase_uid", "created_at"], unique=False)
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)
    op.create_index(op.f("ix_notifications_firebase_uid"), "notifications", ["firebase_uid"], unique=False)
    op.create_index(op.f("ix_notifications_project_id"), "notifications", ["project_id"], unique=False)
    


def downgrade() -> None:
    """Downgrade schema."""
    
    op.drop_index(op.f("ix_notifications_project_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_firebase_uid"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index("idx_notifications_user_created", table_name="notifications")
    op.drop_index(
        "idx_notifications_user_active", table_name="notifications", postgresql_where=sa.text("dismissed = FALSE")
    )
    op.drop_table("notifications")
    
