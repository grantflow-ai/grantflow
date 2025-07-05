"""Add users table with soft delete support

Revision ID: 595833849cdd
Revises: 9dbbdab85cde
Create Date: 2025-07-06 00:31:03.521089

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "595833849cdd"
down_revision: str | None = "9dbbdab85cde"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    
    op.create_table(
        "users",
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deletion_scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("preferences", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("firebase_uid"),
    )

    
    op.create_index(
        "idx_users_active", "users", ["firebase_uid"], unique=False, postgresql_where=sa.text("deleted_at IS NULL")
    )
    op.create_index("idx_users_deletion_scheduled", "users", ["deletion_scheduled_at"], unique=False)
    op.create_index(op.f("ix_users_created_at"), "users", ["created_at"], unique=False)
    op.create_index(op.f("ix_users_deleted_at"), "users", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)

    
    op.execute("""
        INSERT INTO users (firebase_uid, created_at, updated_at)
        SELECT DISTINCT firebase_uid, NOW(), NOW()
        FROM project_users
        WHERE firebase_uid NOT IN (SELECT firebase_uid FROM users)
    """)

    
    op.create_foreign_key(None, "project_users", "users", ["firebase_uid"], ["firebase_uid"], ondelete="CASCADE")


def downgrade() -> None:
    """Downgrade schema."""
    
    op.drop_constraint("project_users_firebase_uid_fkey", "project_users", type_="foreignkey")

    
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_deleted_at"), table_name="users")
    op.drop_index(op.f("ix_users_created_at"), table_name="users")
    op.drop_index("idx_users_deletion_scheduled", table_name="users")
    op.drop_index("idx_users_active", table_name="users", postgresql_where=sa.text("deleted_at IS NULL"))

    
    op.drop_table("users")
