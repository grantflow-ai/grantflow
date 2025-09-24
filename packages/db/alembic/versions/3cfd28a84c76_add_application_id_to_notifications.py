from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3cfd28a84c76"
down_revision: str | None = "2155a12ad3de"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("generation_notifications", sa.Column("grant_application_id", sa.UUID(), nullable=False))
    op.alter_column("generation_notifications", "rag_job_id", existing_type=sa.UUID(), nullable=True)
    op.drop_index(op.f("idx_rag_notifications_job_created"), table_name="generation_notifications")
    op.create_index(
        "idx_notifications_application_created",
        "generation_notifications",
        ["grant_application_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "idx_notifications_job_created", "generation_notifications", ["rag_job_id", "created_at"], unique=False
    )
    op.create_index(
        op.f("ix_generation_notifications_grant_application_id"),
        "generation_notifications",
        ["grant_application_id"],
        unique=False,
    )
    op.create_foreign_key(
        None, "generation_notifications", "grant_applications", ["grant_application_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    op.drop_constraint(None, "generation_notifications", type_="foreignkey")  # type: ignore[arg-type]
    op.drop_index(op.f("ix_generation_notifications_grant_application_id"), table_name="generation_notifications")
    op.drop_index("idx_notifications_job_created", table_name="generation_notifications")
    op.drop_index("idx_notifications_application_created", table_name="generation_notifications")
    op.create_index(
        op.f("idx_rag_notifications_job_created"),
        "generation_notifications",
        ["rag_job_id", "created_at"],
        unique=False,
    )
    op.alter_column("generation_notifications", "rag_job_id", existing_type=sa.UUID(), nullable=False)
    op.drop_column("generation_notifications", "grant_application_id")
