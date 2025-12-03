from typing import Any

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    GrantTemplateSource,
    RagSource,
)
from packages.shared_utils.src.exceptions import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    RagFileFactory,
)

from services.rag.src.utils.checks import verify_rag_sources_indexed


async def create_rag_source_with_status(
    session: Any,
    indexing_status: SourceIndexingStatusEnum = SourceIndexingStatusEnum.FINISHED,
) -> RagSource:
    source = RagFileFactory.build(indexing_status=indexing_status)
    session.add(source)
    await session.flush()
    return source


async def link_source_to_application(session: Any, application_id: Any, source_id: Any) -> None:
    link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=source_id)
    session.add(link)
    await session.flush()


async def link_source_to_template(session: Any, template_id: Any, source_id: Any) -> None:
    link = GrantTemplateSource(grant_template_id=template_id, rag_source_id=source_id)
    session.add(link)
    await session.flush()


async def test_all_sources_finished_grant_application(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await session.commit()

        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )


async def test_all_sources_finished_grant_template(
    grant_template_with_sections: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

        await link_source_to_template(session, grant_template_with_sections.id, source1.id)
        await link_source_to_template(session, grant_template_with_sections.id, source2.id)
        await session.commit()

        await verify_rag_sources_indexed(
            grant_template_with_sections.id,
            async_session_maker,
            GrantTemplate,
            trace_id,
        )


# TODO: Convert this complex recursive test - requires mocking the state change
async def test_all_sources_failed_grant_application(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )

    assert "Source indexing failed" in str(exc_info.value)
    assert exc_info.value.context["grant_application_id"] == str(grant_application.id)
    assert exc_info.value.context["failed_sources_count"] == 2
    assert exc_info.value.context["total_sources"] == 2
    assert exc_info.value.context["error_type"] == "indexing_failure"


async def test_all_sources_failed_grant_template(
    grant_template_with_sections: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

        await link_source_to_template(session, grant_template_with_sections.id, source1.id)
        await link_source_to_template(session, grant_template_with_sections.id, source2.id)
        await link_source_to_template(session, grant_template_with_sections.id, source3.id)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await verify_rag_sources_indexed(
            grant_template_with_sections.id,
            async_session_maker,
            GrantTemplate,
            trace_id,
        )

    assert exc_info.value.context["grant_template_id"] == str(grant_template_with_sections.id)
    assert exc_info.value.context["failed_sources_count"] == 3
    assert exc_info.value.context["total_sources"] == 3


# TODO: Convert this test to use real database

# TODO: Convert this test to use real database

# TODO: Convert this complex recursive test - requires mocking the recursive behavior


async def test_empty_sources_list(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    with pytest.raises(ValidationError):
        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )


async def test_mixed_statuses_with_at_least_one_finished(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await link_source_to_application(session, grant_application.id, source3.id)
        await session.commit()

        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )


async def test_pending_upload_sources_are_filtered(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test that PENDING_UPLOAD sources are ignored when other sources are finished."""
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await link_source_to_application(session, grant_application.id, source3.id)
        await session.commit()

        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )


async def test_only_pending_upload_sources_raises_error(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test that having only PENDING_UPLOAD sources raises a validation error."""
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )

    assert "No sources have been uploaded yet" in str(exc_info.value)
    assert exc_info.value.context["pending_upload_count"] == 2
    assert exc_info.value.context["parent_id"] == str(grant_application.id)


async def test_pending_upload_with_failed_sources(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test that PENDING_UPLOAD sources don't affect failed sources check."""
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await link_source_to_application(session, grant_application.id, source3.id)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await verify_rag_sources_indexed(
            grant_application.id,
            async_session_maker,
            GrantApplication,
            trace_id,
        )

    assert "Source indexing failed" in str(exc_info.value)
    assert exc_info.value.context["failed_sources_count"] == 2
    assert exc_info.value.context["total_sources"] == 2  # Only counts active sources


async def test_pending_upload_with_mixed_statuses_grant_template(
    grant_template_with_sections: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    """Test PENDING_UPLOAD filtering works for grant templates."""
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source4 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.PENDING_UPLOAD)

        await link_source_to_template(session, grant_template_with_sections.id, source1.id)
        await link_source_to_template(session, grant_template_with_sections.id, source2.id)
        await link_source_to_template(session, grant_template_with_sections.id, source3.id)
        await link_source_to_template(session, grant_template_with_sections.id, source4.id)
        await session.commit()

        await verify_rag_sources_indexed(
            grant_template_with_sections.id,
            async_session_maker,
            GrantTemplate,
            trace_id,
        )
