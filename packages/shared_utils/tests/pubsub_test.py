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
    WebsocketMessage,
    get_publisher_client,
    get_subscriber_client,
    publish_notification,
    publish_url_crawling_task,
    pull_notifications,
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


def test_get_publisher_client_creates_client_once() -> None:
    with patch("packages.shared_utils.src.pubsub.pubsub.PublisherClient") as mock_client_class:
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        client1 = get_publisher_client()
        client2 = get_publisher_client()

        assert client1 is client2
        assert client1 is mock_client
        mock_client_class.assert_called_once()


def test_get_subscriber_client_creates_client_once() -> None:
    with patch("packages.shared_utils.src.pubsub.pubsub.SubscriberClient") as mock_client_class:
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        client1 = get_subscriber_client()
        client2 = get_subscriber_client()

        assert client1 is client2
        assert client1 is mock_client
        mock_client_class.assert_called_once()


@pytest.mark.asyncio
async def test_publish_url_crawling_task_success(mock_publisher_client: Mock) -> None:
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
async def test_publish_url_crawling_task_without_workspace_id(mock_publisher_client: Mock) -> None:
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
async def test_publish_url_crawling_task_message_too_large(mock_publisher_client: Mock) -> None:
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
async def test_publish_url_crawling_task_with_string_ids(mock_publisher_client: Mock) -> None:
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


@pytest.mark.asyncio
async def test_publish_notification_success(mock_publisher_client: Mock) -> None:
    with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        test_data = SourceProcessingResult(
            parent_id=parent_id,
            parent_type="grant_application",
            rag_source_id=rag_source_id,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            identifier="test_file.pdf",
        )

        result = await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event="source_processing",
            data=test_data,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(project="grantflow", topic="frontend-notifications")
        mock_publisher_client.publish.assert_called_once()


@pytest.mark.asyncio
async def test_publish_notification_with_url_identifier(mock_publisher_client: Mock) -> None:
    with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        test_data = SourceProcessingResult(
            parent_id=parent_id,
            parent_type="funding_organization",
            rag_source_id=rag_source_id,
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            identifier="https://example.com/guidelines",
        )

        result = await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event="source_processing",
            data=test_data,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()
        _, kwargs = mock_publisher_client.publish.call_args
        assert b"https://example.com/guidelines" in kwargs["data"]


@pytest.mark.asyncio
async def test_publish_notification_failed_status(mock_publisher_client: Mock) -> None:
    with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        test_data = SourceProcessingResult(
            parent_id=parent_id,
            parent_type="grant_template",
            rag_source_id=rag_source_id,
            indexing_status=SourceIndexingStatusEnum.FAILED,
            identifier="template.docx",
        )

        result = await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event="source_processing",
            data=test_data,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()
        _, kwargs = mock_publisher_client.publish.call_args
        assert b"FAILED" in kwargs["data"]


@pytest.mark.asyncio
async def test_publish_notification_too_large(mock_publisher_client: Mock) -> None:
    mock_publisher_client.publish.side_effect = MessageTooLargeError("Message too large")

    with patch("packages.shared_utils.src.pubsub.get_publisher_client", return_value=mock_publisher_client):
        with pytest.raises(BackendError) as exc_info:
            test_data = SourceProcessingResult(
                parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
                parent_type="grant_application",
                rag_source_id=UUID("323e4567-e89b-12d3-a456-426614174000"),
                indexing_status=SourceIndexingStatusEnum.FINISHED,
                identifier="document.pdf",
            )

            await publish_notification(
                logger=logger,
                parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
                event="source_processing",
                data=test_data,
            )

        assert "Error publishing source processing message" in str(exc_info.value)


