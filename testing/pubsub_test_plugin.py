"""
PubSub test plugin for selective mocking strategies.

This plugin provides fixtures for testing PubSub functionality with different strategies:
1. Real PubSub emulator for integration/happy path tests
2. Mocked PubSub for unit tests and error injection
3. Partial mocking for specific scenarios
"""

import json
from collections.abc import Generator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_publish_notification() -> Generator[AsyncMock]:
    """Mock the publish_notification function for unit tests."""
    with patch("packages.shared_utils.src.pubsub.publish_notification") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_publish_rag_task() -> Generator[AsyncMock]:
    """Mock the publish_rag_task function to prevent pipeline continuation."""
    with patch("packages.shared_utils.src.pubsub.publish_rag_task") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_publish_email_notification() -> Generator[AsyncMock]:
    """Mock the publish_email_notification function for unit tests."""
    with patch("packages.shared_utils.src.pubsub.publish_email_notification") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_all_pubsub() -> Generator[tuple[AsyncMock, AsyncMock, AsyncMock]]:
    """Mock all PubSub publishing functions for complete isolation."""
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
    """
    Mock only publish_rag_task to prevent pipeline stage transitions.
    This allows testing individual pipeline stages while keeping other PubSub
    functionality (like notifications) working with the emulator.
    """
    with patch("packages.shared_utils.src.pubsub.publish_rag_task") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def pubsub_emulator_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure PubSub emulator environment is set."""
    monkeypatch.setenv("PUBSUB_EMULATOR_HOST", "localhost:8085")


@pytest.fixture
def mock_pubsub_subscriber() -> Generator[MagicMock]:
    """Mock PubSub subscriber for testing message consumption."""
    with patch("google.cloud.pubsub_v1.SubscriberClient") as mock_client:
        mock_subscriber = MagicMock()
        mock_client.return_value = mock_subscriber

        # Setup subscription path method
        mock_subscriber.subscription_path.return_value = "projects/test/subscriptions/test-sub"

        # Setup pull method
        mock_subscriber.pull = MagicMock()
        mock_subscriber.acknowledge = MagicMock()

        yield mock_subscriber


@pytest.fixture
def mock_pubsub_publisher() -> Generator[MagicMock]:
    """Mock PubSub publisher for testing message publishing."""
    with patch("google.cloud.pubsub_v1.PublisherClient") as mock_client:
        mock_publisher = MagicMock()
        mock_client.return_value = mock_publisher

        # Setup topic path method
        mock_publisher.topic_path.return_value = "projects/test/topics/test-topic"

        # Setup publish method to return a future
        future = MagicMock()
        future.result.return_value = "message-id-123"
        mock_publisher.publish.return_value = future

        yield mock_publisher


class PubSubTestHelper:
    """Helper class for PubSub testing scenarios."""

    @staticmethod
    def create_pubsub_message(data: dict[str, Any], attributes: dict[str, str] | None = None) -> Any:
        """Create a mock PubSub message."""
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
        """Assert that a message was published with expected data."""
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
    """Provide PubSubTestHelper class for test utilities."""
    return PubSubTestHelper
