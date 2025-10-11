from collections.abc import Sequence

from alembic import op

revision: str = "13b87034ef39"
down_revision: str | None = "2043449645e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE grantapplicationstageenum RENAME TO grantapplicationstageenum_old")
    op.execute(
        "CREATE TYPE grantapplicationstageenum AS ENUM ('BLUEPRINT_PREP', 'WORKPLAN_GENERATION', 'SECTION_SYNTHESIS')"
    )
    op.execute(
        """
        ALTER TABLE rag_generation_jobs
        ALTER COLUMN application_stage
        TYPE grantapplicationstageenum
        USING (
            CASE
                WHEN application_stage::text IN (
                    'EXTRACT_RELATIONSHIPS',
                    'ENRICH_RESEARCH_OBJECTIVES',
                    'ENRICH_TERMINOLOGY'
                ) THEN 'BLUEPRINT_PREP'
                WHEN application_stage::text = 'GENERATE_RESEARCH_PLAN' THEN 'WORKPLAN_GENERATION'
                WHEN application_stage::text = 'GENERATE_SECTIONS' THEN 'SECTION_SYNTHESIS'
                ELSE NULL
            END
        )::grantapplicationstageenum
        """
    )
    op.execute("DROP TYPE grantapplicationstageenum_old")


def downgrade() -> None:
    op.execute("ALTER TYPE grantapplicationstageenum RENAME TO grantapplicationstageenum_new")
    op.execute(
        "CREATE TYPE grantapplicationstageenum AS ENUM "
        "('GENERATE_SECTIONS', 'EXTRACT_RELATIONSHIPS', 'ENRICH_RESEARCH_OBJECTIVES', "
        "'ENRICH_TERMINOLOGY', 'GENERATE_RESEARCH_PLAN')"
    )
    op.execute(
        """
        ALTER TABLE rag_generation_jobs
        ALTER COLUMN application_stage
        TYPE grantapplicationstageenum
        USING (
            CASE
                WHEN application_stage::text = 'BLUEPRINT_PREP' THEN 'ENRICH_TERMINOLOGY'
                WHEN application_stage::text = 'WORKPLAN_GENERATION' THEN 'GENERATE_RESEARCH_PLAN'
                WHEN application_stage::text = 'SECTION_SYNTHESIS' THEN 'GENERATE_SECTIONS'
                ELSE NULL
            END
        )::grantapplicationstageenum
        """
    )
    op.execute("DROP TYPE grantapplicationstageenum_new")
