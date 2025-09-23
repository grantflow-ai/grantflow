"""Tests for the dev indexing bypass functionality."""

import os
from unittest.mock import AsyncMock, patch

import pytest
from services.crawler.src.dev_indexing_bypass import (
    is_development_environment,
    trigger_dev_indexing,
)


class TestIsDevelopmentEnvironment:
    """Test environment detection."""

    def test_development_environment_detection(self) -> None:
        """Test that development environments are correctly detected."""
        test_cases = [
            ("development", True),
            ("dev", True),
            ("local", True),
            ("staging", False),
            ("production", False),
            ("test", False),
            ("", False),
        ]

        for env_value, expected in test_cases:
            with patch.dict(os.environ, {"ENVIRONMENT": env_value}):
                assert is_development_environment() == expected

    def test_default_environment(self) -> None:
        """Test default behavior when ENVIRONMENT is not set."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove ENVIRONMENT if it exists
            os.environ.pop("ENVIRONMENT", None)
            assert is_development_environment() is True


@pytest.mark.asyncio
class TestTriggerDevIndexing:
    """Test the dev indexing trigger functionality."""

    async def test_skips_in_production(self) -> None:
        """Test that indexing is skipped in production environments."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            with patch("httpx.AsyncClient") as mock_client:
                await trigger_dev_indexing("test/path", "trace-123")
                mock_client.assert_not_called()

    async def test_successful_indexing_trigger(self) -> None:
        """Test successful dev indexing trigger."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            mock_response = AsyncMock()
            mock_response.status_code = 200

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()

            with patch("httpx.AsyncClient", return_value=mock_client):
                await trigger_dev_indexing("test/file.pdf", "trace-123")

                mock_client.post.assert_called_once()
                call_args = mock_client.post.call_args

                # Verify URL
                assert call_args[0][0] == "http://localhost:8001"

                # Verify the structure of the pubsub message
                json_data = call_args.kwargs["json"]
                assert "message" in json_data
                message = json_data["message"]

                # Check attributes
                assert message["attributes"]["bucketId"] == "grantflow-uploads"
                assert message["attributes"]["eventType"] == "OBJECT_FINALIZE"
                assert message["attributes"]["objectId"] == "test/file.pdf"
                assert message["attributes"]["customMetadata_trace-id"] == "trace-123"

                # Check message metadata
                assert "message_id" in message
                assert message["message_id"].startswith("dev-")
                assert "publish_time" in message

    async def test_retries_on_failure(self) -> None:
        """Test that the function retries on failure."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_response.text = "Internal Server Error"

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()

            with patch("httpx.AsyncClient", return_value=mock_client):
                with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
                    await trigger_dev_indexing("test/file.pdf", "trace-456")

                    # Should retry 3 times
                    assert mock_client.post.call_count == 3
                    # Should sleep between retries (2 times for 3 attempts)
                    assert mock_sleep.call_count == 2

    async def test_success_on_second_attempt(self) -> None:
        """Test successful indexing on second attempt."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            # First response fails, second succeeds
            mock_response_fail = AsyncMock()
            mock_response_fail.status_code = 500
            mock_response_fail.text = "Error"

            mock_response_success = AsyncMock()
            mock_response_success.status_code = 200

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(
                side_effect=[mock_response_fail, mock_response_success]
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()

            with patch("httpx.AsyncClient", return_value=mock_client):
                with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
                    await trigger_dev_indexing("test/file.pdf", "trace-789")

                    # Should call twice (fail then success)
                    assert mock_client.post.call_count == 2
                    # Should sleep once between attempts
                    assert mock_sleep.call_count == 1
