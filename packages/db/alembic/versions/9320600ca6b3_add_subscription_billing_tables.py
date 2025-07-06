"""'Add subscription billing tables'

Revision ID: 9320600ca6b3
Revises: 9dbbdab85cde
Create Date: 2025-07-06 09:42:21.165982

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9320600ca6b3"
down_revision: str | None = "9dbbdab85cde"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "subscription_plans",
        sa.Column("stripe_plan_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("interval", sa.String(length=20), nullable=False),
        sa.Column("interval_count", sa.BigInteger(), nullable=False),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("limits", sa.JSON(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.BigInteger(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("interval_count > 0", name="check_interval_count_positive"),
        sa.CheckConstraint("price >= 0", name="check_price_non_negative"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_subscription_plans_active", "subscription_plans", ["active", "sort_order"], unique=False)
    op.create_index(op.f("ix_subscription_plans_created_at"), "subscription_plans", ["created_at"], unique=False)
    op.create_index(op.f("ix_subscription_plans_stripe_plan_id"), "subscription_plans", ["stripe_plan_id"], unique=True)
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
    op.create_table(
        "subscriptions",
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("plan_id", sa.UUID(), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_metadata", sa.JSON(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["firebase_uid"], ["users.firebase_uid"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_subscription_id"),
    )
    op.create_index("idx_subscriptions_period_end", "subscriptions", ["current_period_end"], unique=False)
    op.create_index("idx_subscriptions_stripe_customer", "subscriptions", ["stripe_customer_id"], unique=False)
    op.create_index("idx_subscriptions_user_status", "subscriptions", ["firebase_uid", "status"], unique=False)
    op.create_index(op.f("ix_subscriptions_created_at"), "subscriptions", ["created_at"], unique=False)
    op.create_index(op.f("ix_subscriptions_firebase_uid"), "subscriptions", ["firebase_uid"], unique=False)
    op.create_index(op.f("ix_subscriptions_plan_id"), "subscriptions", ["plan_id"], unique=False)
    op.create_index(op.f("ix_subscriptions_status"), "subscriptions", ["status"], unique=False)
    op.create_index(op.f("ix_subscriptions_stripe_customer_id"), "subscriptions", ["stripe_customer_id"], unique=False)
    op.drop_index(op.f("idx_grant_applications_created_at"), table_name="grant_applications")
    op.drop_index(op.f("idx_grant_applications_filtering"), table_name="grant_applications")
    op.drop_index(op.f("idx_grant_applications_title_fts"), table_name="grant_applications", postgresql_using="gin")
    op.drop_index(op.f("idx_grant_applications_title_sort"), table_name="grant_applications")
    op.drop_index(op.f("idx_grant_applications_title_trgm"), table_name="grant_applications", postgresql_using="gin")
    op.create_foreign_key(
        "project_users_firebase_uid_fkey",
        "project_users",
        "users",
        ["firebase_uid"],
        ["firebase_uid"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint("project_users_firebase_uid_fkey", "project_users", type_="foreignkey")
    op.create_index(
        op.f("idx_grant_applications_title_trgm"), "grant_applications", ["title"], unique=False, postgresql_using="gin"
    )
    op.create_index(
        op.f("idx_grant_applications_title_sort"), "grant_applications", ["project_id", "title"], unique=False
    )
    op.create_index(
        op.f("idx_grant_applications_title_fts"),
        "grant_applications",
        [sa.literal_column("to_tsvector('english'::regconfig, title)")],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        op.f("idx_grant_applications_filtering"),
        "grant_applications",
        ["project_id", "status", sa.literal_column("updated_at DESC")],
        unique=False,
    )
    op.create_index(
        op.f("idx_grant_applications_created_at"),
        "grant_applications",
        ["project_id", sa.literal_column("created_at DESC")],
        unique=False,
    )
    op.drop_index(op.f("ix_subscriptions_stripe_customer_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_status"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_plan_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_firebase_uid"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_created_at"), table_name="subscriptions")
    op.drop_index("idx_subscriptions_user_status", table_name="subscriptions")
    op.drop_index("idx_subscriptions_stripe_customer", table_name="subscriptions")
    op.drop_index("idx_subscriptions_period_end", table_name="subscriptions")
    op.drop_table("subscriptions")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_deleted_at"), table_name="users")
    op.drop_index(op.f("ix_users_created_at"), table_name="users")
    op.drop_index("idx_users_deletion_scheduled", table_name="users")
    op.drop_index("idx_users_active", table_name="users", postgresql_where=sa.text("deleted_at IS NULL"))
    op.drop_table("users")
    op.drop_index(op.f("ix_subscription_plans_stripe_plan_id"), table_name="subscription_plans")
    op.drop_index(op.f("ix_subscription_plans_created_at"), table_name="subscription_plans")
    op.drop_index("idx_subscription_plans_active", table_name="subscription_plans")
    op.drop_table("subscription_plans")
