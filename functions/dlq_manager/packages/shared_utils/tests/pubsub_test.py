from unittest.mock import MagicMock, Mock, patch
from uuid import UUID

import pytest
from google.cloud.pubsub_v1.publisher.exceptions import MessageTooLargeError

from packages.db.src.enums import (
    SourceIndexingStatusEnum,
)
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import (
    CrawlingRequest,
    GrantApplicationRagRequest,
    GrantTemplateRagRequest,
    PubSubEvent,
    PubSubMessage,
    ResearchDeepDiveAutofillRequest,
    ResearchPlanAutofillRequest,
    SourceProcessingResult,
    WebsocketMessage,
    get_publisher_client,
    get_subscriber_client,
    publish_autofill_task,
    publish_notification,
    publish_rag_task,
    publish_url_crawling_task,
    pull_notifications,
)
from packages.shared_utils.src.serialization import deserialize

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
    client.subscription_path.return_value = (
        "projects/test-project/subscriptions/test-subscription"
    )
    return client


@pytest.fixture(autouse=True)
def reset_client_refs() -> None:
    from packages.shared_utils.src.pubsub import client_ref, subscriber_client_ref

    client_ref.value = None
    subscriber_client_ref.value = None


def test_get_publisher_client_creates_client_once() -> None:
    with patch(
        "packages.shared_utils.src.pubsub.pubsub.PublisherClient"
    ) as mock_client_class:
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        client1 = get_publisher_client()
        client2 = get_publisher_client()

        assert client1 is client2
        assert client1 is mock_client
        mock_client_class.assert_called_once()


def test_get_subscriber_client_creates_client_once() -> None:
    with patch(
        "packages.shared_utils.src.pubsub.pubsub.SubscriberClient"
    ) as mock_client_class:
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        client1 = get_subscriber_client()
        client2 = get_subscriber_client()

        assert client1 is client2
        assert client1 is mock_client
        mock_client_class.assert_called_once()


