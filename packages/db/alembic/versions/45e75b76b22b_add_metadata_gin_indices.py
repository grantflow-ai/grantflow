"""add_metadata_gin_indices

Revision ID: 45e75b76b22b
Revises: 2006574d8e84
Create Date: 2025-10-03 15:45:45.699316

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "45e75b76b22b"
down_revision: str | None = "2006574d8e84"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Convert document_metadata to JSONB and add GIN indices for fast queries."""
    # First, convert document_metadata column from JSON to JSONB type
    # This enables GIN indexing with jsonb_path_ops operator class
    op.execute(
        """
        ALTER TABLE rag_sources
        ALTER COLUMN document_metadata TYPE jsonb USING document_metadata::jsonb
        """
    )

    # General GIN index for containment queries (@> operator)
    # Uses jsonb_path_ops for better performance on containment-only queries
    op.create_index(
        "ix_rag_sources_document_metadata_gin",
        "rag_sources",
        ["document_metadata"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"document_metadata": "jsonb_path_ops"},
    )

    # Specific index for entities array - enables fast entity type filtering
    # Example: WHERE document_metadata -> 'entities' @> '[{"type": "ORGANIZATION"}]'
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_entities_gin
        ON rag_sources USING gin ((document_metadata -> 'entities'))
        """
    )

    # Index for keywords array - enables fast keyword matching
    # Example: WHERE document_metadata -> 'keywords' @> '[["melanoma", 0.95]]'
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_keywords_gin
        ON rag_sources USING gin ((document_metadata -> 'keywords'))
        """
    )

    # Index for categories array - enables fast category filtering
    # Example: WHERE document_metadata -> 'categories' @> '["research"]'
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_categories_gin
        ON rag_sources USING gin ((document_metadata -> 'categories'))
        """
    )


def downgrade() -> None:
    """Remove GIN indices and revert document_metadata to JSON type."""
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_categories_gin")
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_keywords_gin")
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_entities_gin")
    op.drop_index("ix_rag_sources_document_metadata_gin", table_name="rag_sources")

    # Revert document_metadata column back to JSON type
    op.execute(
        """
        ALTER TABLE rag_sources
        ALTER COLUMN document_metadata TYPE json USING document_metadata::json
        """
    )
