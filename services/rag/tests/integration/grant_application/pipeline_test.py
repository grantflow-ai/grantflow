from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, GrantApplicationGenerationJob
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
            select_active(GrantApplicationGenerationJob).where(
                GrantApplicationGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job is not None
        if job.status == RagGenerationStatusEnum.FAILED:
            pass
        assert job.status != RagGenerationStatusEnum.FAILED
