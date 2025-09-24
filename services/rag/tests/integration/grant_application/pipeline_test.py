from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from packages.db.src.enums import ApplicationStatusEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, RagGenerationJob
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.grant_application.pipeline import (
    handle_grant_application_pipeline,
)


def create_mock_job_manager() -> MagicMock:
    mock_job = AsyncMock()
    mock_job.id = UUID("00000000-0000-0000-0000-000000000002")

    mock_job_manager = MagicMock()
    mock_job_manager.create_grant_application_job = AsyncMock(return_value=mock_job)
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_job_manager.handle_cancellation = AsyncMock()

    return mock_job_manager


async def test_handle_grant_application_pipeline_with_mocked_llm(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    create_pubsub_topics: None,
) -> None:
    mocked_section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
        "preliminary_results": "This is the preliminary results text.",
        "risks_and_mitigations": "This is the risks and mitigations text.",
    }

    generate_sections_dto = {
        "section_texts": [
            {"section_id": section_id, "text": text} for section_id, text in mocked_section_texts.items()
        ],
        "work_plan_section": {
            "id": "research_plan",
            "title": "Research Plan",
            "order": 2,
            "parent_id": None,
            "keywords": ["methodology"],
            "topics": ["methods"],
            "generation_instructions": "Describe methodology",
            "depends_on": [],
            "max_words": 1500,
            "search_queries": ["methodology"],
            "is_detailed_research_plan": True,
            "is_clinical_trial": False,
        },
    }

    extract_relationships_dto = generate_sections_dto.copy()
    extract_relationships_dto["relationships"] = []

    enrich_objectives_dto = extract_relationships_dto.copy()
    enrich_objectives_dto["enriched_objectives"] = []

    enrich_terminology_dto = enrich_objectives_dto.copy()
    enrich_terminology_dto["enriched_terminology"] = {}

    final_dto = enrich_terminology_dto.copy()
    final_dto["research_plan_text"] = "Generated research plan text"

    async with async_session_maker() as session:
        application = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert application

        with (
            patch(
                "services.rag.src.utils.checks.verify_rag_sources_indexed",
                return_value=None,
            ),
            patch(
                "services.rag.src.grant_application.handlers.handle_generate_sections_stage",
                return_value=generate_sections_dto,
            ),
            patch(
                "services.rag.src.grant_application.handlers.handle_extract_relationships_stage",
                return_value=extract_relationships_dto,
            ),
            patch(
                "services.rag.src.grant_application.handlers.handle_enrich_objectives_stage",
                return_value=enrich_objectives_dto,
            ),
            patch(
                "services.rag.src.grant_application.handlers.handle_enrich_terminology_stage",
                return_value=enrich_terminology_dto,
            ),
            patch(
                "services.rag.src.grant_application.handlers.handle_generate_research_plan_stage",
                return_value=final_dto,
            ),
            patch(
                "packages.shared_utils.src.pubsub.publish_email_notification",
                return_value=None,
            ),
            patch(
                "packages.shared_utils.src.pubsub.publish_notification",
                return_value=None,
            ),
        ):
            await handle_grant_application_pipeline(
                grant_application=application,
                session_maker=async_session_maker,
                trace_id="test-trace-id",
            )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job is not None
        if job.status == RagGenerationStatusEnum.FAILED:
            pass
        assert job.status != RagGenerationStatusEnum.FAILED


async def test_complete_pipeline_updates_application_status_to_working_draft(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    create_pubsub_topics: None,
) -> None:
    """Test that completing the GENERATE_RESEARCH_PLAN stage updates application status to WORKING_DRAFT."""
    from sqlalchemy import update

    # Set application to GENERATING status as it would be during the final stage
    async with async_session_maker() as session:
        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == test_application_with_template.id)
            .values(status=ApplicationStatusEnum.GENERATING, text=None)
        )
        await session.commit()

    # Mock all pipeline dependencies to simulate the final stage completion
    with (
        patch("services.rag.src.utils.checks.verify_rag_sources_indexed", return_value=None),
        patch("services.rag.src.grant_application.handlers.handle_generate_research_plan_stage") as mock_final_stage,
        patch("packages.shared_utils.src.pubsub.publish_email_notification", return_value=None),
        patch("packages.shared_utils.src.pubsub.publish_notification", return_value=None),
    ):
        # Mock the final stage to return complete data
        mock_final_stage.return_value = {
            "section_texts": [
                {"section_id": "abstract", "text": "Generated abstract text for testing."},
                {"section_id": "significance", "text": "Generated significance text for testing."},
            ],
            "work_plan_section": {
                "id": "research_plan",
                "title": "Research Plan",
                "order": 2,
                "parent_id": None,
                "keywords": ["methodology"],
                "topics": ["methods"],
                "generation_instructions": "Describe methodology",
                "depends_on": [],
                "max_words": 1500,
                "search_queries": ["methodology"],
                "is_detailed_research_plan": True,
                "is_clinical_trial": False,
            },
            "relationships": {"1": ["Task 1.1 depends on Objective 1"]},
            "enrichment_responses": [],
            "wikidata_enrichments": [],
            "research_plan_text": "Generated comprehensive research plan text.",
        }

        # Load the application and manually trigger the final stage
        async with async_session_maker() as session:
            application = await session.get(
                GrantApplication,
                test_application_with_template.id,
                options=[selectinload(GrantApplication.grant_template)],
            )
            assert application
            assert application.grant_template

            # Manually invoke the pipeline starting from the final stage by creating all stage jobs up to the final one
            from packages.db.src.enums import GrantApplicationStageEnum
            from packages.db.src.tables import RagGenerationJob

            from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER

            # Create completed jobs for all stages except the final one
            for stage in GRANT_APPLICATION_STAGES_ORDER[:-1]:
                job = RagGenerationJob(
                    grant_application_id=application.id,
                    application_stage=stage,
                    status=RagGenerationStatusEnum.COMPLETED,
                    retry_count=0,
                )
                session.add(job)
            await session.commit()

            # Run the pipeline - it should detect the final stage needs processing
            await handle_grant_application_pipeline(
                grant_application=application,
                session_maker=async_session_maker,
                trace_id="test-final-stage-completion",
            )

    # Verify the application was updated correctly
    async with async_session_maker() as session:
        updated_application = await session.get(GrantApplication, test_application_with_template.id)
        assert updated_application

        # CRITICAL: Verify status was updated from GENERATING to WORKING_DRAFT
        assert updated_application.status == ApplicationStatusEnum.WORKING_DRAFT, (
            f"Expected application status to be WORKING_DRAFT after final stage completion, "
            f"but got {updated_application.status}. This indicates the pipeline is not properly "
            f"transitioning the application status upon successful completion."
        )

        # Verify text was generated and saved
        assert updated_application.text is not None
        assert len(updated_application.text) > 0

        # Verify the job was marked as completed
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id,
                RagGenerationJob.application_stage == GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN,
            )
        )
        final_job = result.scalar_one_or_none()
        assert final_job is not None
        assert final_job.status == RagGenerationStatusEnum.COMPLETED
