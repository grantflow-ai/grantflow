from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from packages.db.src.tables import GrantApplication
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.enums import GrantApplicationStageEnum
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
) -> None:
    application = test_application_with_template

    mocked_section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
        "preliminary_results": "This is the preliminary results text.",
        "risks_and_mitigations": "This is the risks and mitigations text.",
    }

    create_mock_job_manager()

    with (
        patch(
            "services.rag.src.utils.checks.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.batch_enrich_objectives.handle_batch_enrich_objectives",
            return_value=[],
        ),
        patch(
            "services.rag.src.grant_application.extract_relationships.handle_extract_relationships",
            return_value=[],
        ),
        patch(
            "services.rag.src.grant_application.enrich_terminology_stage.enrich_objective_with_wikidata",
            return_value={"enriched": True},
        ),
        patch(
            "services.rag.src.grant_application.generate_work_plan_text.generate_objective_with_tasks",
            return_value="Mocked work plan component",
        ),
        patch(
            "services.rag.src.grant_application.generate_section_text.handle_generate_section_text",
            return_value=mocked_section_texts,
        ),
        patch(
            "services.rag.src.grant_application.utils.generate_application_text",
            return_value="Complete application text",
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
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            grant_application=application,
            session_maker=async_session_maker,
            trace_id="test-trace-id",
        )

    async with async_session_maker() as session:
        updated_app = await session.get(
            GrantApplication,
            application.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert updated_app is not None
        assert updated_app.text == "Complete application text"
