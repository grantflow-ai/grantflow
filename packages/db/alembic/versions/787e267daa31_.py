"""

Revision ID: 787e267daa31
Revises:
Create Date: 2025-06-18 10:37:42.230270

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector


revision: str = "787e267daa31"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    
    op.create_table(
        "funding_organizations",
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("abbreviation", sa.String(length=64), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("full_name"),
    )
    op.create_index(
        op.f("ix_funding_organizations_abbreviation"), "funding_organizations", ["abbreviation"], unique=False
    )
    op.create_index(op.f("ix_funding_organizations_created_at"), "funding_organizations", ["created_at"], unique=False)
    op.create_table(
        "rag_sources",
        sa.Column(
            "indexing_status",
            sa.Enum("CREATED", "INDEXING", "FINISHED", "FAILED", name="sourceindexingstatusenum"),
            nullable=False,
        ),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rag_sources_created_at"), "rag_sources", ["created_at"], unique=False)
    op.create_index(op.f("ix_rag_sources_indexing_status"), "rag_sources", ["indexing_status"], unique=False)
    op.create_table(
        "workspaces",
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workspaces_created_at"), "workspaces", ["created_at"], unique=False)
    op.create_index(op.f("ix_workspaces_name"), "workspaces", ["name"], unique=False)
    op.create_table(
        "funding_organization_rag_sources",
        sa.Column("rag_source_id", sa.UUID(), nullable=False),
        sa.Column("funding_organization_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["funding_organization_id"], ["funding_organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rag_source_id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("rag_source_id", "funding_organization_id"),
    )
    op.create_index(
        op.f("ix_funding_organization_rag_sources_created_at"),
        "funding_organization_rag_sources",
        ["created_at"],
        unique=False,
    )
    op.create_table(
        "grant_applications",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("form_inputs", sa.JSON(), nullable=True),
        sa.Column("research_objectives", sa.JSON(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED", name="applicationstatusenum"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grant_applications_completed_at"), "grant_applications", ["completed_at"], unique=False)
    op.create_index(op.f("ix_grant_applications_created_at"), "grant_applications", ["created_at"], unique=False)
    op.create_index(op.f("ix_grant_applications_status"), "grant_applications", ["status"], unique=False)
    op.create_index(op.f("ix_grant_applications_workspace_id"), "grant_applications", ["workspace_id"], unique=False)
    op.create_table(
        "rag_files",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("bucket_name", sa.String(length=255), nullable=False),
        sa.Column("object_path", sa.String(length=255), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("size >= 0", name="check_positive_file_size"),
        sa.ForeignKeyConstraint(["id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bucket_name", "object_path", name="uq_bucket_object"),
    )
    op.create_table(
        "rag_urls",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("url"),
    )
    op.create_table(
        "text_vectors",
        sa.Column("chunk", sa.JSON(), nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column("rag_source_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["rag_source_id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_text_vectors_embedding",
        "text_vectors",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_with={"m": 48, "ef_construction": 256},
        postgresql_ops={"embedding": "vector_cosine_ops", "iterative_scan": "strict_order"},
    )
    op.create_index(op.f("ix_text_vectors_created_at"), "text_vectors", ["created_at"], unique=False)
    op.create_index(op.f("ix_text_vectors_rag_source_id"), "text_vectors", ["rag_source_id"], unique=False)
    op.create_table(
        "user_workspace_invitations",
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("OWNER", "ADMIN", "MEMBER", name="userroleenum"), nullable=False),
        sa.Column("invitation_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_workspace_invitations_created_at"), "user_workspace_invitations", ["created_at"], unique=False
    )
    op.create_index(op.f("ix_user_workspace_invitations_email"), "user_workspace_invitations", ["email"], unique=False)
    op.create_index(
        op.f("ix_user_workspace_invitations_workspace_id"), "user_workspace_invitations", ["workspace_id"], unique=False
    )
    op.create_table(
        "workspace_users",
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("role", sa.Enum("OWNER", "ADMIN", "MEMBER", name="userroleenum"), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("firebase_uid", "workspace_id"),
    )
    op.create_index(op.f("ix_workspace_users_created_at"), "workspace_users", ["created_at"], unique=False)
    op.create_table(
        "grant_application_rag_sources",
        sa.Column("grant_application_id", sa.UUID(), nullable=False),
        sa.Column("rag_source_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["grant_application_id"], ["grant_applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rag_source_id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("grant_application_id", "rag_source_id"),
    )
    op.create_index(
        op.f("ix_grant_application_rag_sources_created_at"),
        "grant_application_rag_sources",
        ["created_at"],
        unique=False,
    )
    op.create_table(
        "grant_templates",
        sa.Column("grant_sections", sa.JSON(), nullable=False),
        sa.Column("grant_application_id", sa.UUID(), nullable=False),
        sa.Column("funding_organization_id", sa.UUID(), nullable=True),
        sa.Column("submission_date", sa.Date(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["funding_organization_id"], ["funding_organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["grant_application_id"], ["grant_applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grant_templates_created_at"), "grant_templates", ["created_at"], unique=False)
    op.create_index(
        op.f("ix_grant_templates_grant_application_id"), "grant_templates", ["grant_application_id"], unique=False
    )
    op.create_table(
        "grant_template_rag_sources",
        sa.Column("rag_source_id", sa.UUID(), nullable=False),
        sa.Column("grant_template_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["grant_template_id"], ["grant_templates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rag_source_id"], ["rag_sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("rag_source_id", "grant_template_id"),
    )
    op.create_index(
        op.f("ix_grant_template_rag_sources_created_at"), "grant_template_rag_sources", ["created_at"], unique=False
    )
    


def downgrade() -> None:
    """Downgrade schema."""
    
    op.drop_index(op.f("ix_grant_template_rag_sources_created_at"), table_name="grant_template_rag_sources")
    op.drop_table("grant_template_rag_sources")
    op.drop_index(op.f("ix_grant_templates_grant_application_id"), table_name="grant_templates")
    op.drop_index(op.f("ix_grant_templates_created_at"), table_name="grant_templates")
    op.drop_table("grant_templates")
    op.drop_index(op.f("ix_grant_application_rag_sources_created_at"), table_name="grant_application_rag_sources")
    op.drop_table("grant_application_rag_sources")
    op.drop_index(op.f("ix_workspace_users_created_at"), table_name="workspace_users")
    op.drop_table("workspace_users")
    op.drop_index(op.f("ix_user_workspace_invitations_workspace_id"), table_name="user_workspace_invitations")
    op.drop_index(op.f("ix_user_workspace_invitations_email"), table_name="user_workspace_invitations")
    op.drop_index(op.f("ix_user_workspace_invitations_created_at"), table_name="user_workspace_invitations")
    op.drop_table("user_workspace_invitations")
    op.drop_index(op.f("ix_text_vectors_rag_source_id"), table_name="text_vectors")
    op.drop_index(op.f("ix_text_vectors_created_at"), table_name="text_vectors")
    op.drop_index(
        "idx_text_vectors_embedding",
        table_name="text_vectors",
        postgresql_using="hnsw",
        postgresql_with={"m": 48, "ef_construction": 256},
        postgresql_ops={"embedding": "vector_cosine_ops", "iterative_scan": "strict_order"},
    )
    op.drop_table("text_vectors")
    op.drop_table("rag_urls")
    op.drop_table("rag_files")
    op.drop_index(op.f("ix_grant_applications_workspace_id"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_status"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_created_at"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_completed_at"), table_name="grant_applications")
    op.drop_table("grant_applications")
    op.drop_index(op.f("ix_funding_organization_rag_sources_created_at"), table_name="funding_organization_rag_sources")
    op.drop_table("funding_organization_rag_sources")
    op.drop_index(op.f("ix_workspaces_name"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_created_at"), table_name="workspaces")
    op.drop_table("workspaces")
    op.drop_index(op.f("ix_rag_sources_indexing_status"), table_name="rag_sources")
    op.drop_index(op.f("ix_rag_sources_created_at"), table_name="rag_sources")
    op.drop_table("rag_sources")
    op.drop_index(op.f("ix_funding_organizations_created_at"), table_name="funding_organizations")
    op.drop_index(op.f("ix_funding_organizations_abbreviation"), table_name="funding_organizations")
    op.drop_table("funding_organizations")
    
