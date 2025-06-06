import asyncio
from unittest.mock import Mock, patch
from uuid import UUID

import pytest
from google.cloud.pubsub_v1.publisher.exceptions import MessageTooLargeError

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import (
    CrawlingRequest,
    PubSubEvent,
    PubSubMessage,
    SourceProcessingResult,
    get_publisher_client,
    get_subscriber_client,
    publish_source_processing_message,
    publish_url_crawling_task,
    pull_source_processing_notifications,
)

logger = get_logger(__name__)


@pytest.fixture
def mock_publisher_client() -> Mock:
    client = Mock()
    client.topic_path.return_value = "projects/test-project/topics/test-topic"
    future = Mock()
    future.result.return_value = "test-message-id"
    client.publish.return_value = future
    return client


@pytest.fixture
def mock_subscriber_client() -> Mock:
    client = Mock()
    client.subscription_path.return_value = "projects/test-project/subscriptions/test-subscription"
    return client


@pytest.fixture(autouse=True)
def reset_client_refs() -> None:
    from packages.shared_utils.src.pubsub import client_ref, subscriber_client_ref

    client_ref.value = None
    subscriber_client_ref.value = None


class TestGetPublisherClient:
    def test_creates_client_once(self) -> None:
        with patch("packages.shared_utils.src.pubsub.pubsub.PublisherClient") as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client

            client1 = get_publisher_client()
            client2 = get_publisher_client()

            assert client1 is client2
            assert client1 is mock_client
            mock_client_class.assert_called_once()


class TestGetSubscriberClient:
    def test_creates_client_once(self) -> None:
        with patch("packages.shared_utils.src.pubsub.pubsub.SubscriberClient") as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client

            client1 = get_subscriber_client()
            client2 = get_subscriber_client()

            assert client1 is client2
            assert client1 is mock_client
            mock_client_class.assert_called_once()


class TestPublishUrlCrawlingTask:
    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_success(self, mock_publisher_client: Mock) -> None:
        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
            workspace_id = UUID("223e4567-e89b-12d3-a456-426614174000")

            result = await publish_url_crawling_task(
                logger=logger,
                url="https://example.com",
                parent_type="grant_application",
                parent_id=parent_id,
                workspace_id=workspace_id,
            )

            assert result == "test-message-id"
            mock_publisher_client.topic_path.assert_called_once_with(project="grantflow", topic="url-crawling")
            mock_publisher_client.publish.assert_called_once()
            _, kwargs = mock_publisher_client.publish.call_args
            assert kwargs["topic"] == "projects/test-project/topics/test-topic"
            assert b"https://example.com" in kwargs["data"]

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_without_workspace_id(self, mock_publisher_client: Mock) -> None:
        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

            result = await publish_url_crawling_task(
                logger=logger,
                url="https://example.com",
                parent_type="funding_organization",
                parent_id=parent_id,
            )

            assert result == "test-message-id"
            mock_publisher_client.publish.assert_called_once()
            _, kwargs = mock_publisher_client.publish.call_args
            assert b"workspace_id" not in kwargs["data"]

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_message_too_large(self, mock_publisher_client: Mock) -> None:
        mock_publisher_client.publish.side_effect = MessageTooLargeError("Message too large")

        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            with pytest.raises(BackendError) as exc_info:
                await publish_url_crawling_task(
                    logger=logger,
                    url="https://example.com" + "x" * 10000000,
                    parent_type="grant_application",
                    parent_id="123e4567-e89b-12d3-a456-426614174000",
                )

            assert "Error publishing URL crawling message" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_with_string_ids(self, mock_publisher_client: Mock) -> None:
        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            result = await publish_url_crawling_task(
                logger=logger,
                url="https://example.com",
                parent_type="grant_template",
                parent_id="123e4567-e89b-12d3-a456-426614174000",
                workspace_id="223e4567-e89b-12d3-a456-426614174000",
            )

            assert result == "test-message-id"
            mock_publisher_client.publish.assert_called_once()


