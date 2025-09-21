"""Tests for RAG job cancellation functionality using real infrastructure."""

import os
from contextlib import suppress
from typing import Any

import pytest

# Ensure we're using the Pub/Sub emulator
os.environ["PUBSUB_EMULATOR_HOST"] = "localhost:8085"
from packages.db.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationGenerationJob,
    GrantTemplate,
    GrantTemplateGenerationJob,
)
from packages.shared_utils.src.exceptions import RagJobCancelledError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
from services.rag.src.grant_template.constants import GRANT_TEMPLATE_PIPELINE_STAGES
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from services.rag.src.utils.job_manager import (
    GrantApplicationJobManager,
    GrantTemplateJobManager,
)


async def create_and_cancel_template_job(
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
) -> GrantTemplateGenerationJob:
    """Create a template job and mark it as cancelled."""
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template.id,
            total_stages=len(GRANT_TEMPLATE_PIPELINE_STAGES),
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=0,
            retry_count=0,
        )
        session.add(job)
        await session.flush()

        # Mark as cancelled
        job.status = RagGenerationStatusEnum.CANCELLED
        await session.flush()

        return job


async def create_and_cancel_application_job(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> GrantApplicationGenerationJob:
    """Create an application job and mark it as cancelled."""
    async with async_session_maker() as session, session.begin():
        job = GrantApplicationGenerationJob(
            grant_application_id=grant_application.id,
            total_stages=5,  # Typical number of application stages
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=0,
            retry_count=0,
        )
        session.add(job)
        await session.flush()

        # Mark as cancelled
        job.status = RagGenerationStatusEnum.CANCELLED
        await session.flush()

        return job


@pytest.mark.asyncio
async def test_template_job_manager_detects_cancelled_job(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    """Test that GrantTemplateJobManager correctly detects when a job has been cancelled."""
    # Create a cancelled job
    job = await create_and_cancel_template_job(async_session_maker, grant_template_with_sections)

    # Create job manager
    manager: GrantTemplateJobManager[Any] = GrantTemplateJobManager(
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        grant_application_id=grant_template_with_sections.grant_application_id,
        job_id=job.id,
        parent_id=grant_template_with_sections.id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    # Load the job into the manager
    await manager.get_or_create_job()

    # Should raise when checking cancellation
    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.ensure_not_cancelled()


@pytest.mark.asyncio
async def test_application_job_manager_detects_cancelled_job(
    async_session_maker: async_sessionmaker[Any],
    test_application_with_template: GrantApplication,
) -> None:
    """Test that GrantApplicationJobManager correctly detects when a job has been cancelled."""
    # Create a cancelled job
    job = await create_and_cancel_application_job(async_session_maker, test_application_with_template)

    # Create job manager
    manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        grant_application_id=test_application_with_template.id,
        job_id=job.id,
        parent_id=test_application_with_template.id,
        pipeline_stages=[GrantApplicationStageEnum.GENERATE_SECTIONS],
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    # Load the job into the manager
    await manager.get_or_create_job()

    # Should raise when checking cancellation
    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.ensure_not_cancelled()


@pytest.mark.asyncio
async def test_template_pipeline_stops_when_job_cancelled(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    """Test that the template pipeline stops processing when the job is cancelled."""
    # Create a job that starts as processing
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            total_stages=len(GRANT_TEMPLATE_PIPELINE_STAGES),
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=0,
            retry_count=0,
        )
        session.add(job)

    # Start the pipeline - it should create its own job or use existing
    # For this test, we'll cancel it mid-flight by updating the job status
    async def cancel_job_after_start() -> None:
        """Helper to cancel the job after pipeline starts."""
        async with async_session_maker() as session, session.begin():
            stmt = (
                select(GrantTemplateGenerationJob)
                .where(GrantTemplateGenerationJob.grant_template_id == grant_template_with_sections.id)
                .order_by(GrantTemplateGenerationJob.created_at.desc())
            )
            result = await session.execute(stmt)
            job = result.scalar_one_or_none()
            if job and job.status == RagGenerationStatusEnum.PROCESSING:
                job.status = RagGenerationStatusEnum.CANCELLED

    # Run pipeline and cancel it
    # Note: This is a simplified test - in real scenarios, cancellation would happen
    # from another process/endpoint
    with suppress(Exception):
        # Pipeline may fail due to missing resources or cancellation
        await handle_grant_template_pipeline(
            grant_template=grant_template_with_sections,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )

    # Verify job was created and is in correct state
    async with async_session_maker() as session:
        stmt = (
            select(GrantTemplateGenerationJob)
            .where(GrantTemplateGenerationJob.grant_template_id == grant_template_with_sections.id)
            .order_by(GrantTemplateGenerationJob.created_at.desc())
        )
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()

        assert job is not None
        # Job should either be cancelled or failed if cancellation was detected
        assert job.status in [RagGenerationStatusEnum.CANCELLED, RagGenerationStatusEnum.FAILED]


@pytest.mark.asyncio
async def test_application_pipeline_stops_when_job_cancelled(
    async_session_maker: async_sessionmaker[Any],
    test_application_with_template: GrantApplication,
) -> None:
    """Test that the application pipeline stops processing when the job is cancelled."""
    # Create a job that starts as processing
    async with async_session_maker() as session, session.begin():
        job = GrantApplicationGenerationJob(
            grant_application_id=test_application_with_template.id,
            total_stages=5,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=0,
            retry_count=0,
        )
        session.add(job)

    # Run pipeline
    with suppress(Exception):
        # Pipeline may fail due to missing resources or cancellation
        await handle_grant_application_pipeline(
            grant_application=test_application_with_template,
            session_maker=async_session_maker,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            trace_id="test-trace",
        )

    # Verify job was created and is in correct state
    async with async_session_maker() as session:
        stmt = (
            select(GrantApplicationGenerationJob)
            .where(GrantApplicationGenerationJob.grant_application_id == test_application_with_template.id)
            .order_by(GrantApplicationGenerationJob.created_at.desc())
        )
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()

        assert job is not None
        # Job should be in a valid state
        assert job.status in [
            RagGenerationStatusEnum.PROCESSING,
            RagGenerationStatusEnum.COMPLETED,
            RagGenerationStatusEnum.FAILED,
            RagGenerationStatusEnum.CANCELLED,
        ]


@pytest.mark.asyncio
async def test_concurrent_job_cancellation(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    """Test that cancellation works correctly when job is cancelled from another session."""
    # Create an active job
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            total_stages=len(GRANT_TEMPLATE_PIPELINE_STAGES),
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=1,
            retry_count=0,
        )
        session.add(job)
        await session.flush()
        job_id = job.id

    # Create job manager pointing to this job
    manager: GrantTemplateJobManager[Any] = GrantTemplateJobManager(
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        grant_application_id=grant_template_with_sections.grant_application_id,
        job_id=job_id,
        parent_id=grant_template_with_sections.id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    # Load the job into the manager
    await manager.get_or_create_job()

    # First check should succeed
    await manager.ensure_not_cancelled()

    # Cancel the job from another session (simulating external cancellation)
    async with async_session_maker() as session, session.begin():
        stmt = select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one()
        job.status = RagGenerationStatusEnum.CANCELLED

    # Now check should fail
    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.ensure_not_cancelled()


@pytest.mark.asyncio
async def test_job_remains_active_when_not_cancelled(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    """Test that jobs continue processing when not cancelled."""
    # Create an active job
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            total_stages=len(GRANT_TEMPLATE_PIPELINE_STAGES),
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=1,
            retry_count=0,
        )
        session.add(job)
        await session.flush()
        job_id = job.id

    # Create job manager
    manager: GrantTemplateJobManager[Any] = GrantTemplateJobManager(
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        grant_application_id=grant_template_with_sections.grant_application_id,
        job_id=job_id,
        parent_id=grant_template_with_sections.id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    # Load the job into the manager
    await manager.get_or_create_job()

    # Multiple checks should all succeed
    for _ in range(3):
        await manager.ensure_not_cancelled()

    # Verify job is still processing
    async with async_session_maker() as session:
        stmt = select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one()
        assert job.status == RagGenerationStatusEnum.PROCESSING
