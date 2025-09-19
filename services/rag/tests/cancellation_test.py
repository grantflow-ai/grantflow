from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplication,
    GrantApplicationGenerationJob,
    GrantTemplate,
    GrantTemplateGenerationJob,
    Organization,
    Project,
    RagGenerationJob,
    RagSource,
)
from packages.shared_utils.src.constants import NotificationEvents
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.sources import _cancel_job_if_active
from services.rag.src.grant_application.handler import (
    generate_work_plan_text,
    grant_application_text_generation_pipeline_handler,
)
from services.rag.src.grant_template.handler import (
    extract_and_enrich_sections,
    grant_template_generation_pipeline_handler,
)
from services.rag.src.utils.job_manager import JobManager

if TYPE_CHECKING:
    from packages.db.src.json_objects import CFPContentSection as Content
    from packages.db.src.json_objects import GrantLongFormSection


@pytest.mark.asyncio
async def test_check_if_cancelled_returns_false_when_not_cancelled(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    job_manager = JobManager(async_session_maker)

    async with async_session_maker() as session:
        job = RagGenerationJob(
            job_type="grant_template_generation",
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=1,
            total_stages=5,
            retry_count=0,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    job_manager.job_id = job_id
    result = await job_manager.check_if_cancelled()
    assert result is False


@pytest.mark.asyncio
async def test_check_if_cancelled_returns_true_when_cancelled(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    job_manager = JobManager(async_session_maker)

    async with async_session_maker() as session:
        job = RagGenerationJob(
            job_type="grant_template_generation",
            status=RagGenerationStatusEnum.CANCELLED,
            current_stage=1,
            total_stages=5,
            retry_count=0,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    job_manager.job_id = job_id
    result = await job_manager.check_if_cancelled()
    assert result is True


@pytest.mark.asyncio
async def test_check_if_cancelled_returns_false_when_no_job_id(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    job_manager = JobManager(async_session_maker)
    result = await job_manager.check_if_cancelled()
    assert result is False


@pytest.mark.asyncio
async def test_handle_cancellation_adds_notification(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    job_manager = JobManager(async_session_maker)

    async with async_session_maker() as session:
        job = RagGenerationJob(
            job_type="grant_template_generation",
            status=RagGenerationStatusEnum.CANCELLED,
            current_stage=1,
            total_stages=5,
            retry_count=0,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    job_manager.job_id = job_id
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    with patch("services.rag.src.utils.job_manager.publish_notification") as mock_publish:
        await job_manager.handle_cancellation(parent_id)

    async with async_session_maker() as session:
        notifications = await session.scalars(
            select(GenerationNotification).where(GenerationNotification.rag_job_id == job_id)
        )
        notification = notifications.first()
        assert notification is not None
        assert notification.event == NotificationEvents.CANCELLATION_ACKNOWLEDGED
        assert notification.message == "Processing stopped due to cancellation"
        assert notification.notification_type == "warning"

    mock_publish.assert_called_once()


@pytest.mark.asyncio
async def test_template_generation_stops_at_verification_when_cancelled(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    mock_job_manager = MagicMock()
    mock_job_manager.create_grant_template_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=True)
    mock_job_manager.handle_cancellation = AsyncMock()

    with patch("services.rag.src.grant_template.handler.verify_rag_sources_indexed"):
        result = await grant_template_generation_pipeline_handler(
            grant_template_id=grant_template_with_sections.id,
            session_maker=async_session_maker,
            stage=GrantTemplateStageEnum.INITIALIZE,
            job_manager=mock_job_manager,
        )

    assert result is None
    mock_job_manager.handle_cancellation.assert_called_once_with(grant_template_with_sections.grant_application_id)


@pytest.mark.asyncio
async def test_template_extraction_stops_when_cancelled(
    sample_cfp_content: list[dict[str, Any]],
    cfp_subject: str,
    nih_organization: Any,
) -> None:
    parent_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_job_manager = MagicMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=True)
    mock_job_manager.handle_cancellation = AsyncMock()

    with patch("services.rag.src.grant_template.handler.handle_extract_sections"):
        result = await extract_and_enrich_sections(
            cfp_content=cast("list[Content]", sample_cfp_content),
            cfp_subject=cfp_subject,
            organization=nih_organization,
            parent_id=parent_id,
            job_manager=mock_job_manager,
        )

    assert result == []
    mock_job_manager.handle_cancellation.assert_called_once_with(parent_id)


@pytest.mark.asyncio
async def test_application_generation_stops_at_verification_when_cancelled(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mock_job_manager = MagicMock()
    mock_job_manager.create_grant_application_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=True)
    mock_job_manager.handle_cancellation = AsyncMock()

    with patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed"):
        result = await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application_with_template.id,
            session_maker=async_session_maker,
            stage=GrantApplicationStageEnum.INITIALIZE,
            job_manager=mock_job_manager,
        )

    assert result is None
    mock_job_manager.handle_cancellation.assert_called_once_with(test_application_with_template.id)


@pytest.mark.asyncio
async def test_work_plan_generation_checks_cancellation_between_objectives(
    mock_research_objectives: list[Any],
    mock_enrichment_response: dict[str, Any],
    mock_grant_sections: list[Any],
) -> None:
    research_plan_section = None
    for s in mock_grant_sections:
        if s.get("is_detailed_research_plan"):
            research_plan_section = s
            break

    if not research_plan_section:
        research_plan_section = {
            "id": "research_plan",
            "title": "Research Plan",
            "is_detailed_research_plan": True,
            "type": "section",
            "order": 1,
        }

    mock_job_manager = MagicMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(side_effect=[False, True])
    mock_job_manager.handle_cancellation = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_application.handler.handle_extract_relationships",
            new_callable=AsyncMock,
            return_value={},
        ),
        patch(
            "services.rag.src.grant_application.handler.handle_batch_enrich_objectives",
            new_callable=AsyncMock,
            return_value=[mock_enrichment_response, mock_enrichment_response],
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_component_text",
            new_callable=AsyncMock,
            return_value="Mock text",
        ),
    ):
        result = await generate_work_plan_text(
            application_id=str(UUID("550e8400-e29b-41d4-a716-446655440000")),
            work_plan_section=cast("GrantLongFormSection", research_plan_section),
            form_inputs={"background_context": "Test"},
            research_objectives=mock_research_objectives,
            job_manager=mock_job_manager,
        )

    assert mock_job_manager.check_if_cancelled.call_count >= 1
    assert isinstance(result, str)


@pytest.mark.asyncio
async def test_cancel_endpoint_cancels_pending_job(
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    grant_template_with_sections: GrantTemplate,
) -> None:
    async with async_session_maker() as session:
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PENDING,
            current_stage=0,
            total_stages=5,
            retry_count=0,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    async with async_session_maker() as session:
        job = await session.get(RagGenerationJob, job_id)
        assert job is not None

        job.status = RagGenerationStatusEnum.CANCELLED
        job.failed_at = datetime.now(UTC)
        job.error_message = "Cancelled by user request"

        notification = GenerationNotification(
            rag_job_id=job_id,
            event=NotificationEvents.JOB_CANCELLED,
            message="Generation cancelled by user",
            notification_type="warning",
        )
        session.add(notification)
        await session.commit()

    async with async_session_maker() as session:
        job = await session.get(RagGenerationJob, job_id)
        assert job.status == RagGenerationStatusEnum.CANCELLED
        assert job.error_message == "Cancelled by user request"
        assert job.failed_at is not None

    async with async_session_maker() as session:
        notifications = await session.scalars(
            select(GenerationNotification).where(GenerationNotification.rag_job_id == job_id)
        )
        notification = notifications.first()
        assert notification is not None
        assert notification.event == NotificationEvents.JOB_CANCELLED


@pytest.mark.asyncio
async def test_cancel_endpoint_does_not_cancel_completed_job(
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    grant_template_with_sections: GrantTemplate,
) -> None:
    async with async_session_maker() as session:
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.COMPLETED,
            current_stage=5,
            total_stages=5,
            retry_count=0,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    async with async_session_maker() as session:
        job = await session.get(RagGenerationJob, job_id)
        assert job is not None

        if job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]:
            job.status = RagGenerationStatusEnum.CANCELLED
            job.failed_at = datetime.now(UTC)
            job.error_message = "Cancelled by user request"

        await session.commit()

    async with async_session_maker() as session:
        job = await session.get(RagGenerationJob, job_id)
        assert job.status == RagGenerationStatusEnum.COMPLETED


@pytest.mark.asyncio
async def test_deleting_template_source_cancels_template_job(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
    template_rag_source: RagSource,
    organization: Organization,
) -> None:
    async with async_session_maker() as session:
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=2,
            total_stages=5,
            retry_count=0,
        )
        session.add(job)

        template = await session.get(GrantTemplate, grant_template_with_sections.id)
        template.rag_job_id = job.id

        await session.commit()
        job_id = job.id

    async with async_session_maker() as session:
        await _cancel_job_if_active(
            session=session,
            job_id=job_id,
            reason="Template source deleted",
        )
        await session.commit()

    async with async_session_maker() as session:
        job = await session.get(RagGenerationJob, job_id)
        assert job.status == RagGenerationStatusEnum.CANCELLED
        assert "template source deleted" in job.error_message.lower()


@pytest.mark.asyncio
async def test_deleting_application_source_cancels_application_job_only(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_template_with_sections: GrantTemplate,
    application_rag_source: RagSource,
    organization: Organization,
) -> None:
    async with async_session_maker() as session:
        template_job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=2,
            total_stages=5,
            retry_count=0,
        )
        app_job = GrantApplicationGenerationJob(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=3,
            total_stages=6,
            retry_count=0,
        )
        session.add_all([template_job, app_job])

        template = await session.get(GrantTemplate, grant_template_with_sections.id)
        template.rag_job_id = template_job.id

        application = await session.get(GrantApplication, grant_application.id)
        application.rag_job_id = app_job.id

        await session.commit()
        template_job_id = template_job.id
        app_job_id = app_job.id

    async with async_session_maker() as session:
        await _cancel_job_if_active(
            session=session,
            job_id=app_job_id,
            reason="Application source deleted",
        )
        await session.commit()

    async with async_session_maker() as session:
        template_job = await session.get(RagGenerationJob, template_job_id)
        app_job = await session.get(RagGenerationJob, app_job_id)

        assert template_job.status == RagGenerationStatusEnum.PROCESSING

        assert app_job.status == RagGenerationStatusEnum.CANCELLED
        assert "application source deleted" in app_job.error_message.lower()
