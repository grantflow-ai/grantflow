from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.grant_application.handler import (
    grant_application_text_generation_pipeline_handler,
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


async def test_pipeline_missing_grant_template(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    # Remove the grant template from the existing application
    async with async_session_maker() as session:
        result = await session.execute(
            select(GrantApplication)
            .options(selectinload(GrantApplication.grant_template))
            .where(GrantApplication.id == test_application_with_template.id)
        )
        app = result.scalar_one()

        assert app is not None
        # Remove the grant template relationship
        app.grant_template = None
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application_with_template.id,
            session_maker=async_session_maker,
            job_manager=create_mock_job_manager(),
        )

    assert "grant template" in str(exc_info.value).lower()


async def test_pipeline_missing_research_objectives(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    # Modify the existing application to remove research objectives
    async with async_session_maker() as session:
        result = await session.execute(
            select(GrantApplication)
            .options(selectinload(GrantApplication.grant_template))
            .where(GrantApplication.id == test_application_with_template.id)
        )
        app = result.scalar_one()

        assert app is not None
        # Remove research objectives
        app.research_objectives = []
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application_with_template.id,
            session_maker=async_session_maker,
            job_manager=create_mock_job_manager(),
        )

    assert "research objectives" in str(exc_info.value).lower()


async def test_pipeline_missing_work_plan_section(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    test_application = test_application_with_template
    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        async with async_session_maker() as session:
            result = await session.execute(
                select(GrantApplication)
                .options(selectinload(GrantApplication.grant_template))
                .where(GrantApplication.id == test_application.id)
            )
            app = result.scalar_one()

            assert app is not None
            assert app.grant_template is not None

            app.grant_template.grant_sections = [
                s for s in app.grant_template.grant_sections if not s.get("is_detailed_research_plan")
            ]
            await session.commit()

        with pytest.raises(ValidationError) as exc_info:
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=test_application.id,
                session_maker=async_session_maker,
                job_manager=create_mock_job_manager(),
            )

        assert "work plan section" in str(exc_info.value).lower()


async def test_pipeline_database_error_during_save(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mocked_section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
    }

    mock_job_manager = create_mock_job_manager()

    with (
        patch(
            "services.rag.src.grant_application.handler.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_section_text",
            return_value=mocked_section_texts,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_application_text",
            return_value="Complete application text",
        ),
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch(
            "services.rag.src.grant_application.handler.update",
            side_effect=SQLAlchemyError("Database connection failed"),
        ),
    ):
        with pytest.raises(DatabaseError) as exc_info:
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=test_application_with_template.id,
                session_maker=async_session_maker,
                job_manager=mock_job_manager,
            )

        assert "failed to update grant application text" in str(exc_info.value).lower()


async def test_pipeline_backend_error_during_generation(
    test_application_with_template: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mock_job_manager = create_mock_job_manager()

    with (
        patch(
            "services.rag.src.grant_application.handler.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_section_text",
            side_effect=BackendError("LLM service unavailable"),
        ),
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
    ):
        with pytest.raises(BackendError) as exc_info:
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=test_application_with_template.id,
                session_maker=async_session_maker,
                job_manager=mock_job_manager,
            )

        assert "llm service unavailable" in str(exc_info.value).lower()
