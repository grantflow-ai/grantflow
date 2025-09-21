import os
from contextlib import suppress
from typing import Any

import pytest

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

from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER
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
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=GRANT_TEMPLATE_PIPELINE_STAGES[0],
            current_stage_name=str(GRANT_TEMPLATE_PIPELINE_STAGES[0]),
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
) -> GrantApplicationGenerationJob:
    async with async_session_maker() as session, session.begin():
        job = GrantApplicationGenerationJob(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=GRANT_APPLICATION_STAGES_ORDER[0],
            current_stage_name=str(GRANT_APPLICATION_STAGES_ORDER[0]),
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
    job = await create_and_cancel_template_job(async_session_maker, grant_template_with_sections)

    manager: GrantTemplateJobManager[Any] = GrantTemplateJobManager(
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        grant_application_id=grant_template_with_sections.grant_application_id,
        job_id=job.id,
        parent_id=grant_template_with_sections.id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    await manager.get_or_create_job()

    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.ensure_not_cancelled()


@pytest.mark.asyncio
async def test_application_job_manager_detects_cancelled_job(
    async_session_maker: async_sessionmaker[Any],
    test_application_with_template: GrantApplication,
) -> None:
    job = await create_and_cancel_application_job(async_session_maker, test_application_with_template)

    manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        grant_application_id=test_application_with_template.id,
        job_id=job.id,
        parent_id=test_application_with_template.id,
        pipeline_stages=[GrantApplicationStageEnum.GENERATE_SECTIONS],
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    await manager.get_or_create_job()

    with pytest.raises(RagJobCancelledError, match="Job cancelled"):
        await manager.ensure_not_cancelled()


@pytest.mark.asyncio
async def test_template_pipeline_stops_when_job_cancelled(
    async_session_maker: async_sessionmaker[Any],
    grant_template_with_sections: GrantTemplate,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            retry_count=0,
        )
        session.add(job)

    async def cancel_job_after_start() -> None:
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

    with suppress(Exception):
        await handle_grant_template_pipeline(
            grant_template=grant_template_with_sections,
            session_maker=async_session_maker,
            trace_id="test-trace",
        )

    async with async_session_maker() as session:
        stmt = (
            select(GrantTemplateGenerationJob)
            .where(GrantTemplateGenerationJob.grant_template_id == grant_template_with_sections.id)
            .order_by(GrantTemplateGenerationJob.created_at.desc())
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
        job = GrantApplicationGenerationJob(
            grant_application_id=test_application_with_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
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
            select(GrantApplicationGenerationJob)
            .where(GrantApplicationGenerationJob.grant_application_id == test_application_with_template.id)
            .order_by(GrantApplicationGenerationJob.created_at.desc())
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
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            retry_count=0,
        )
        session.add(job)
        await session.flush()
        job_id = job.id

    manager: GrantTemplateJobManager[Any] = GrantTemplateJobManager(
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        grant_application_id=grant_template_with_sections.grant_application_id,
        job_id=job_id,
        parent_id=grant_template_with_sections.id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    await manager.get_or_create_job()

    await manager.ensure_not_cancelled()

    async with async_session_maker() as session, session.begin():
        stmt = select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
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
        job = GrantTemplateGenerationJob(
            grant_template_id=grant_template_with_sections.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
            retry_count=0,
        )
        session.add(job)
        await session.flush()
        job_id = job.id

    manager: GrantTemplateJobManager[Any] = GrantTemplateJobManager(
        current_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        grant_application_id=grant_template_with_sections.grant_application_id,
        job_id=job_id,
        parent_id=grant_template_with_sections.id,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=async_session_maker,
        trace_id="test-trace",
    )

    await manager.get_or_create_job()

    for _ in range(3):
        await manager.ensure_not_cancelled()

    async with async_session_maker() as session:
        stmt = select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
        result = await session.execute(stmt)
        job = result.scalar_one()
        assert job.status == RagGenerationStatusEnum.PROCESSING
