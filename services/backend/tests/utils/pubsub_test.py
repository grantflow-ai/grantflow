from collections.abc import Generator
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from services.backend.src.utils.pubsub import PubSubClient


@pytest.fixture
def mock_publisher() -> Generator[MagicMock, None, None]:
    with patch("services.backend.src.utils.pubsub.PublisherClient") as mock:
        publisher_instance = MagicMock()
        publisher_instance.topic_path.return_value = "projects/test-project/topics/url-crawling"
        mock.return_value = publisher_instance
        yield publisher_instance


@pytest.mark.asyncio
async def test_publish_url_crawling_task(mock_publisher: MagicMock) -> None:
    # Mock the future result to return a message ID
    future = MagicMock()
    future.result.return_value = "test-message-id"
    mock_publisher.publish.return_value = future

    # Test publishing a message
    pubsub_client = PubSubClient()
    parent_id = uuid4()
    result = await pubsub_client.publish_url_crawling_task(
        url="https://example.org/docs",
        parent_type="grant_application",
        parent_id=parent_id,
    )

    # Verify the message was published correctly
    assert result == "test-message-id"
    mock_publisher.topic_path.assert_called_once_with("grantflow", "url-crawling")
    mock_publisher.publish.assert_called_once()

    # Verify the message data is correct
    call_args = mock_publisher.publish.call_args
    assert call_args[0][0] == "projects/test-project/topics/url-crawling"

    # Get the message data as bytes
    message_data = call_args[0][1]
    message_str = message_data.decode("utf-8")
    assert f'"parent_id": "{parent_id}"' in message_str
    assert '"parent_type": "grant_application"' in message_str
    assert '"url": "https://example.org/docs"' in message_str
    assert "workspace_id" not in message_str


@pytest.mark.asyncio
async def test_publish_url_crawling_task_with_workspace_id(mock_publisher: MagicMock) -> None:
    # Mock the future result to return a message ID
    future = MagicMock()
    future.result.return_value = "test-message-id"
    mock_publisher.publish.return_value = future

    # Test publishing a message with workspace_id
    pubsub_client = PubSubClient()
    parent_id = uuid4()
    workspace_id = uuid4()
    result = await pubsub_client.publish_url_crawling_task(
        url="https://example.org/docs",
        parent_type="grant_application",
        parent_id=parent_id,
        workspace_id=workspace_id,
    )

    # Verify the message was published correctly
    assert result == "test-message-id"

    # Get the message data as bytes
    call_args = mock_publisher.publish.call_args
    message_data = call_args[0][1]
    message_str = message_data.decode("utf-8")
    assert f'"parent_id": "{parent_id}"' in message_str
    assert '"parent_type": "grant_application"' in message_str
    assert '"url": "https://example.org/docs"' in message_str
    assert f'"workspace_id": "{workspace_id}"' in message_str


@pytest.mark.asyncio
async def test_publish_url_crawling_task_failure(mock_publisher: MagicMock) -> None:
    # Mock the publish method to raise an exception
    mock_publisher.publish.side_effect = Exception("Publish failed")

    # Test handling of publish failure
    pubsub_client = PubSubClient()
    parent_id = uuid4()
    with pytest.raises(Exception, match="Publish failed"):
        await pubsub_client.publish_url_crawling_task(
            url="https://example.org/docs",
            parent_type="grant_application",
            parent_id=parent_id,
        )
