from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "ddfb311c3018"
down_revision: str | None = "5130dc110c69"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "grants",
        sa.Column("granting_institution_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("release_date", sa.String(length=50), nullable=False),
        sa.Column("expired_date", sa.String(length=50), nullable=False),
        sa.Column("activity_code", sa.String(length=50), nullable=False),
        sa.Column("organization", sa.String(length=255), nullable=False),
        sa.Column("parent_organization", sa.String(length=255), nullable=False),
        sa.Column("participating_orgs", sa.Text(), nullable=False),
        sa.Column("document_number", sa.String(length=100), nullable=False),
        sa.Column("document_type", sa.String(length=100), nullable=False),
        sa.Column("clinical_trials", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("amount", sa.String(length=100), nullable=True),
        sa.Column("amount_min", sa.BigInteger(), nullable=True),
        sa.Column("amount_max", sa.BigInteger(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("eligibility", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount_max IS NULL OR amount_max >= 0", name="check_amount_max_non_negative"),
        sa.CheckConstraint(
            "amount_min IS NULL OR amount_max IS NULL OR amount_min <= amount_max", name="check_amount_min_le_max"
        ),
        sa.CheckConstraint("amount_min IS NULL OR amount_min >= 0", name="check_amount_min_non_negative"),
        sa.ForeignKeyConstraint(["granting_institution_id"], ["granting_institutions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_grants_activity_code", "grants", ["activity_code"], unique=False)
    op.create_index(
        "idx_grants_description_fts",
        "grants",
        [sa.literal_column("to_tsvector('english', description)")],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        "idx_grants_institution_expired", "grants", ["granting_institution_id", "expired_date"], unique=False
    )
    op.create_index(
        "idx_grants_institution_release", "grants", ["granting_institution_id", "release_date"], unique=False
    )
    op.create_index("idx_grants_release_expired", "grants", ["release_date", "expired_date"], unique=False)
    op.create_index(op.f("ix_grants_activity_code"), "grants", ["activity_code"], unique=False)
    op.create_index(op.f("ix_grants_category"), "grants", ["category"], unique=False)
    op.create_index(op.f("ix_grants_created_at"), "grants", ["created_at"], unique=False)
    op.create_index(op.f("ix_grants_deleted_at"), "grants", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_grants_document_number"), "grants", ["document_number"], unique=True)
    op.create_index(op.f("ix_grants_expired_date"), "grants", ["expired_date"], unique=False)
    op.create_index(op.f("ix_grants_granting_institution_id"), "grants", ["granting_institution_id"], unique=False)
    op.create_index(op.f("ix_grants_release_date"), "grants", ["release_date"], unique=False)
    op.create_index(op.f("ix_grants_title"), "grants", ["title"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_grants_title"), table_name="grants")
    op.drop_index(op.f("ix_grants_release_date"), table_name="grants")
    op.drop_index(op.f("ix_grants_granting_institution_id"), table_name="grants")
    op.drop_index(op.f("ix_grants_expired_date"), table_name="grants")
    op.drop_index(op.f("ix_grants_document_number"), table_name="grants")
    op.drop_index(op.f("ix_grants_deleted_at"), table_name="grants")
    op.drop_index(op.f("ix_grants_created_at"), table_name="grants")
    op.drop_index(op.f("ix_grants_category"), table_name="grants")
    op.drop_index(op.f("ix_grants_activity_code"), table_name="grants")
    op.drop_index("idx_grants_release_expired", table_name="grants")
    op.drop_index("idx_grants_institution_release", table_name="grants")
    op.drop_index("idx_grants_institution_expired", table_name="grants")
    op.drop_index("idx_grants_description_fts", table_name="grants", postgresql_using="gin")
    op.drop_index("idx_grants_activity_code", table_name="grants")
    op.drop_table("grants")
