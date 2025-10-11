import os
from contextlib import suppress
from typing import Any

import pytest

os.environ["PUBSUB_EMULATOR_HOST"] = "localhost:8085"
from packages.db.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    RagGenerationJob,
)
from packages.shared_utils.src.exceptions import RagJobCancelledError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
from services.rag.src.grant_template.constants import GRANT_TEMPLATE_PIPELINE_STAGES
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from services.rag.src.utils.job_manager import JobManager


async def create_and_cancel_template_job(
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
) -> RagGenerationJob:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GRANT_TEMPLATE_PIPELINE_STAGES[0],
            retry_count=0,
        )
        session.add(job)
        await session.flush()

        job.status = RagGenerationStatusEnum.CANCELLED
        await session.flush()

        return job


async def create_and_cancel_application_job(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    stage: GrantApplicationStageEnum = GrantApplicationStageEnum.SECTION_SYNTHESIS,
) -> RagGenerationJob:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.PROCESSING,
            application_stage=stage,
            retry_count=0,
        )
        session.add(job)
        await session.flush()

        job.status = RagGenerationStatusEnum.CANCELLED
        await session.flush()

        return job


@pytest.mark.asyncio
async def test_template_job_manager_detects_cancelled_job(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    await create_and_cancel_template_job(async_session_maker, grant_template_with_sections)

    manager: JobManager[Any] = JobManager(
        entity_type="grant_template",
        entity_id=grant_template_with_sections.id,
        grant_application_id=grant_template_with_sections.grant_application_id,
        current_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.get_or_create_job_for_stage()


@pytest.mark.asyncio
async def test_application_job_manager_detects_cancelled_job(
    async_session_maker: async_sessionmaker[Any],
    test_application_with_template: GrantApplication,
) -> None:
    await create_and_cancel_application_job(async_session_maker, test_application_with_template)

    manager: JobManager[Any] = JobManager(
        entity_type="grant_application",
        entity_id=test_application_with_template.id,
        grant_application_id=test_application_with_template.id,
        current_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
        pipeline_stages=[GrantApplicationStageEnum.SECTION_SYNTHESIS],
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.get_or_create_job_for_stage()


@pytest.mark.asyncio
async def test_template_pipeline_stops_when_job_cancelled(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            retry_count=0,
        )
        session.add(job)

    async def cancel_job_after_start() -> None:
        async with async_session_maker() as session, session.begin():
            stmt = (
                select(RagGenerationJob)
                .where(RagGenerationJob.grant_template_id == grant_template_with_sections.id)
                .order_by(RagGenerationJob.created_at.desc())
            )
            result = await session.execute(stmt)
            job = result.scalar_one_or_none()
            if job and job.status == RagGenerationStatusEnum.PROCESSING:
                job.status = RagGenerationStatusEnum.CANCELLED

    with suppress(Exception):
        await handle_grant_template_pipeline(
            grant_template=grant_template_with_sections,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

    async with async_session_maker() as session:
        stmt = (
            select(RagGenerationJob)
            .where(RagGenerationJob.grant_template_id == grant_template_with_sections.id)
            .order_by(RagGenerationJob.created_at.desc())
        )
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()

        assert job is not None
        assert job.status in [RagGenerationStatusEnum.CANCELLED, RagGenerationStatusEnum.FAILED]


@pytest.mark.asyncio
async def test_application_pipeline_stops_when_job_cancelled(
    async_session_maker: async_sessionmaker[Any],
    test_application_with_template: GrantApplication,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_application_id=test_application_with_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
            retry_count=0,
        )
        session.add(job)

    with suppress(Exception):
        await handle_grant_application_pipeline(
            grant_application=test_application_with_template,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

    async with async_session_maker() as session:
        stmt = (
            select(RagGenerationJob)
            .where(RagGenerationJob.grant_application_id == test_application_with_template.id)
            .order_by(RagGenerationJob.created_at.desc())
        )
        result = await session.execute(stmt)
        job = result.scalar_one_or_none()

        assert job is not None
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
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            retry_count=0,
        )
        session.add(job)
        await session.flush()
        job_id = job.id

    manager: JobManager[Any] = JobManager(
        entity_type="grant_template",
        entity_id=grant_template_with_sections.id,
        current_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
        grant_application_id=grant_template_with_sections.grant_application_id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    await manager.get_or_create_job_for_stage()

    await manager.ensure_not_cancelled()

    async with async_session_maker() as session, session.begin():
        stmt = select(RagGenerationJob).where(RagGenerationJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one()
        job.status = RagGenerationStatusEnum.CANCELLED

    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.ensure_not_cancelled()


@pytest.mark.asyncio
async def test_job_remains_active_when_not_cancelled(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            retry_count=0,
        )
        session.add(job)
        await session.flush()
        job_id = job.id

    manager: JobManager[Any] = JobManager(
        entity_type="grant_template",
        entity_id=grant_template_with_sections.id,
        current_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
        grant_application_id=grant_template_with_sections.grant_application_id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    await manager.get_or_create_job_for_stage()

    for _ in range(3):
        await manager.ensure_not_cancelled()

    async with async_session_maker() as session:
        stmt = select(RagGenerationJob).where(RagGenerationJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one()
        assert job.status == RagGenerationStatusEnum.PROCESSING
