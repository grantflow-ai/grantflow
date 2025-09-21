from typing import Any
from unittest.mock import patch

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.grant_application.pipeline import (
    handle_grant_application_pipeline,
)
from services.rag.src.utils.job_manager import GrantApplicationJobManager

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
    # Update the CFP analysis to None in the database
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

    # Reload the application with relationships for the pipeline
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        # The pipeline catches BackendError and doesn't re-raise, so let's check the job status
        await handle_grant_application_pipeline(
            grant_application=app,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    # Check that the job failed with the expected error
    job_manager = GrantApplicationJobManager[Any](
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        # The ValidationError gets mapped to a generic error in the error handler
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_missing_research_objectives(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    # Update research objectives to empty in the database
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, test_application_with_template.id)
        assert app
        app.research_objectives = []
        await session.commit()

    # Reload the application with relationships for the pipeline
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        # The pipeline catches BackendError and doesn't re-raise, so let's check the job status
        await handle_grant_application_pipeline(
            grant_application=app,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    # Check that the job failed since research objectives are empty
    job_manager = GrantApplicationJobManager[Any](
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        # The error gets mapped to a generic error message
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_validation_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    job_manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )

    # Load the application with relationships
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
                generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        # The specific ValidationError gets mapped to generic error in this context
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_database_error_during_save(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    job_manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN,
        pipeline_stages=[],
    )

    # Load the application with relationships
    async with async_session_maker() as session:
        app = await session.get(
            GrantApplication,
            test_application_with_template.id,
            options=[selectinload(GrantApplication.grant_template)],
        )
        assert app

        with patch(
            "services.rag.src.grant_application.pipeline.update",
            side_effect=SQLAlchemyError("DB error"),
        ):
            await handle_grant_application_pipeline(
                grant_application=app,
                generation_stage=GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        # The SQLAlchemyError gets mapped to generic error
        assert "An unexpected error occurred" in job.error_message


async def test_pipeline_backend_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    job_manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )

    # Load the application with relationships
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
                generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
                session_maker=async_session_maker,
                trace_id=trace_id,
            )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
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
    """Test that FAILED jobs are reset to PROCESSING when reprocessed."""
    # First, create a job manager and get/create a job
    job_manager = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GrantApplicationStageEnum),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    # Create a job and manually set it to FAILED state
    async with async_session_maker() as session, session.begin():
        job = await job_manager.get_or_create_job()
        assert job
        job.status = RagGenerationStatusEnum.FAILED
        job.error_message = "Previous failure"
        job.error_details = {"error": "details"}
        job.failed_at = job.updated_at
        session.add(job)

    # Now create a new job manager and get the existing job
    # This should reset the FAILED job to PROCESSING
    job_manager2 = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GrantApplicationStageEnum),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    async with async_session_maker() as session:
        reset_job = await job_manager2.get_or_create_job()
        assert reset_job
        assert reset_job.id == job.id  # Same job
        assert reset_job.status == RagGenerationStatusEnum.PROCESSING  # Reset to PROCESSING
        assert reset_job.error_message is None  # Error cleared
        assert reset_job.error_details is None  # Details cleared
        assert reset_job.failed_at is None  # Failed timestamp cleared
        assert reset_job.retry_count == 1  # Retry count incremented


async def test_non_failed_job_not_reset(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
    create_pubsub_topics: None,
) -> None:
    """Test that non-FAILED jobs are not reset when retrieved."""
    # First, create a job manager and get/create a job
    job_manager = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GrantApplicationStageEnum),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    # Create a job in PROCESSING state
    async with async_session_maker() as session, session.begin():
        job = await job_manager.get_or_create_job()
        assert job
        job.status = RagGenerationStatusEnum.PROCESSING
        job.current_stage = 2
        session.add(job)

    # Now create a new job manager and get the existing job
    # This should NOT reset the job since it's not FAILED
    job_manager2 = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=list(GrantApplicationStageEnum),
        session_maker=async_session_maker,
        trace_id=trace_id,
    )

    async with async_session_maker() as session:
        same_job = await job_manager2.get_or_create_job()
        assert same_job
        assert same_job.id == job.id  # Same job
        assert same_job.status == RagGenerationStatusEnum.PROCESSING  # Still PROCESSING
        assert same_job.current_stage == 2  # Stage unchanged
        assert same_job.retry_count == 0  # No retry count increment
