from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# ~keep revision identifiers, used by Alembic.
revision: str = "5130dc110c69"
down_revision: str | None = "b22ffa3669e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "editor_documents",
        sa.Column("grant_application_id", sa.UUID(), nullable=True),
        sa.Column("document_metadata", sa.JSON(), server_default=sa.text("'{}'::jsonb"), nullable=True),
        sa.Column("crdt", sa.LargeBinary(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["grant_application_id"], ["grant_applications.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_editor_documents_created_at"), "editor_documents", ["created_at"], unique=False)
    op.create_index(op.f("ix_editor_documents_deleted_at"), "editor_documents", ["deleted_at"], unique=False)
    op.create_index(
        op.f("ix_editor_documents_grant_application_id"), "editor_documents", ["grant_application_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_editor_documents_grant_application_id"), table_name="editor_documents")
    op.drop_index(op.f("ix_editor_documents_deleted_at"), table_name="editor_documents")
    op.drop_index(op.f("ix_editor_documents_created_at"), table_name="editor_documents")
    op.drop_table("editor_documents")
