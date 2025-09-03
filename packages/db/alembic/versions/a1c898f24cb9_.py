from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1c898f24cb9"
down_revision: str | None = "eb78268d2a7d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        op.f("grant_matching_subscriptions_verification_token_key"), "grant_matching_subscriptions", type_="unique"
    )
    op.drop_index(op.f("ix_grant_matching_subs_email_verified"), table_name="grant_matching_subscriptions")
    op.drop_index(op.f("ix_grant_matching_subs_verified_frequency"), table_name="grant_matching_subscriptions")
    op.drop_index(op.f("ix_grant_matching_subscriptions_verified"), table_name="grant_matching_subscriptions")
    op.drop_index(op.f("ix_grant_matching_subscriptions_email"), table_name="grant_matching_subscriptions")
    op.create_index(
        op.f("ix_grant_matching_subscriptions_email"), "grant_matching_subscriptions", ["email"], unique=True
    )
    op.drop_column("grant_matching_subscriptions", "verification_token")
    op.drop_column("grant_matching_subscriptions", "verified")


def downgrade() -> None:
    op.add_column(
        "grant_matching_subscriptions", sa.Column("verified", sa.BOOLEAN(), autoincrement=False, nullable=False)
    )
    op.add_column(
        "grant_matching_subscriptions",
        sa.Column("verification_token", sa.VARCHAR(length=64), autoincrement=False, nullable=True),
    )
    op.drop_index(op.f("ix_grant_matching_subscriptions_email"), table_name="grant_matching_subscriptions")
    op.create_index(
        op.f("ix_grant_matching_subscriptions_email"), "grant_matching_subscriptions", ["email"], unique=False
    )
    op.create_index(
        op.f("ix_grant_matching_subscriptions_verified"), "grant_matching_subscriptions", ["verified"], unique=False
    )
    op.create_index(
        op.f("ix_grant_matching_subs_verified_frequency"),
        "grant_matching_subscriptions",
        ["verified", "frequency"],
        unique=False,
    )
    op.create_index(
        op.f("ix_grant_matching_subs_email_verified"),
        "grant_matching_subscriptions",
        ["email", "verified"],
        unique=False,
    )
    op.create_unique_constraint(
        op.f("grant_matching_subscriptions_verification_token_key"),
        "grant_matching_subscriptions",
        ["verification_token"],
        postgresql_nulls_not_distinct=False,
    )