class TestPublishSourceProcessingMessage:
    @pytest.mark.asyncio
    async def test_publish_source_processing_message_success(self, mock_publisher_client: Mock) -> None:
        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
            rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

            result = await publish_source_processing_message(
                logger=logger,
                parent_id=parent_id,
                parent_type="grant_application",
                rag_source_id=rag_source_id,
                indexing_status=SourceIndexingStatusEnum.FINISHED,
                identifier="test_file.pdf",
            )

            assert result == "test-message-id"
            mock_publisher_client.topic_path.assert_called_once_with(project="grantflow", topic="source-processing")
            mock_publisher_client.publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_source_processing_message_with_url_identifier(self, mock_publisher_client: Mock) -> None:
        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
            rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

            result = await publish_source_processing_message(
                logger=logger,
                parent_id=parent_id,
                parent_type="funding_organization",
                rag_source_id=rag_source_id,
                indexing_status=SourceIndexingStatusEnum.INDEXING,
                identifier="https://example.com/guidelines",
            )

            assert result == "test-message-id"
            mock_publisher_client.publish.assert_called_once()
            _, kwargs = mock_publisher_client.publish.call_args
            assert b"https://example.com/guidelines" in kwargs["data"]

    @pytest.mark.asyncio
    async def test_publish_source_processing_message_failed_status(self, mock_publisher_client: Mock) -> None:
        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
            rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

            result = await publish_source_processing_message(
                logger=logger,
                parent_id=parent_id,
                parent_type="grant_template",
                rag_source_id=rag_source_id,
                indexing_status=SourceIndexingStatusEnum.FAILED,
                identifier="template.docx",
            )

            assert result == "test-message-id"
            mock_publisher_client.publish.assert_called_once()
            _, kwargs = mock_publisher_client.publish.call_args
            assert b"FAILED" in kwargs["data"]

    @pytest.mark.asyncio
    async def test_publish_source_processing_message_too_large(self, mock_publisher_client: Mock) -> None:
        mock_publisher_client.publish.side_effect = MessageTooLargeError("Message too large")

        with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
            with pytest.raises(BackendError) as exc_info:
                await publish_source_processing_message(
                    logger=logger,
                    parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
                    parent_type="grant_application",
                    rag_source_id=UUID("323e4567-e89b-12d3-a456-426614174000"),
                    indexing_status=SourceIndexingStatusEnum.FINISHED,
                    identifier="document.pdf",
                )

            assert "Error publishing source processing message" in str(exc_info.value)


