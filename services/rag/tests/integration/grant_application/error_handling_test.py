from typing import Any
from unittest.mock import patch

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, RagGenerationJob
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER
from services.rag.src.grant_application.pipeline import (
    handle_grant_application_pipeline,
)
from services.rag.src.utils.job_manager import JobManager

TraceId = str


@pytest.fixture
def trace_id() -> TraceId:
    return "test-trace-id"


async def test_pipeline_missing_cfp_analysis(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app
        assert app.grant_template
        app.grant_template.cfp_analysis = None
        await session.commit()

    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        await handle_grant_application_pipeline(
            grant_application=app,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_missing_research_objectives(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, test_application_with_template.id)
        assert app
        app.research_objectives = []
        await session.commit()

    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        await handle_grant_application_pipeline(
            grant_application=app,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_validation_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        with patch(
            "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
            side_effect=ValidationError("Indexing timeout"),
        ):
            await handle_grant_application_pipeline(
                grant_application=app,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_backend_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    JobManager(
        entity_type="grant_application",
        entity_id=test_application_with_template.id,
        grant_application_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )

    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        with patch(
            "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
            side_effect=BackendError("LLM error"),
        ):
            await handle_grant_application_pipeline(
                grant_application=app,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob).where(
                RagGenerationJob.grant_application_id == test_application_with_template.id
            )
        )
        job = result.scalar_one_or_none()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "An unexpected error occurred" in job.error_message


async def test_failed_job_reset_to_processing(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    job_manager: JobManager[Any] = JobManager(
        entity_type="grant_application",
        entity_id=test_application_with_template.id,
        grant_application_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GRANT_APPLICATION_STAGES_ORDER),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    async with async_session_maker() as session, session.begin():
        job = await job_manager.get_or_create_job_for_stage()
        assert job
        job.status = RagGenerationStatusEnum.FAILED
        job.error_message = "Previous failure"
        job.error_details = {"error": "details"}
        job.failed_at = job.updated_at
        session.add(job)

    job_manager2: JobManager[Any] = JobManager(
        entity_type="grant_application",
        entity_id=test_application_with_template.id,
        grant_application_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GRANT_APPLICATION_STAGES_ORDER),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    async with async_session_maker() as session:
        reset_job = await job_manager2.get_or_create_job_for_stage()
        assert reset_job
        assert reset_job.id == job.id
        assert reset_job.status == RagGenerationStatusEnum.PROCESSING
        assert reset_job.error_message is None
        assert reset_job.error_details is None
        assert reset_job.failed_at is None
        assert reset_job.retry_count == 1


async def test_non_failed_job_not_reset(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    job_manager: JobManager[Any] = JobManager(
        entity_type="grant_application",
        entity_id=test_application_with_template.id,
        grant_application_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GRANT_APPLICATION_STAGES_ORDER),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    async with async_session_maker() as session, session.begin():
        job = await job_manager.get_or_create_job_for_stage()
        assert job
        job.status = RagGenerationStatusEnum.PROCESSING
        job.application_stage = GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS
        session.add(job)

    job_manager2: JobManager[Any] = JobManager(
        entity_type="grant_application",
        entity_id=test_application_with_template.id,
        grant_application_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GRANT_APPLICATION_STAGES_ORDER),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    async with async_session_maker() as session:
        same_job = await job_manager2.get_or_create_job_for_stage()
        assert same_job
        assert same_job.id == job.id
        assert same_job.status == RagGenerationStatusEnum.PROCESSING
        assert same_job.application_stage == GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS
        assert same_job.retry_count == 0
