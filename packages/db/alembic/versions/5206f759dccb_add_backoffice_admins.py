from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5206f759dccb"
down_revision: str | None = "0fdc096cce8b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "backoffice_admins",
        sa.Column("firebase_uid", sa.String(length=128), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("granted_by_firebase_uid", sa.String(length=128), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_backoffice_admins_created_at"), "backoffice_admins", ["created_at"], unique=False)
    op.create_index(op.f("ix_backoffice_admins_deleted_at"), "backoffice_admins", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_backoffice_admins_email"), "backoffice_admins", ["email"], unique=True)
    op.create_index(op.f("ix_backoffice_admins_firebase_uid"), "backoffice_admins", ["firebase_uid"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_backoffice_admins_firebase_uid"), table_name="backoffice_admins")
    op.drop_index(op.f("ix_backoffice_admins_email"), table_name="backoffice_admins")
    op.drop_index(op.f("ix_backoffice_admins_deleted_at"), table_name="backoffice_admins")
    op.drop_index(op.f("ix_backoffice_admins_created_at"), table_name="backoffice_admins")
    op.drop_table("backoffice_admins")
