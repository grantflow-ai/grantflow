from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantApplication, GrantTemplate, RagSource
from packages.shared_utils.src.exceptions import DatabaseError, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import NotificationEvents
from services.rag.src.utils.checks import verify_rag_sources_indexed


@pytest.fixture
def mock_session_maker() -> AsyncMock:
    mock = AsyncMock(spec=async_sessionmaker)

    mock_context = AsyncMock()
    mock_context.__aenter__ = AsyncMock()
    mock_context.__aexit__ = AsyncMock(return_value=None)
    mock.return_value = mock_context
    return mock


@pytest.fixture
def mock_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_publish_notification() -> AsyncMock:
    return AsyncMock(return_value="message-id-123")


def create_mock_rag_source(
    source_id: UUID | None = None,
    indexing_status: SourceIndexingStatusEnum = SourceIndexingStatusEnum.FINISHED,
) -> MagicMock:
    source = MagicMock(spec=RagSource)
    source.id = source_id or uuid4()
    source.indexing_status = indexing_status
    return source


class TestVerifyRagSourcesIndexed:
    async def test_all_sources_finished_grant_application(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        mock_publish_notification.assert_not_called()
        assert mock_session.scalars.call_count == 1

    async def test_all_sources_finished_grant_template(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantTemplate)

        mock_publish_notification.assert_not_called()
        assert mock_session.scalars.call_count == 1

    async def test_sources_still_indexing(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()

        mock_sources_indexing = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.INDEXING),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_sources_finished = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(side_effect=[iter(mock_sources_indexing), iter(mock_sources_finished)])

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            patch("services.rag.src.utils.checks.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_IN_PROGRESS
        assert notification_call.kwargs["parent_id"] == parent_id
        assert "Document indexing in progress" in notification_call.kwargs["data"].message
        assert notification_call.kwargs["data"].data["wait_time"] == 0

        mock_sleep.assert_called_once_with(10)

    async def test_sources_created_status(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()

        mock_sources_created = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.CREATED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_sources_finished = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(side_effect=[iter(mock_sources_created), iter(mock_sources_finished)])

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            patch("services.rag.src.utils.checks.sleep", new_callable=AsyncMock) as mock_sleep,
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantTemplate)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_IN_PROGRESS

        mock_sleep.assert_called_once_with(10)

    async def test_all_sources_failed_grant_application(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError) as exc_info,
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
        assert notification_call.kwargs["parent_id"] == parent_id
        assert "Document indexing failed" in notification_call.kwargs["data"].message
        assert notification_call.kwargs["data"].data["failed_count"] == 2
        assert notification_call.kwargs["data"].data["total_count"] == 2
        assert notification_call.kwargs["data"].data["recoverable"] is True

        assert "All rag sources have failed to be indexed" in str(exc_info.value)
        assert exc_info.value.context["grant_application_id"] == str(parent_id)
        assert exc_info.value.context["failed_sources"] == 2
        assert exc_info.value.context["total_sources"] == 2
        assert exc_info.value.context["error_type"] == "indexing_failure"

    async def test_all_sources_failed_grant_template(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError) as exc_info,
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantTemplate)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
        assert notification_call.kwargs["data"].data["failed_count"] == 3
        assert notification_call.kwargs["data"].data["total_count"] == 3

        assert exc_info.value.context["grant_template_id"] == str(parent_id)
        assert exc_info.value.context["failed_sources"] == 3

    async def test_partial_failure_no_finished(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError),
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        assert mock_publish_notification.call_count == 1

    async def test_database_error(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(side_effect=SQLAlchemyError("Database connection failed"))

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(DatabaseError) as exc_info,
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        assert "Error verifying rag sources indexed" in str(exc_info.value)
        assert "Database connection failed" in exc_info.value.context
        mock_publish_notification.assert_not_called()

    async def test_recursive_waiting_with_timeout(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()

        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.INDEXING),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        call_count = 0
        original_verify = verify_rag_sources_indexed

        async def mock_verify(*args: Any, **kwargs: Any) -> None:
            nonlocal call_count
            call_count += 1

            if call_count >= 3:
                return
            await original_verify(*args, **kwargs)

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            patch("services.rag.src.utils.checks.sleep", new_callable=AsyncMock),
            patch("services.rag.src.utils.checks.verify_rag_sources_indexed", side_effect=mock_verify),
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantTemplate)

        assert mock_publish_notification.call_count >= 2

        first_call = mock_publish_notification.call_args_list[0]
        assert first_call.kwargs["data"].data["wait_time"] == 0

        if len(mock_publish_notification.call_args_list) > 1:
            second_call = mock_publish_notification.call_args_list[1]
            assert second_call.kwargs["data"].data["wait_time"] == 10

    async def test_empty_sources_list(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources: list[Any] = []

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with (
            patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification),
            pytest.raises(ValidationError),
        ):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        assert mock_publish_notification.call_count == 1
        notification_call = mock_publish_notification.call_args
        assert notification_call.kwargs["event"] == NotificationEvents.INDEXING_FAILED
        assert notification_call.kwargs["data"].data["failed_count"] == 0
        assert notification_call.kwargs["data"].data["total_count"] == 0

    async def test_mixed_statuses_with_at_least_one_finished(
        self,
        mock_session_maker: AsyncMock,
        mock_session: AsyncMock,
        mock_publish_notification: AsyncMock,
    ) -> None:
        parent_id = uuid4()
        mock_sources = [
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FAILED),
            create_mock_rag_source(indexing_status=SourceIndexingStatusEnum.FINISHED),
        ]

        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_session.scalars = AsyncMock(return_value=iter(mock_sources))

        with patch("services.rag.src.utils.checks.publish_notification", mock_publish_notification):
            await verify_rag_sources_indexed(parent_id, mock_session_maker, GrantApplication)

        mock_publish_notification.assert_not_called()
