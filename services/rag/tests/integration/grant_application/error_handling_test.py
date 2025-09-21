from typing import Any
from unittest.mock import patch

import pytest
from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.enums import GrantApplicationStageEnum
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

    with pytest.raises(ValidationError, match="CFP analysis is missing"):
        await handle_grant_application_pipeline(
            grant_application=app,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )


async def test_pipeline_missing_research_objectives(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, test_application_with_template.id)
        assert app
        app.research_objectives = []
        await session.commit()

    with pytest.raises(ValidationError, match="research objectives"):
        await handle_grant_application_pipeline(
            grant_application=app,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )


async def test_pipeline_validation_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    job_manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )
    with patch(
        "services.rag.src.grant_application.pipeline.verify_rag_sources_indexed",
        side_effect=ValidationError("Indexing timeout"),
    ):
        await handle_grant_application_pipeline(
            grant_application=test_application_with_template,
            generation_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "Document indexing is taking longer than expected" in job.error_message


async def test_pipeline_database_error_during_save(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    job_manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN,
        pipeline_stages=[],
    )
    with patch(
        "services.rag.src.grant_application.pipeline.update",
        side_effect=SQLAlchemyError("DB error"),
    ):
        await handle_grant_application_pipeline(
            grant_application=test_application_with_template,
            generation_stage=GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN,
            session_maker=async_session_maker,
            trace_id=trace_id,
        )

    async with async_session_maker():
        job = await job_manager.get_or_create_job()
        assert job
        assert job.status == RagGenerationStatusEnum.FAILED
        assert job.error_message is not None
        assert "Database error occurred" in job.error_message


async def test_pipeline_backend_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: TraceId,
) -> None:
    job_manager: GrantApplicationJobManager[Any] = GrantApplicationJobManager(
        grant_application_id=test_application_with_template.id,
        parent_id=test_application_with_template.id,
        session_maker=async_session_maker,
        trace_id=trace_id,
        current_stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        pipeline_stages=[],
    )
    with patch(
        "services.rag.src.grant_application.pipeline.handle_generate_sections_stage",
        side_effect=BackendError("LLM error"),
    ):
        await handle_grant_application_pipeline(
            grant_application=test_application_with_template,
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
