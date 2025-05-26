from collections.abc import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from google.cloud.pubsub_v1.publisher.exceptions import MessageTooLargeError
from packages.shared_utils.src.exceptions import BackendError
from services.backend.src.utils.pubsub import (
    client_ref,
    get_pubsub_client,
    publish_url_crawling_task,
)


@pytest.fixture
def mock_publisher() -> Generator[MagicMock, None, None]:
    with patch("services.backend.src.utils.pubsub.PublisherClient") as mock:
        publisher_instance = MagicMock()
        publisher_instance.topic_path.return_value = "projects/grantflow/topics/url-crawling"
        mock.return_value = publisher_instance
        yield publisher_instance


@pytest.fixture
async def reset_client_ref() -> AsyncGenerator[None, None]:
    original_value = client_ref.value
    client_ref.value = None
    yield
    client_ref.value = original_value


class TestGetPubsubClient:
    def test_get_pubsub_client_creates_singleton(self, mock_publisher: MagicMock, reset_client_ref: None) -> None:
        client1 = get_pubsub_client()
        client2 = get_pubsub_client()

        assert client1 is client2
        assert client1 is mock_publisher
        mock_publisher.topic_path.assert_called_once_with(project="grantflow", topic="url-crawling")

    def test_get_pubsub_client_uses_env_vars(self, mock_publisher: MagicMock, reset_client_ref: None) -> None:
        with patch("services.backend.src.utils.pubsub.get_env") as mock_get_env:
            mock_get_env.side_effect = lambda key, fallback=None: {
                "GCP_PROJECT_ID": "test-project",
                "URL_CRAWLING_PUBSUB_TOPIC": "test-topic",
            }.get(key, fallback)

            client = get_pubsub_client()

            assert client is mock_publisher
            mock_publisher.topic_path.assert_called_once_with(project="test-project", topic="test-topic")


class TestPublishUrlCrawlingTask:
    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_success(self, mock_publisher: MagicMock, reset_client_ref: None) -> None:
        future = MagicMock()
        future.result.return_value = "test-message-id"
        mock_publisher.publish.return_value = future

        with patch("services.backend.src.utils.pubsub.run_sync", new_callable=AsyncMock) as mock_run_sync:
            mock_run_sync.return_value = "test-message-id"

            parent_id = uuid4()
            result = await publish_url_crawling_task(
                url="https://example.org/docs",
                parent_type="grant_application",
                parent_id=parent_id,
            )

        assert result == "test-message-id"
        mock_publisher.publish.assert_called_once()

        call_kwargs = mock_publisher.publish.call_args.kwargs
        assert call_kwargs["topic"] == "url-crawling"

        message_data = call_kwargs["data"]
        message_str = message_data.decode("utf-8")
        assert f'"parent_id":"{parent_id}"' in message_str
        assert '"parent_type":"grant_application"' in message_str
        assert '"url":"https://example.org/docs"' in message_str
        assert "workspace_id" not in message_str

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_with_workspace_id(
        self, mock_publisher: MagicMock, reset_client_ref: None
    ) -> None:
        future = MagicMock()
        future.result.return_value = "test-message-id-2"
        mock_publisher.publish.return_value = future

        with patch("services.backend.src.utils.pubsub.run_sync", new_callable=AsyncMock) as mock_run_sync:
            mock_run_sync.return_value = "test-message-id-2"

            parent_id = uuid4()
            workspace_id = uuid4()
            result = await publish_url_crawling_task(
                url="https://example.org/grant",
                parent_type="grant_template",
                parent_id=parent_id,
                workspace_id=workspace_id,
            )

        assert result == "test-message-id-2"

        call_kwargs = mock_publisher.publish.call_args.kwargs
        message_data = call_kwargs["data"]
        message_str = message_data.decode("utf-8")
        assert f'"parent_id":"{parent_id}"' in message_str
        assert '"parent_type":"grant_template"' in message_str
        assert '"url":"https://example.org/grant"' in message_str
        assert f'"workspace_id":"{workspace_id}"' in message_str

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_with_string_ids(
        self, mock_publisher: MagicMock, reset_client_ref: None
    ) -> None:
        future = MagicMock()
        future.result.return_value = "test-message-id-3"
        mock_publisher.publish.return_value = future

        with patch("services.backend.src.utils.pubsub.run_sync", new_callable=AsyncMock) as mock_run_sync:
            mock_run_sync.return_value = "test-message-id-3"

            parent_id = str(uuid4())
            workspace_id = str(uuid4())
            result = await publish_url_crawling_task(
                url="https://example.org/org",
                parent_type="funding_organization",
                parent_id=parent_id,
                workspace_id=workspace_id,
            )

        assert result == "test-message-id-3"

        call_kwargs = mock_publisher.publish.call_args.kwargs
        message_data = call_kwargs["data"]
        message_str = message_data.decode("utf-8")
        assert f'"parent_id":"{parent_id}"' in message_str
        assert '"parent_type":"funding_organization"' in message_str

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_message_too_large(
        self, mock_publisher: MagicMock, reset_client_ref: None
    ) -> None:
        mock_publisher.publish.side_effect = MessageTooLargeError("Message exceeds maximum size")

        parent_id = uuid4()
        with pytest.raises(BackendError) as exc_info:
            await publish_url_crawling_task(
                url="https://example.org/docs",
                parent_type="grant_application",
                parent_id=parent_id,
            )

        assert "Error publishing URL crawling message" in str(exc_info.value)
        assert exc_info.value.context["error"] == "Message exceeds maximum size"

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_generic_exception(
        self, mock_publisher: MagicMock, reset_client_ref: None
    ) -> None:
        mock_publisher.publish.side_effect = Exception("Generic error")

        parent_id = uuid4()
        with pytest.raises(Exception, match="Generic error"):
            await publish_url_crawling_task(
                url="https://example.org/docs",
                parent_type="grant_application",
                parent_id=parent_id,
            )

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_run_sync_failure(
        self, mock_publisher: MagicMock, reset_client_ref: None
    ) -> None:
        future = MagicMock()
        mock_publisher.publish.return_value = future

        with patch("services.backend.src.utils.pubsub.run_sync", new_callable=AsyncMock) as mock_run_sync:
            mock_run_sync.side_effect = Exception("Async operation failed")

            parent_id = uuid4()
            with pytest.raises(Exception, match="Async operation failed"):
                await publish_url_crawling_task(
                    url="https://example.org/docs",
                    parent_type="grant_application",
                    parent_id=parent_id,
                )

    @pytest.mark.asyncio
    async def test_publish_url_crawling_task_with_env_topic(
        self, mock_publisher: MagicMock, reset_client_ref: None
    ) -> None:
        future = MagicMock()
        future.result.return_value = "test-message-id-4"
        mock_publisher.publish.return_value = future

        with patch("services.backend.src.utils.pubsub.run_sync", new_callable=AsyncMock) as mock_run_sync:
            mock_run_sync.return_value = "test-message-id-4"

            with patch("services.backend.src.utils.pubsub.get_env") as mock_get_env:
                mock_get_env.return_value = "custom-topic"

                parent_id = uuid4()
                result = await publish_url_crawling_task(
                    url="https://example.org/custom",
                    parent_type="grant_application",
                    parent_id=parent_id,
                )

                assert result == "test-message-id-4"
                mock_get_env.assert_called_with("URL_CRAWLING_PUBSUB_TOPIC", fallback="url-crawling")
                call_kwargs = mock_publisher.publish.call_args.kwargs
                assert call_kwargs["topic"] == "custom-topic"
