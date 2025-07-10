"""Initial schema with pgvector support

Revision ID: de55e0b9ba74
Revises:
Create Date: 2025-07-10 20:48:58.111654

"""

from collections.abc import Sequence

import pgvector
import sqlalchemy as sa
from alembic import op


revision: str = "de55e0b9ba74"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    
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
        "projects",
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_created_at"), "projects", ["created_at"], unique=False)
    op.create_index(op.f("ix_projects_name"), "projects", ["name"], unique=False)
    op.create_table(
        "rag_generation_jobs",
        sa.Column(
            "status",
            sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", name="raggenerationstatusenum"),
            nullable=False,
        ),
        sa.Column("current_stage", sa.BigInteger(), nullable=False),
        sa.Column("total_stages", sa.BigInteger(), nullable=False),
        sa.Column("retry_count", sa.BigInteger(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("error_details", sa.JSON(), nullable=True),
        sa.Column("checkpoint_data", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("current_stage >= 0", name="check_current_stage_non_negative"),
        sa.CheckConstraint("retry_count >= 0", name="check_retry_count_non_negative"),
        sa.CheckConstraint("total_stages > 0", name="check_total_stages_positive"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_rag_generation_jobs_status_created", "rag_generation_jobs", ["status", "created_at"], unique=False
    )
    op.create_index(
        "idx_rag_generation_jobs_status_retry", "rag_generation_jobs", ["status", "retry_count"], unique=False
    )
    op.create_index(op.f("ix_rag_generation_jobs_created_at"), "rag_generation_jobs", ["created_at"], unique=False)
    op.create_index(op.f("ix_rag_generation_jobs_status"), "rag_generation_jobs", ["status"], unique=False)
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
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("rag_job_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rag_job_id"], ["rag_generation_jobs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grant_applications_completed_at"), "grant_applications", ["completed_at"], unique=False)
    op.create_index(op.f("ix_grant_applications_created_at"), "grant_applications", ["created_at"], unique=False)
    op.create_index(op.f("ix_grant_applications_project_id"), "grant_applications", ["project_id"], unique=False)
    op.create_index(op.f("ix_grant_applications_rag_job_id"), "grant_applications", ["rag_job_id"], unique=False)
    op.create_index(op.f("ix_grant_applications_status"), "grant_applications", ["status"], unique=False)
    op.create_table(
        "notifications",
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column(
            "type", sa.Enum("DEADLINE", "INFO", "WARNING", "SUCCESS", name="notificationtypeenum"), nullable=False
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=False),
        sa.Column("dismissed", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_data", sa.JSON(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_notifications_user_active",
        "notifications",
        ["firebase_uid"],
        unique=False,
        postgresql_where=sa.text("dismissed = FALSE"),
    )
    op.create_index("idx_notifications_user_created", "notifications", ["firebase_uid", "created_at"], unique=False)
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)
    op.create_index(op.f("ix_notifications_firebase_uid"), "notifications", ["firebase_uid"], unique=False)
    op.create_index(op.f("ix_notifications_project_id"), "notifications", ["project_id"], unique=False)
    op.create_table(
        "project_users",
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("role", sa.Enum("OWNER", "ADMIN", "MEMBER", name="userroleenum"), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("firebase_uid", "project_id"),
    )
    op.create_index(op.f("ix_project_users_created_at"), "project_users", ["created_at"], unique=False)
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
        "rag_generation_notifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("rag_job_id", sa.UUID(), nullable=False),
        sa.Column("event", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("current_pipeline_stage", sa.BigInteger(), nullable=True),
        sa.Column("total_pipeline_stages", sa.BigInteger(), nullable=True),
        sa.Column("notification_type", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["rag_job_id"], ["rag_generation_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_rag_notifications_job_created", "rag_generation_notifications", ["rag_job_id", "created_at"], unique=False
    )
    op.create_index(
        op.f("ix_rag_generation_notifications_created_at"), "rag_generation_notifications", ["created_at"], unique=False
    )
    op.create_index(
        op.f("ix_rag_generation_notifications_event"), "rag_generation_notifications", ["event"], unique=False
    )
    op.create_index(
        op.f("ix_rag_generation_notifications_rag_job_id"), "rag_generation_notifications", ["rag_job_id"], unique=False
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
        sa.Column("embedding", pgvector.sqlalchemy.vector.VECTOR(dim=384), nullable=False),
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
        "user_project_invitations",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("OWNER", "ADMIN", "MEMBER", name="userroleenum"), nullable=False),
        sa.Column("invitation_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_project_invitations_created_at"), "user_project_invitations", ["created_at"], unique=False
    )
    op.create_index(op.f("ix_user_project_invitations_email"), "user_project_invitations", ["email"], unique=False)
    op.create_index(
        op.f("ix_user_project_invitations_project_id"), "user_project_invitations", ["project_id"], unique=False
    )
    op.create_table(
        "grant_application_generation_jobs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("grant_application_id", sa.UUID(), nullable=False),
        sa.Column("generated_sections", sa.JSON(), nullable=True),
        sa.Column("validation_results", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["grant_application_id"], ["grant_applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["id"], ["rag_generation_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_grant_application_generation_jobs_grant_application_id"),
        "grant_application_generation_jobs",
        ["grant_application_id"],
        unique=True,
    )
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
        sa.Column("rag_job_id", sa.UUID(), nullable=True),
        sa.Column("submission_date", sa.Date(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["funding_organization_id"], ["funding_organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["grant_application_id"], ["grant_applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rag_job_id"], ["rag_generation_jobs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grant_templates_created_at"), "grant_templates", ["created_at"], unique=False)
    op.create_index(
        op.f("ix_grant_templates_grant_application_id"), "grant_templates", ["grant_application_id"], unique=False
    )
    op.create_index(op.f("ix_grant_templates_rag_job_id"), "grant_templates", ["rag_job_id"], unique=False)
    op.create_table(
        "grant_template_generation_jobs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("grant_template_id", sa.UUID(), nullable=False),
        sa.Column("extracted_sections", sa.JSON(), nullable=True),
        sa.Column("extracted_metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["grant_template_id"], ["grant_templates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["id"], ["rag_generation_jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_grant_template_generation_jobs_grant_template_id"),
        "grant_template_generation_jobs",
        ["grant_template_id"],
        unique=True,
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

    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_title_fts
        ON grant_applications
        USING gin(to_tsvector('english', title))
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_title_trgm
        ON grant_applications
        USING gin(title gin_trgm_ops)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_filtering
        ON grant_applications (project_id, status, updated_at DESC)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_created_at_desc
        ON grant_applications (project_id, created_at DESC)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_grant_applications_title_sort
        ON grant_applications (project_id, title)
    """)
    


def downgrade() -> None:
    """Downgrade schema."""
    
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_title_sort")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_created_at_desc")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_filtering")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_title_trgm")
    op.execute("DROP INDEX IF EXISTS idx_grant_applications_title_fts")

    
    op.drop_index(op.f("ix_grant_template_rag_sources_created_at"), table_name="grant_template_rag_sources")
    op.drop_table("grant_template_rag_sources")
    op.drop_index(
        op.f("ix_grant_template_generation_jobs_grant_template_id"), table_name="grant_template_generation_jobs"
    )
    op.drop_table("grant_template_generation_jobs")
    op.drop_index(op.f("ix_grant_templates_rag_job_id"), table_name="grant_templates")
    op.drop_index(op.f("ix_grant_templates_grant_application_id"), table_name="grant_templates")
    op.drop_index(op.f("ix_grant_templates_created_at"), table_name="grant_templates")
    op.drop_table("grant_templates")
    op.drop_index(op.f("ix_grant_application_rag_sources_created_at"), table_name="grant_application_rag_sources")
    op.drop_table("grant_application_rag_sources")
    op.drop_index(
        op.f("ix_grant_application_generation_jobs_grant_application_id"),
        table_name="grant_application_generation_jobs",
    )
    op.drop_table("grant_application_generation_jobs")
    op.drop_index(op.f("ix_user_project_invitations_project_id"), table_name="user_project_invitations")
    op.drop_index(op.f("ix_user_project_invitations_email"), table_name="user_project_invitations")
    op.drop_index(op.f("ix_user_project_invitations_created_at"), table_name="user_project_invitations")
    op.drop_table("user_project_invitations")
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
    op.drop_index(op.f("ix_rag_generation_notifications_rag_job_id"), table_name="rag_generation_notifications")
    op.drop_index(op.f("ix_rag_generation_notifications_event"), table_name="rag_generation_notifications")
    op.drop_index(op.f("ix_rag_generation_notifications_created_at"), table_name="rag_generation_notifications")
    op.drop_index("idx_rag_notifications_job_created", table_name="rag_generation_notifications")
    op.drop_table("rag_generation_notifications")
    op.drop_table("rag_files")
    op.drop_index(op.f("ix_project_users_created_at"), table_name="project_users")
    op.drop_table("project_users")
    op.drop_index(op.f("ix_notifications_project_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_firebase_uid"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index("idx_notifications_user_created", table_name="notifications")
    op.drop_index(
        "idx_notifications_user_active", table_name="notifications", postgresql_where=sa.text("dismissed = FALSE")
    )
    op.drop_table("notifications")
    op.drop_index(op.f("ix_grant_applications_status"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_rag_job_id"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_project_id"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_created_at"), table_name="grant_applications")
    op.drop_index(op.f("ix_grant_applications_completed_at"), table_name="grant_applications")
    op.drop_table("grant_applications")
    op.drop_index(op.f("ix_funding_organization_rag_sources_created_at"), table_name="funding_organization_rag_sources")
    op.drop_table("funding_organization_rag_sources")
    op.drop_index(op.f("ix_rag_sources_indexing_status"), table_name="rag_sources")
    op.drop_index(op.f("ix_rag_sources_created_at"), table_name="rag_sources")
    op.drop_table("rag_sources")
    op.drop_index(op.f("ix_rag_generation_jobs_status"), table_name="rag_generation_jobs")
    op.drop_index(op.f("ix_rag_generation_jobs_created_at"), table_name="rag_generation_jobs")
    op.drop_index("idx_rag_generation_jobs_status_retry", table_name="rag_generation_jobs")
    op.drop_index("idx_rag_generation_jobs_status_created", table_name="rag_generation_jobs")
    op.drop_table("rag_generation_jobs")
    op.drop_index(op.f("ix_projects_name"), table_name="projects")
    op.drop_index(op.f("ix_projects_created_at"), table_name="projects")
    op.drop_table("projects")
    op.drop_index(op.f("ix_funding_organizations_created_at"), table_name="funding_organizations")
    op.drop_index(op.f("ix_funding_organizations_abbreviation"), table_name="funding_organizations")
    op.drop_table("funding_organizations")
    
