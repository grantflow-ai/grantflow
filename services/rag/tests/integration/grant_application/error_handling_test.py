from typing import Any
from unittest.mock import patch

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, RagGenerationJob
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

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
        assert "ValidationError" in job.error_message


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
        assert "ValidationError" in job.error_message


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
        assert "ValidationError" in job.error_message


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
        current_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
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
        assert "ValidationError" in job.error_message
