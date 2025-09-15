from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    GrantTemplateSource,
    RagSource,
)
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    RagSourceFactory,
)

from services.rag.src.utils.checks import verify_rag_sources_indexed


@pytest.fixture
def mock_publish_notification() -> AsyncMock:
    return AsyncMock(return_value="message-id-123")


async def create_rag_source_with_status(
    session: Any,
    indexing_status: SourceIndexingStatusEnum = SourceIndexingStatusEnum.FINISHED,
) -> RagSource:
    source = RagSourceFactory.build(indexing_status=indexing_status)
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
    mock_publish_notification: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await session.commit()

    with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
        await verify_rag_sources_indexed(grant_application.id, async_session_maker, GrantApplication)

    mock_publish_notification.assert_not_called()


async def test_all_sources_finished_grant_template(
    grant_template_with_sections: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    mock_publish_notification: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

        await link_source_to_template(session, grant_template_with_sections.id, source1.id)
        await link_source_to_template(session, grant_template_with_sections.id, source2.id)
        await session.commit()

    with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
        await verify_rag_sources_indexed(grant_template_with_sections.id, async_session_maker, GrantTemplate)

    mock_publish_notification.assert_not_called()


# TODO: Convert this complex recursive test - requires mocking the state change

# TODO: Convert this complex recursive test - requires mocking the state change


async def test_all_sources_failed_grant_application(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    mock_publish_notification: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await session.commit()

    with (
        patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
        pytest.raises(ValidationError) as exc_info,
    ):
        await verify_rag_sources_indexed(grant_application.id, async_session_maker, GrantApplication)

    assert mock_publish_notification.call_count == 1
    notification_call = mock_publish_notification.call_args
    assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
    assert notification_call.kwargs["parent_id"] == grant_application.id
    assert "Document indexing failed" in notification_call.kwargs["data"]["message"]
    assert notification_call.kwargs["data"]["data"]["failed_count"] == 2
    assert notification_call.kwargs["data"]["data"]["total_count"] == 2
    assert notification_call.kwargs["data"]["data"]["recoverable"] is True

    assert "All rag sources have failed to be indexed" in str(exc_info.value)
    assert exc_info.value.context["grant_application_id"] == str(grant_application.id)
    assert exc_info.value.context["failed_sources"] == 2
    assert exc_info.value.context["total_sources"] == 2
    assert exc_info.value.context["error_type"] == "indexing_failure"


async def test_all_sources_failed_grant_template(
    grant_template_with_sections: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    mock_publish_notification: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

        await link_source_to_template(session, grant_template_with_sections.id, source1.id)
        await link_source_to_template(session, grant_template_with_sections.id, source2.id)
        await link_source_to_template(session, grant_template_with_sections.id, source3.id)
        await session.commit()

    with (
        patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
        pytest.raises(ValidationError) as exc_info,
    ):
        await verify_rag_sources_indexed(grant_template_with_sections.id, async_session_maker, GrantTemplate)

    assert mock_publish_notification.call_count == 1
    notification_call = mock_publish_notification.call_args
    assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
    assert notification_call.kwargs["data"]["data"]["failed_count"] == 3
    assert notification_call.kwargs["data"]["data"]["total_count"] == 3

    assert exc_info.value.context["grant_template_id"] == str(grant_template_with_sections.id)
    assert exc_info.value.context["failed_sources"] == 3


# TODO: Convert this test to use real database

# TODO: Convert this test to use real database

# TODO: Convert this complex recursive test - requires mocking the recursive behavior


async def test_empty_sources_list(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    mock_publish_notification: AsyncMock,
) -> None:
    with (
        patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
        pytest.raises(ValidationError),
    ):
        await verify_rag_sources_indexed(grant_application.id, async_session_maker, GrantApplication)

    assert mock_publish_notification.call_count == 1
    notification_call = mock_publish_notification.call_args
    assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
    assert notification_call.kwargs["data"]["data"]["failed_count"] == 0
    assert notification_call.kwargs["data"]["data"]["total_count"] == 0


async def test_mixed_statuses_with_at_least_one_finished(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    mock_publish_notification: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
        source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
        source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

        await link_source_to_application(session, grant_application.id, source1.id)
        await link_source_to_application(session, grant_application.id, source2.id)
        await link_source_to_application(session, grant_application.id, source3.id)
        await session.commit()

    with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
        await verify_rag_sources_indexed(grant_application.id, async_session_maker, GrantApplication)

    mock_publish_notification.assert_not_called()
