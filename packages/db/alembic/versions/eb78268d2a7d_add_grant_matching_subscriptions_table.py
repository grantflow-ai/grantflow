from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "eb78268d2a7d"
down_revision: str | None = "ddfb311c3018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "grant_matching_subscriptions",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("search_params", sa.JSON(), nullable=False),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("verification_token", sa.String(length=64), nullable=True),
        sa.Column("last_notification_sent", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unsubscribed", sa.Boolean(), nullable=False),
        sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("frequency IN ('daily', 'weekly', 'monthly')", name="check_subscription_frequency"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("verification_token"),
    )
    op.create_index(
        "ix_grant_matching_subs_email_verified", "grant_matching_subscriptions", ["email", "verified"], unique=False
    )
    op.create_index(
        "ix_grant_matching_subs_verified_frequency",
        "grant_matching_subscriptions",
        ["verified", "frequency"],
        unique=False,
    )
    op.create_index(
        op.f("ix_grant_matching_subscriptions_created_at"), "grant_matching_subscriptions", ["created_at"], unique=False
    )
    op.create_index(
        op.f("ix_grant_matching_subscriptions_deleted_at"), "grant_matching_subscriptions", ["deleted_at"], unique=False
    )
    op.create_index(
        op.f("ix_grant_matching_subscriptions_email"), "grant_matching_subscriptions", ["email"], unique=False
    )
    op.create_index(
        op.f("ix_grant_matching_subscriptions_verified"), "grant_matching_subscriptions", ["verified"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_grant_matching_subscriptions_verified"), table_name="grant_matching_subscriptions")
    op.drop_index(op.f("ix_grant_matching_subscriptions_email"), table_name="grant_matching_subscriptions")
    op.drop_index(op.f("ix_grant_matching_subscriptions_deleted_at"), table_name="grant_matching_subscriptions")
    op.drop_index(op.f("ix_grant_matching_subscriptions_created_at"), table_name="grant_matching_subscriptions")
    op.drop_index("ix_grant_matching_subs_verified_frequency", table_name="grant_matching_subscriptions")
    op.drop_index("ix_grant_matching_subs_email_verified", table_name="grant_matching_subscriptions")
    op.drop_table("grant_matching_subscriptions")
