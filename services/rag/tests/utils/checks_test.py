from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    RagSource,
)
from packages.shared_utils.src.exceptions import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationFactory,
    GrantTemplateFactory,
    RagSourceFactory,
    WorkspaceFactory,
)

from services.rag.src.constants import NotificationEvents
from services.rag.src.utils.checks import verify_rag_sources_indexed


@pytest.fixture
async def test_workspace(async_session_maker: async_sessionmaker[Any]) -> tuple[Any, Any]:
    async with async_session_maker() as session:
        workspace = WorkspaceFactory.build()
        session.add(workspace)
        await session.flush()
        return workspace, session


@pytest.fixture
async def test_grant_application(
    async_session_maker: async_sessionmaker[Any],
) -> GrantApplication:
    async with async_session_maker() as session:
        workspace = WorkspaceFactory.build()
        session.add(workspace)
        await session.flush()

        application = GrantApplicationFactory.build(workspace_id=workspace.id)
        session.add(application)
        await session.commit()
        return application


@pytest.fixture
async def test_grant_template(
    async_session_maker: async_sessionmaker[Any],
) -> GrantTemplate:
    async with async_session_maker() as session:
        workspace = WorkspaceFactory.build()
        session.add(workspace)
        await session.flush()

        application = GrantApplicationFactory.build(workspace_id=workspace.id)
        session.add(application)
        await session.flush()

        template = GrantTemplateFactory.build(grant_application_id=application.id, funding_organization_id=None)
        session.add(template)
        await session.commit()
        return template


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
    link = GrantApplicationRagSource(grant_application_id=application_id, rag_source_id=source_id)
    session.add(link)
    await session.flush()


async def link_source_to_template(session: Any, template_id: Any, source_id: Any) -> None:
    link = GrantTemplateRagSource(grant_template_id=template_id, rag_source_id=source_id)
    session.add(link)
    await session.flush()


class TestVerifyRagSourcesIndexed:
    async def test_all_sources_finished_grant_application(
        self,
        test_grant_application: GrantApplication,
        async_session_maker: async_sessionmaker[Any],
        mock_publish_notification: AsyncMock,
    ) -> None:
        async with async_session_maker() as session:
            # Create two finished sources
            source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
            source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

            # Link them to the application
            await link_source_to_application(session, test_grant_application.id, source1.id)
            await link_source_to_application(session, test_grant_application.id, source2.id)
            await session.commit()

        with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
            await verify_rag_sources_indexed(test_grant_application.id, async_session_maker, GrantApplication)

        mock_publish_notification.assert_not_called()

    async def test_all_sources_finished_grant_template(
        self,
        test_grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        mock_publish_notification: AsyncMock,
    ) -> None:
        async with async_session_maker() as session:
            # Create two finished sources
            source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
            source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

            # Link them to the template
            await link_source_to_template(session, test_grant_template.id, source1.id)
            await link_source_to_template(session, test_grant_template.id, source2.id)
            await session.commit()

        with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
            await verify_rag_sources_indexed(test_grant_template.id, async_session_maker, GrantTemplate)

        mock_publish_notification.assert_not_called()

    # TODO: Convert this complex recursive test - requires mocking the state change
    # async def test_sources_still_indexing(...)

    # TODO: Convert this complex recursive test - requires mocking the state change
    # async def test_sources_created_status(...)

    async def test_all_sources_failed_grant_application(
        self,
        test_grant_application: GrantApplication,
        async_session_maker: async_sessionmaker[Any],
        mock_publish_notification: AsyncMock,
    ) -> None:
        async with async_session_maker() as session:
            # Create two failed sources
            source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
            source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

            # Link them to the application
            await link_source_to_application(session, test_grant_application.id, source1.id)
            await link_source_to_application(session, test_grant_application.id, source2.id)
            await session.commit()

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError) as exc_info,
        ):
            await verify_rag_sources_indexed(test_grant_application.id, async_session_maker, GrantApplication)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
        assert notification_call.kwargs["parent_id"] == test_grant_application.id
        assert "Document indexing failed" in notification_call.kwargs["data"]["message"]
        assert notification_call.kwargs["data"]["data"]["failed_count"] == 2
        assert notification_call.kwargs["data"]["data"]["total_count"] == 2
        assert notification_call.kwargs["data"]["data"]["recoverable"] is True

        assert "All rag sources have failed to be indexed" in str(exc_info.value)
        assert exc_info.value.context["grant_application_id"] == str(test_grant_application.id)
        assert exc_info.value.context["failed_sources"] == 2
        assert exc_info.value.context["total_sources"] == 2
        assert exc_info.value.context["error_type"] == "indexing_failure"

    async def test_all_sources_failed_grant_template(
        self,
        test_grant_template: GrantTemplate,
        async_session_maker: async_sessionmaker[Any],
        mock_publish_notification: AsyncMock,
    ) -> None:
        async with async_session_maker() as session:
            # Create three failed sources
            source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
            source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
            source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)

            # Link them to the template
            await link_source_to_template(session, test_grant_template.id, source1.id)
            await link_source_to_template(session, test_grant_template.id, source2.id)
            await link_source_to_template(session, test_grant_template.id, source3.id)
            await session.commit()

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError) as exc_info,
        ):
            await verify_rag_sources_indexed(test_grant_template.id, async_session_maker, GrantTemplate)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
        assert notification_call.kwargs["data"]["data"]["failed_count"] == 3
        assert notification_call.kwargs["data"]["data"]["total_count"] == 3

        assert exc_info.value.context["grant_template_id"] == str(test_grant_template.id)
        assert exc_info.value.context["failed_sources"] == 3

    # TODO: Convert this test to use real database
    # async def test_partial_failure_no_finished(...)

    # TODO: Convert this test to use real database
    # async def test_database_error(...)

    # TODO: Convert this complex recursive test - requires mocking the recursive behavior
    # async def test_recursive_waiting_with_timeout(...)

    async def test_empty_sources_list(
        self,
        test_grant_application: GrantApplication,
        async_session_maker: async_sessionmaker[Any],
        mock_publish_notification: AsyncMock,
    ) -> None:
        # No sources are linked to the application, so it should fail

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError),
        ):
            await verify_rag_sources_indexed(test_grant_application.id, async_session_maker, GrantApplication)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
        assert notification_call.kwargs["data"]["data"]["failed_count"] == 0
        assert notification_call.kwargs["data"]["data"]["total_count"] == 0

    async def test_mixed_statuses_with_at_least_one_finished(
        self,
        test_grant_application: GrantApplication,
        async_session_maker: async_sessionmaker[Any],
        mock_publish_notification: AsyncMock,
    ) -> None:
        async with async_session_maker() as session:
            # Create mixed status sources
            source1 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)
            source2 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FAILED)
            source3 = await create_rag_source_with_status(session, SourceIndexingStatusEnum.FINISHED)

            # Link them to the application
            await link_source_to_application(session, test_grant_application.id, source1.id)
            await link_source_to_application(session, test_grant_application.id, source2.id)
            await link_source_to_application(session, test_grant_application.id, source3.id)
            await session.commit()

        with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
            await verify_rag_sources_indexed(test_grant_application.id, async_session_maker, GrantApplication)

        mock_publish_notification.assert_not_called()