async def test_publish_url_crawling_task_success(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        entity_id = UUID("223e4567-e89b-12d3-a456-426614174000")

        source_id = UUID("323e4567-e89b-12d3-a456-426614174000")
        result = await publish_url_crawling_task(
            url="https://example.com",
            source_id=source_id,
            entity_id=entity_id,
            entity_type="grant_application",
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(
            project="grantflow", topic="url-crawling"
        )
        mock_publisher_client.publish.assert_called_once()
        args, kwargs = mock_publisher_client.publish.call_args

        assert args[0] == "projects/test-project/topics/test-topic"
        assert b"https://example.com" in args[1]


async def test_publish_url_crawling_task_with_all_params(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        entity_id = UUID("223e4567-e89b-12d3-a456-426614174000")
        source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        result = await publish_url_crawling_task(
            url="https://example.com",
            source_id=source_id,
            entity_id=entity_id,
            entity_type="grant_application",
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()
        args, kwargs = mock_publisher_client.publish.call_args

        assert b"entity_type" in args[1]
        assert b"entity_id" in args[1]


async def test_publish_url_crawling_task_message_too_large(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    mock_publisher_client.publish.side_effect = MessageTooLargeError(
        "Message too large"
    )

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        with pytest.raises(BackendError) as exc_info:
            await publish_url_crawling_task(
                url="https://example.com" + "x" * 10000000,
                source_id="323e4567-e89b-12d3-a456-426614174000",
                entity_type="grant_application",
                entity_id="223e4567-e89b-12d3-a456-426614174000",
                trace_id=trace_id,
            )

        assert "Error publishing URL crawling message" in str(exc_info.value)


async def test_publish_url_crawling_task_with_string_ids(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_url_crawling_task(
            url="https://example.com",
            source_id="323e4567-e89b-12d3-a456-426614174000",
            entity_type="grant_application",
            entity_id="223e4567-e89b-12d3-a456-426614174000",
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()


async def test_publish_url_crawling_task_with_none_project(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_url_crawling_task(
            url="https://example.com",
            source_id="323e4567-e89b-12d3-a456-426614174000",
            entity_type="grant_application",
            entity_id="223e4567-e89b-12d3-a456-426614174000",
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()

        call_args = mock_publisher_client.publish.call_args
        data_bytes = call_args[0][1]
        published_data = deserialize(data_bytes, CrawlingRequest)
        assert published_data["entity_type"] == "grant_application"


async def test_publish_notification_success(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        test_data = SourceProcessingResult(
            source_id=rag_source_id,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            identifier="test_file.pdf",
            trace_id=trace_id,
        )

        result = await publish_notification(
            parent_id=parent_id,
            event="source_processing",
            data=test_data,
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(
            project="grantflow", topic="frontend-notifications"
        )
        mock_publisher_client.publish.assert_called_once()


async def test_publish_notification_with_url_identifier(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        test_data = SourceProcessingResult(
            source_id=rag_source_id,
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            identifier="https://example.com/guidelines",
            trace_id=trace_id,
        )

        result = await publish_notification(
            parent_id=parent_id,
            event="source_processing",
            data=test_data,
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()
        args, kwargs = mock_publisher_client.publish.call_args
        assert b"https://example.com/guidelines" in args[1]


async def test_publish_notification_failed_status(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
        rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

        test_data = SourceProcessingResult(
            source_id=rag_source_id,
            indexing_status=SourceIndexingStatusEnum.FAILED,
            identifier="template.docx",
            trace_id=trace_id,
        )

        result = await publish_notification(
            parent_id=parent_id,
            event="source_processing",
            data=test_data,
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()
        args, kwargs = mock_publisher_client.publish.call_args
        assert b"FAILED" in args[1]


async def test_publish_notification_too_large(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    mock_publisher_client.publish.side_effect = MessageTooLargeError(
        "Message too large"
    )

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        with pytest.raises(BackendError) as exc_info:
            test_data = SourceProcessingResult(
                source_id=UUID("323e4567-e89b-12d3-a456-426614174000"),
                indexing_status=SourceIndexingStatusEnum.FINISHED,
                identifier="document.pdf",
                trace_id=trace_id,
            )

            await publish_notification(
                parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
                event="source_processing",
                data=test_data,
                trace_id=trace_id,
            )

        assert "Error publishing notification" in str(exc_info.value)


async def test_pull_notifications_success(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    rag_source_id = UUID("323e4567-e89b-12d3-a456-426614174000")

    message1 = Mock()
    message1.message.data = (
        b'{"type":"data",'
        b'"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"event":"source_processing",'
        b'"trace_id":"test-trace-123",'
        b'"data":{"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"parent_type":"grant_application",'
        b'"rag_source_id":"323e4567-e89b-12d3-a456-426614174000",'
        b'"indexing_status":"FINISHED",'
        b'"identifier":"test_file.pdf"}}'
    )
    message1.message.attributes = {}
    message1.message.message_id = "msg-1"
    message1.message.publish_time = None
    message1.ack_id = "ack-1"
    message1.ack = Mock()
    message1.nack = Mock()

    message2 = Mock()
    message2.message.data = (
        b'{"type":"data",'
        b'"parent_id":"999e4567-e89b-12d3-a456-426614174000",'
        b'"event":"source_processing",'
        b'"trace_id":"test-trace-456",'
        b'"data":{"parent_id":"999e4567-e89b-12d3-a456-426614174000",'
        b'"parent_type":"grant_application",'
        b'"rag_source_id":"423e4567-e89b-12d3-a456-426614174000",'
        b'"indexing_status":"FINISHED",'
        b'"identifier":"other_file.pdf"}}'
    )
    message2.message.attributes = {}
    message2.message.message_id = "msg-2"
    message2.message.publish_time = None
    message2.ack_id = "ack-2"
    message2.ack = Mock()
    message2.nack = Mock()

    pull_response = Mock()
    pull_response.received_messages = [message1, message2]

    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch(
        "packages.shared_utils.src.pubsub.get_subscriber_client",
        return_value=mock_subscriber_client,
    ):
        results = await pull_notifications(
            parent_id=parent_id,
        )

        assert len(results) == 2
        assert results[0]["parent_id"] == parent_id
        assert results[0]["type"] == "data"
        assert results[0]["event"] == "source_processing"
        assert results[0]["data"]["parent_id"] == str(parent_id)
        assert results[0]["data"]["rag_source_id"] == str(rag_source_id)
        assert (
            results[0]["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
        )

        mock_subscriber_client.acknowledge.assert_called_once()
        ack_call_args = mock_subscriber_client.acknowledge.call_args[1]
        assert set(ack_call_args["request"]["ack_ids"]) == {"ack-1", "ack-2"}

        mock_subscriber_client.subscription_path.assert_called_once_with(
            project="grantflow", subscription=f"frontend-notifications-sub-{parent_id}"
        )


async def test_pull_notifications_with_identifier(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    message = Mock()
    message.message.data = (
        b'{"type":"data",'
        b'"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"event":"source_processing",'
        b'"trace_id":"test-trace-789",'
        b'"data":{"parent_id":"123e4567-e89b-12d3-a456-426614174000",'
        b'"parent_type":"grant_application",'
        b'"rag_source_id":"323e4567-e89b-12d3-a456-426614174000",'
        b'"indexing_status":"FINISHED",'
        b'"identifier":"https://example.com/document"}}'
    )
    message.message.attributes = {}
    message.message.message_id = "msg-1"
    message.message.publish_time = None
    message.ack_id = "ack-1"
    message.ack = Mock()
    message.nack = Mock()

    pull_response = Mock()
    pull_response.received_messages = [message]

    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch(
        "packages.shared_utils.src.pubsub.get_subscriber_client",
        return_value=mock_subscriber_client,
    ):
        results = await pull_notifications(
            parent_id=parent_id,
        )

        assert len(results) == 1
        assert results[0]["data"]["identifier"] == "https://example.com/document"

        mock_subscriber_client.acknowledge.assert_called_once()
        ack_call_args = mock_subscriber_client.acknowledge.call_args[1]
        assert ack_call_args["request"]["ack_ids"] == ["ack-1"]


async def test_pull_notifications_invalid_message(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    message = Mock()
    message.message.data = b"invalid json"
    message.message.attributes = {}
    message.message.message_id = "msg-invalid"
    message.message.publish_time = None
    message.ack_id = "ack-invalid"
    message.ack = Mock()
    message.nack = Mock()

    pull_response = Mock()
    pull_response.received_messages = [message]

    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch(
        "packages.shared_utils.src.pubsub.get_subscriber_client",
        return_value=mock_subscriber_client,
    ):
        results = await pull_notifications(
            parent_id=parent_id,
        )

        assert len(results) == 0

        mock_subscriber_client.acknowledge.assert_called_once()
        ack_call_args = mock_subscriber_client.acknowledge.call_args[1]
        assert ack_call_args["request"]["ack_ids"] == ["ack-invalid"]


async def test_pull_notifications_empty_response(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    pull_response = Mock()
    pull_response.received_messages = []

    mock_subscriber_client.pull = Mock(return_value=pull_response)

    with patch(
        "packages.shared_utils.src.pubsub.get_subscriber_client",
        return_value=mock_subscriber_client,
    ):
        results = await pull_notifications(
            parent_id=parent_id,
        )

        assert len(results) == 0


async def test_pull_notifications_timeout(mock_subscriber_client: Mock) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    mock_subscriber_client.pull.side_effect = TimeoutError()

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_subscriber_client",
            return_value=mock_subscriber_client,
        ),
        pytest.raises(TimeoutError),
    ):
        await pull_notifications(
            parent_id=parent_id,
        )


def test_pubsub_message_typed_dict() -> None:
    message = PubSubMessage(
        message_id="test-id",
        publish_time="2023-01-01T00:00:00Z",
        data="test-data",
        attributes={"key": "value"},
    )
    assert message.message_id == "test-id"


def test_pubsub_event_typed_dict() -> None:
    event = PubSubEvent(
        message=PubSubMessage(
            message_id="test-id",
            publish_time="2023-01-01T00:00:00Z",
            data="test-data",
            attributes={"key": "value"},
        )
    )
    assert event.message.message_id == "test-id"


def test_crawling_request_typed_dict(trace_id: str) -> None:
    request: CrawlingRequest = {
        "source_id": UUID("323e4567-e89b-12d3-a456-426614174000"),
        "entity_type": "grant_application",
        "entity_id": UUID("223e4567-e89b-12d3-a456-426614174000"),
        "url": "https://example.com",
        "trace_id": trace_id,
    }
    assert request["url"] == "https://example.com"
    assert request["entity_id"] == UUID("223e4567-e89b-12d3-a456-426614174000")


def test_source_processing_result_typed_dict(trace_id: str) -> None:
    result: SourceProcessingResult = {
        "source_id": UUID("323e4567-e89b-12d3-a456-426614174000"),
        "indexing_status": SourceIndexingStatusEnum.FINISHED,
        "identifier": "guidelines.pdf",
        "trace_id": trace_id,
    }
    assert result["indexing_status"] == SourceIndexingStatusEnum.FINISHED
    assert result["identifier"] == "guidelines.pdf"

    result_with_url: SourceProcessingResult = {
        "source_id": UUID("323e4567-e89b-12d3-a456-426614174000"),
        "indexing_status": SourceIndexingStatusEnum.INDEXING,
        "identifier": "https://example.com/document",
        "trace_id": trace_id,
    }
    assert result_with_url["identifier"] == "https://example.com/document"


def test_websocket_message_typed_dict(trace_id: str) -> None:
    test_data: dict[str, str | int] = {
        "some_field": "value",
        "another_field": 123,
    }

    message: WebsocketMessage[dict[str, str | int]] = {
        "type": "data",
        "parent_id": UUID("123e4567-e89b-12d3-a456-426614174000"),
        "event": "test_event",
        "data": test_data,
        "trace_id": trace_id,
    }
    assert message["type"] == "data"
    assert message["event"] == "test_event"
    assert message["data"] == test_data


def test_rag_request_typed_dict(trace_id: str) -> None:
    request = GrantApplicationRagRequest(
        parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        trace_id=trace_id,
    )
    assert hasattr(request, "parent_id")

    request_template = GrantTemplateRagRequest(
        parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        trace_id=trace_id,
    )
    assert hasattr(request_template, "parent_id")


async def test_publish_rag_task_success(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_rag_task(
            parent_type="grant_application",
            parent_id=parent_id,
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(
            project="grantflow",
            topic="rag-processing",
        )
        mock_publisher_client.publish.assert_called_once()

        published_data = mock_publisher_client.publish.call_args[0][1]
        assert b'"type":"grant_application"' in published_data
        assert b'"parent_id":"123e4567-e89b-12d3-a456-426614174000"' in published_data


async def test_publish_rag_task_grant_template(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_rag_task(
            parent_type="grant_template",
            parent_id=parent_id,
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(
            project="grantflow",
            topic="rag-processing",
        )
        mock_publisher_client.publish.assert_called_once()

        published_data = mock_publisher_client.publish.call_args[0][1]
        assert b'"type":"grant_template"' in published_data
        assert b'"parent_id":"123e4567-e89b-12d3-a456-426614174000"' in published_data


async def test_publish_rag_task_with_string_id(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    parent_id_str = "123e4567-e89b-12d3-a456-426614174000"

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_rag_task(
            parent_type="grant_application",
            parent_id=parent_id_str,
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()

        published_data = mock_publisher_client.publish.call_args[0][1]
        assert b'"parent_id":"123e4567-e89b-12d3-a456-426614174000"' in published_data


async def test_publish_rag_task_message_too_large(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    parent_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    future = Mock()
    future.result.side_effect = MessageTooLargeError("Message too large")
    mock_publisher_client.publish.return_value = future

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
        pytest.raises(BackendError) as exc_info,
    ):
        await publish_rag_task(
            parent_type="grant_application",
            parent_id=parent_id,
            trace_id=trace_id,
        )

    assert "Error publishing RAG processing message" in str(exc_info.value)


def test_research_plan_autofill_request_typed_dict() -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    trace_id = "test-trace-id"

    request = ResearchPlanAutofillRequest(
        application_id=application_id,
        trace_id=trace_id,
        field_name="research_goals",
        context={"key": "value"},
    )

    assert request.application_id == application_id
    assert request.trace_id == trace_id
    assert request.field_name == "research_goals"
    assert request.context == {"key": "value"}


def test_research_plan_autofill_request_minimal() -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    trace_id = "test-trace-id"

    request = ResearchPlanAutofillRequest(
        application_id=application_id,
        trace_id=trace_id,
    )

    assert request.application_id == application_id
    assert request.trace_id == trace_id
    assert request.field_name is None
    assert request.context is None


def test_research_deep_dive_autofill_request_typed_dict() -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    trace_id = "test-trace-id"

    request = ResearchDeepDiveAutofillRequest(
        application_id=application_id,
        trace_id=trace_id,
        field_name="methodology",
        context={"section": "research_plan"},
    )

    assert request.application_id == application_id
    assert request.trace_id == trace_id
    assert request.field_name == "methodology"
    assert request.context == {"section": "research_plan"}


def test_research_deep_dive_autofill_request_minimal() -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    trace_id = "test-trace-id"

    request = ResearchDeepDiveAutofillRequest(
        application_id=application_id,
        trace_id=trace_id,
    )

    assert request.application_id == application_id
    assert request.trace_id == trace_id
    assert request.field_name is None
    assert request.context is None


async def test_publish_autofill_task_research_plan(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_autofill_task(
            parent_id=application_id,
            autofill_type="research_plan",
            field_name="research_goals",
            context={"key": "value"},
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(
            project="grantflow",
            topic="rag-processing",
        )
        mock_publisher_client.publish.assert_called_once()

        published_data = mock_publisher_client.publish.call_args[0][1]
        assert b'"type":"research_plan_autofill"' in published_data
        assert (
            b'"application_id":"123e4567-e89b-12d3-a456-426614174000"' in published_data
        )
        assert b'"field_name":"research_goals"' in published_data


async def test_publish_autofill_task_research_deep_dive(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_autofill_task(
            parent_id=application_id,
            autofill_type="research_deep_dive",
            field_name="methodology",
            context={"section": "research_plan"},
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.topic_path.assert_called_once_with(
            project="grantflow",
            topic="rag-processing",
        )
        mock_publisher_client.publish.assert_called_once()

        published_data = mock_publisher_client.publish.call_args[0][1]
        assert b'"type":"research_deep_dive_autofill"' in published_data
        assert (
            b'"application_id":"123e4567-e89b-12d3-a456-426614174000"' in published_data
        )
        assert b'"field_name":"methodology"' in published_data


async def test_publish_autofill_task_minimal_parameters(
    mock_publisher_client: Mock,
    trace_id: str,
) -> None:
    application_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    with (
        patch(
            "packages.shared_utils.src.pubsub.get_publisher_client",
            return_value=mock_publisher_client,
        ),
        patch(
            "packages.shared_utils.src.pubsub.create_pubsub_publish_span",
            return_value=MagicMock(),
        ),
        patch(
            "packages.shared_utils.src.pubsub.inject_trace_context",
            side_effect=lambda x: x,
        ),
    ):
        result = await publish_autofill_task(
            parent_id=application_id,
            autofill_type="research_plan",
            trace_id=trace_id,
        )

        assert result == "test-message-id"
        mock_publisher_client.publish.assert_called_once()

        published_data = mock_publisher_client.publish.call_args[0][1]
        assert b'"type":"research_plan_autofill"' in published_data
        assert (
            b'"application_id":"123e4567-e89b-12d3-a456-426614174000"' in published_data
        )
        assert b'"field_name":null' in published_data
        assert b'"context":null' in published_data