class TestPullSourceProcessingNotifications:
    @pytest.mark.asyncio
    async def test_pull_notifications_success(self, mock_subscriber_client: Mock) -> None:
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        message1 = Mock()
        message1.message.data = (
            b'{"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
            b'"parent_type":"grant_application",'
            b'"rag_source_id":"323e4567-e89b-12d3-a456-426614174000",'
            b'"indexing_status":"FINISHED",'
            b'"identifier":"test_file.pdf"}'
        )
        message1.ack = Mock()
        message1.nack = Mock()

        message2 = Mock()
        message2.message.data = (
            b'{"parent_id":"999e4567-e89b-12d3-a456-426614174000",'
            b'"parent_type":"grant_application",'
            b'"rag_source_id":"423e4567-e89b-12d3-a456-426614174000",'
            b'"indexing_status":"FINISHED",'
            b'"identifier":"other_file.pdf"}'
        )
        message2.ack = Mock()
        message2.nack = Mock()

        pull_response = Mock()
        pull_response.received_messages = [message1, message2]

        pull_result = Mock()
        pull_result.result.return_value = pull_response

        mock_subscriber_client.pull.return_value = pull_result

        with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
            results = await pull_source_processing_notifications(
                logger=logger,
                parent_id=parent_id,
            )

            assert len(results) == 1
            assert results[0]["parent_id"] == parent_id
            assert results[0]["rag_source_id"] == rag_source_id
            assert results[0]["indexing_status"] == SourceIndexingStatusEnum.FINISHED

            message1.ack.assert_called_once()
            message1.nack.assert_not_called()
            message2.ack.assert_not_called()
            message2.nack.assert_called_once()

            mock_subscriber_client.subscription_path.assert_called_once_with(
                project="grantflow", subscription="source-processing-notifications-sub"
            )

    @pytest.mark.asyncio
    async def test_pull_notifications_with_identifier(self, mock_subscriber_client: Mock) -> None:
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

        message = Mock()
        message.message.data = (
            b'{"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
            b'"parent_type":"grant_application",'
            b'"rag_source_id":"323e4567-e89b-12d3-a456-426614174000",'
            b'"indexing_status":"FINISHED",'
            b'"identifier":"https://example.com/document"}'
        )
        message.ack = Mock()
        message.nack = Mock()

        pull_response = Mock()
        pull_response.received_messages = [message]

        pull_result = Mock()
        pull_result.result.return_value = pull_response

        mock_subscriber_client.pull.return_value = pull_result

        with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
            results = await pull_source_processing_notifications(
                logger=logger,
                parent_id=parent_id,
            )

            assert len(results) == 1
            assert results[0]["identifier"] == "https://example.com/document"
            message.ack.assert_called_once()

    @pytest.mark.asyncio
    async def test_pull_notifications_invalid_message(self, mock_subscriber_client: Mock) -> None:
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

        message = Mock()
        message.message.data = b"invalid json"
        message.ack = Mock()
        message.nack = Mock()

        pull_response = Mock()
        pull_response.received_messages = [message]

        pull_result = Mock()
        pull_result.result.return_value = pull_response

        mock_subscriber_client.pull.return_value = pull_result

        with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
            results = await pull_source_processing_notifications(
                logger=logger,
                parent_id=parent_id,
            )

            assert len(results) == 0
            message.ack.assert_not_called()
            message.nack.assert_called_once()

    @pytest.mark.asyncio
    async def test_pull_notifications_empty_response(self, mock_subscriber_client: Mock) -> None:
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

        pull_response = Mock()
        pull_response.received_messages = []

        pull_result = Mock()
        pull_result.result.return_value = pull_response

        mock_subscriber_client.pull.return_value = pull_result

        with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
            results = await pull_source_processing_notifications(
                logger=logger,
                parent_id=parent_id,
            )

            assert len(results) == 0

    @pytest.mark.asyncio
    async def test_pull_notifications_timeout(self, mock_subscriber_client: Mock) -> None:
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

        pull_result = Mock()
        pull_result.result.side_effect = TimeoutError()

        mock_subscriber_client.pull.return_value = pull_result

        with (
            patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client),
            pytest.raises(asyncio.TimeoutError),
        ):
            await pull_source_processing_notifications(
                logger=logger,
                parent_id=parent_id,
            )


class TestTypeDefinitions:
    def test_pubsub_message_typed_dict(self) -> None:
        message: PubSubMessage = {
            "message_id": "test-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": "test-data",
            "attributes": {"key": "value"},
        }
        assert message["message_id"] == "test-id"

    def test_pubsub_event_typed_dict(self) -> None:
        event: PubSubEvent = {
            "message": {
                "message_id": "test-id",
                "publish_time": "2023-01-01T00:00:00Z",
                "data": "test-data",
                "attributes": {"key": "value"},
            }
        }
        assert event["message"]["message_id"] == "test-id"

    def test_crawling_request_typed_dict(self) -> None:
        request: CrawlingRequest = {
            "parent_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
            "parent_type": "grant_application",
            "url": "https://example.com",
        }
        assert request["url"] == "https://example.com"

        request_with_workspace: CrawlingRequest = {
            "parent_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
            "parent_type": "grant_template",
            "workspace_id": UUID("223e4567-e89b-12d3-a456-426614174000"),
            "url": "https://example.com",
        }
        assert "workspace_id" in request_with_workspace

    def test_source_processing_result_typed_dict(self) -> None:
        result: SourceProcessingResult = {
            "parent_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
            "parent_type": "funding_organization",
            "rag_source_id": UUID("323e4567-e89b-12d3-a456-426614174000"),
            "indexing_status": SourceIndexingStatusEnum.FINISHED,
            "identifier": "guidelines.pdf",
        }
        assert result["indexing_status"] == SourceIndexingStatusEnum.FINISHED
        assert result["identifier"] == "guidelines.pdf"

        result_with_url: SourceProcessingResult = {
            "parent_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
            "parent_type": "grant_application",
            "rag_source_id": UUID("323e4567-e89b-12d3-a456-426614174000"),
            "indexing_status": SourceIndexingStatusEnum.INDEXING,
            "identifier": "https://example.com/document",
        }
        assert result_with_url["identifier"] == "https://example.com/document"