@pytest.mark.asyncio
async def test_pull_notifications_success(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

    message1 = Mock()
    message1.message.data = (
        b'{"type":"data",'
        b'"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"event":"source_processing",'
        b'"data":{"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"parent_type":"grant_application",'
        b'"rag_source_id":"323e4567-e89b-12d3-a456-426614174000",'
        b'"indexing_status":"FINISHED",'
        b'"identifier":"test_file.pdf"}}'
    )
    message1.ack_id = "ack-1"
    message1.ack = Mock()
    message1.nack = Mock()

    message2 = Mock()
    message2.message.data = (
        b'{"type":"data",'
        b'"parent_id":"999e4567-e89b-12d3-a456-426614174000",'
        b'"event":"source_processing",'
        b'"data":{"parent_id":"999e4567-e89b-12d3-a456-426614174000",'
        b'"parent_type":"grant_application",'
        b'"rag_source_id":"423e4567-e89b-12d3-a456-426614174000",'
        b'"indexing_status":"FINISHED",'
        b'"identifier":"other_file.pdf"}}'
    )
    message2.ack_id = "ack-2"
    message2.ack = Mock()
    message2.nack = Mock()

    pull_response = Mock()
    pull_response.received_messages = [message1, message2]

    # Mock the pull method to return the response directly when called
    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
        results = await pull_notifications(
            logger=logger,
            parent_id=parent_id,
        )

        assert len(results) == 2
        assert results[0]["parent_id"] == parent_id
        assert results[0]["type"] == "data"
        assert results[0]["event"] == "source_processing"
        assert results[0]["data"]["parent_id"] == parent_id
        assert results[0]["data"]["rag_source_id"] == rag_source_id
        assert results[0]["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED

        # Check that acknowledge was called with both ack_ids
        mock_subscriber_client.acknowledge.assert_called_once()
        ack_call_args = mock_subscriber_client.acknowledge.call_args[1]
        assert set(ack_call_args["request"]["ack_ids"]) == {"ack-1", "ack-2"}

        mock_subscriber_client.subscription_path.assert_called_once_with(
            project="grantflow", subscription=f"frontend-notifications-sub-{parent_id}"
        )


@pytest.mark.asyncio
async def test_pull_notifications_with_identifier(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    message = Mock()
    message.message.data = (
        b'{"type":"data",'
        b'"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"event":"source_processing",'
        b'"data":{"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"parent_type":"grant_application",'
        b'"rag_source_id":"323e4567-e89b-12d3-a456-426614174000",'
        b'"indexing_status":"FINISHED",'
        b'"identifier":"https://example.com/document"}}'
    )
    message.ack_id = "ack-1"
    message.ack = Mock()
    message.nack = Mock()

    pull_response = Mock()
    pull_response.received_messages = [message]

    # Mock the pull method to return the response directly when called
    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
        results = await pull_notifications(
            logger=logger,
            parent_id=parent_id,
        )

        assert len(results) == 1
        assert results[0]["data"]["identifier"] == "https://example.com/document"

        # Check that acknowledge was called with message's ack_id
        mock_subscriber_client.acknowledge.assert_called_once()
        ack_call_args = mock_subscriber_client.acknowledge.call_args[1]
        assert ack_call_args["request"]["ack_ids"] == ["ack-1"]


@pytest.mark.asyncio
async def test_pull_notifications_invalid_message(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    message = Mock()
    message.message.data = b"invalid json"
    message.ack_id = "ack-invalid"
    message.ack = Mock()
    message.nack = Mock()

    pull_response = Mock()
    pull_response.received_messages = [message]

    # Mock the pull method to return the response directly when called
    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
        results = await pull_notifications(
            logger=logger,
            parent_id=parent_id,
        )

        assert len(results) == 0

        # Check that acknowledge was called even for invalid messages (they're still acknowledged)
        mock_subscriber_client.acknowledge.assert_called_once()
        ack_call_args = mock_subscriber_client.acknowledge.call_args[1]
        assert ack_call_args["request"]["ack_ids"] == ["ack-invalid"]


@pytest.mark.asyncio
async def test_pull_notifications_empty_response(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    pull_response = Mock()
    pull_response.received_messages = []

    # Mock the pull method to return the response directly when called
    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client):
        results = await pull_notifications(
            logger=logger,
            parent_id=parent_id,
        )

        assert len(results) == 0


@pytest.mark.asyncio
async def test_pull_notifications_timeout(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    # Mock the pull method to raise TimeoutError
    mock_subscriber_client.pull.side_effect = TimeoutError()

    with (
        patch("packages.shared_utils.src.pubsub.get_subscriber_client", return_value=mock_subscriber_client),
        pytest.raises(TimeoutError),
    ):
        await pull_notifications(
            logger=logger,
            parent_id=parent_id,
        )


def test_pubsub_message_typed_dict() -> None:
    message: PubSubMessage = {
        "message_id": "test-id",
        "publish_time": "2023-01-01T00:00:00Z",
        "data": "test-data",
        "attributes": {"key": "value"},
    }
    assert message["message_id"] == "test-id"


def test_pubsub_event_typed_dict() -> None:
    event: PubSubEvent = {
        "message": {
            "message_id": "test-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": "test-data",
            "attributes": {"key": "value"},
        }
    }
    assert event["message"]["message_id"] == "test-id"


def test_crawling_request_typed_dict() -> None:
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


def test_source_processing_result_typed_dict() -> None:
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


def test_websocket_message_typed_dict() -> None:
    test_data: dict[str, str | int] = {
        "some_field": "value",
        "another_field": 123,
    }

    message: WebsocketMessage[dict[str, str | int]] = {
        "type": "data",
        "parent_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
        "event": "test_event",
        "data": test_data,
    }
    assert message["type"] == "data"
    assert message["event"] == "test_event"
    assert message["data"] == test_data
