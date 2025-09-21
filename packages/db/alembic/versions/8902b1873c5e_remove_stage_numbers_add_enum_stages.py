from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "8902b1873c5e"
down_revision: str | None = "02df91fcb685"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE grantapplicationstageenum AS ENUM ('GENERATE_SECTIONS', 'EXTRACT_RELATIONSHIPS', 'ENRICH_RESEARCH_OBJECTIVES', 'ENRICH_TERMINOLOGY', 'GENERATE_RESEARCH_PLAN')"
    )
    op.execute(
        "CREATE TYPE granttemplatestageenum AS ENUM ('EXTRACT_CFP_CONTENT', 'ANALYZE_CFP_CONTENT', 'EXTRACT_SECTIONS', 'GENERATE_METADATA')"
    )

    op.add_column(
        "grant_application_generation_jobs",
        sa.Column(
            "current_stage",
            sa.Enum(
                "GENERATE_SECTIONS",
                "EXTRACT_RELATIONSHIPS",
                "ENRICH_RESEARCH_OBJECTIVES",
                "ENRICH_TERMINOLOGY",
                "GENERATE_RESEARCH_PLAN",
                name="grantapplicationstageenum",
            ),
            nullable=True,
        ),
    )
    op.drop_column("grant_application_generation_jobs", "validation_results")
    op.drop_column("grant_application_generation_jobs", "generated_sections")
    op.add_column(
        "grant_template_generation_jobs",
        sa.Column(
            "current_stage",
            sa.Enum(
                "EXTRACT_CFP_CONTENT",
                "ANALYZE_CFP_CONTENT",
                "EXTRACT_SECTIONS",
                "GENERATE_METADATA",
                name="granttemplatestageenum",
            ),
            nullable=True,
        ),
    )
    op.drop_column("grant_template_generation_jobs", "extracted_sections")
    op.drop_column("grant_template_generation_jobs", "extracted_metadata")
    op.add_column("rag_generation_jobs", sa.Column("current_stage_name", sa.String(length=50), nullable=True))
    op.create_index(
        op.f("ix_rag_generation_jobs_current_stage_name"), "rag_generation_jobs", ["current_stage_name"], unique=False
    )
    op.drop_column("rag_generation_jobs", "current_stage")
    op.drop_column("rag_generation_jobs", "total_stages")


def downgrade() -> None:
    op.add_column("rag_generation_jobs", sa.Column("total_stages", sa.BIGINT(), autoincrement=False, nullable=False))
    op.add_column("rag_generation_jobs", sa.Column("current_stage", sa.BIGINT(), autoincrement=False, nullable=False))
    op.drop_index(op.f("ix_rag_generation_jobs_current_stage_name"), table_name="rag_generation_jobs")
    op.drop_column("rag_generation_jobs", "current_stage_name")
    op.add_column(
        "grant_template_generation_jobs",
        sa.Column("extracted_metadata", postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True),
    )
    op.add_column(
        "grant_template_generation_jobs",
        sa.Column("extracted_sections", postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True),
    )
    op.drop_column("grant_template_generation_jobs", "current_stage")
    op.add_column(
        "grant_application_generation_jobs",
        sa.Column("generated_sections", postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True),
    )
    op.add_column(
        "grant_application_generation_jobs",
        sa.Column("validation_results", postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True),
    )
    op.drop_column("grant_application_generation_jobs", "current_stage")

    op.execute("DROP TYPE IF EXISTS grantapplicationstageenum")
    op.execute("DROP TYPE IF EXISTS granttemplatestageenum")
