import contextlib
import json
import os
from collections.abc import Generator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from google.api_core import exceptions
from google.cloud import pubsub_v1


@pytest.fixture(scope="session")
def pubsub_emulator_env() -> None:
    """Set up environment variables for PubSub emulator."""
    os.environ.setdefault("PUBSUB_EMULATOR_HOST", "localhost:8085")
    os.environ.setdefault("PUBSUB_PROJECT_ID", "grantflow")


@pytest.fixture
def mock_publish_notification() -> Generator[AsyncMock]:
    with patch("packages.shared_utils.src.pubsub.publish_notification") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_publish_rag_task() -> Generator[AsyncMock]:
    with patch("packages.shared_utils.src.pubsub.publish_rag_task") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_publish_email_notification() -> Generator[AsyncMock]:
    with patch("packages.shared_utils.src.pubsub.publish_email_notification") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_all_pubsub() -> Generator[tuple[AsyncMock, AsyncMock, AsyncMock]]:
    with (
        patch("packages.shared_utils.src.pubsub.publish_notification") as mock_notification,
        patch("packages.shared_utils.src.pubsub.publish_rag_task") as mock_rag_task,
        patch("packages.shared_utils.src.pubsub.publish_email_notification") as mock_email,
    ):
        mock_notification.return_value = None
        mock_rag_task.return_value = None
        mock_email.return_value = None
        yield mock_notification, mock_rag_task, mock_email


@pytest.fixture
def mock_pubsub_for_pipeline_testing() -> Generator[AsyncMock]:
    with patch("packages.shared_utils.src.pubsub.publish_rag_task") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture(scope="session")
def create_pubsub_topics(pubsub_emulator_env: None) -> None:
    """Create all Pub/Sub topics required for testing."""
    project_id = os.environ.get("PUBSUB_PROJECT_ID", "grantflow")
    publisher = pubsub_v1.PublisherClient()

    topic_names = ["file-indexing", "url-crawling", "rag-processing", "frontend-notifications"]

    for topic_name in topic_names:
        topic_path = publisher.topic_path(project_id, topic_name)
        with contextlib.suppress(exceptions.AlreadyExists):
            publisher.create_topic(request={"name": topic_path})


@pytest.fixture
def mock_pubsub_subscriber() -> Generator[MagicMock]:
    with patch("google.cloud.pubsub_v1.SubscriberClient") as mock_client:
        mock_subscriber = MagicMock()
        mock_client.return_value = mock_subscriber

        mock_subscriber.subscription_path.return_value = "projects/test/subscriptions/test-sub"

        mock_subscriber.pull = MagicMock()
        mock_subscriber.acknowledge = MagicMock()

        yield mock_subscriber


@pytest.fixture
def mock_pubsub_publisher() -> Generator[MagicMock]:
    with patch("google.cloud.pubsub_v1.PublisherClient") as mock_client:
        mock_publisher = MagicMock()
        mock_client.return_value = mock_publisher

        mock_publisher.topic_path.return_value = "projects/test/topics/test-topic"

        future = MagicMock()
        future.result.return_value = "message-id-123"
        mock_publisher.publish.return_value = future

        yield mock_publisher


class PubSubTestHelper:
    @staticmethod
    def create_pubsub_message(data: dict[str, Any], attributes: dict[str, str] | None = None) -> Any:
        message = MagicMock()
        message.data = json.dumps(data).encode("utf-8")
        message.attributes = attributes or {}
        message.message_id = "test-message-id"
        message.publish_time = MagicMock()

        return message

    @staticmethod
    def assert_message_published(
        mock_publisher: MagicMock,
        expected_data: dict[str, Any] | None = None,
        expected_attributes: dict[str, str] | None = None,
    ) -> None:
        assert mock_publisher.publish.called, "No message was published"

        if expected_data is not None:
            call_args = mock_publisher.publish.call_args
            actual_data = json.loads(call_args.kwargs.get("data", b"{}"))
            assert actual_data == expected_data, f"Published data mismatch: {actual_data} != {expected_data}"

        if expected_attributes is not None:
            call_args = mock_publisher.publish.call_args
            actual_attributes = call_args.kwargs.get("attributes", {})
            for key, value in expected_attributes.items():
                assert key in actual_attributes, f"Missing attribute: {key}"
                assert actual_attributes[key] == value, (
                    f"Attribute mismatch for {key}: {actual_attributes[key]} != {value}"
                )


@pytest.fixture
def pubsub_test_helper() -> type[PubSubTestHelper]:
    return PubSubTestHelper
