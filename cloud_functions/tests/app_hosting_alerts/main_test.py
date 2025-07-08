"""Tests for app hosting alert function."""

import base64
import json
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from cloud_functions.src.app_hosting_alerts.main import (
    app_hosting_alert_to_discord,
    app_hosting_alert_to_discord_sync,
    create_test_alert_embed,
    send_test_alert,
)


class TestAppHostingAlertToDiscord:
    """Test app hosting alert to Discord function."""

    async def test_success_high_priority_alert(
        self,
        mock_request: Mock,
        app_hosting_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Test successful high priority alert processing."""

        monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/123/test")
        app_hosting_alert_data["incident"]["policy_name"] = "Critical Error Alert"

        mock_cloud_event = Mock()
        mock_cloud_event.data = app_hosting_alert_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await app_hosting_alert_to_discord(mock_cloud_event)

            assert result["status"] == "success"
            assert result["message"] == "Alert sent to Discord"

            mock_context.post.assert_called_once()
            call_args = mock_context.post.call_args

            assert call_args[0][0] == "https://discord.com/api/webhooks/123/test"

            payload = call_args[1]["json"]
            assert "**CRITICAL**" in payload["content"]
            assert "App Hosting alert in test" in payload["content"]
            assert len(payload["embeds"]) == 1

            embed = payload["embeds"][0]
            assert "🚨" in embed["title"]
            assert embed["color"] == 0xFF0000
            assert "Critical Error Alert" in embed["description"]

    async def test_success_medium_priority_alert(
        self,
        mock_request: Mock,
        app_hosting_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test successful medium priority alert processing."""

        app_hosting_alert_data["incident"]["policy_name"] = "Memory Usage Alert"
        pubsub_data = {
            "message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}
        }
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await app_hosting_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "⚠️" in embed["title"]
            assert embed["color"] == 0xFF8C00
            assert payload["content"] is None

    async def test_success_low_priority_alert(
        self,
        mock_request: Mock,
        app_hosting_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test successful low priority alert processing."""

        app_hosting_alert_data["incident"]["policy_name"] = "General Monitoring"
        pubsub_data = {
            "message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}
        }
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await app_hosting_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "🔍" in embed["title"]
            assert embed["color"] == 0xFFD700

    async def test_missing_webhook_url(self, mock_request: Mock, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test error when Discord webhook URL is not configured."""

        monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)

        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Discord webhook URL not configured" in result["message"]

    async def test_invalid_json_data(self, mock_request: Mock) -> None:
        """Test error handling for invalid JSON data."""

        pubsub_data = {"message": {"data": base64.b64encode(b"invalid json").decode("utf-8")}}
        mock_request.data = pubsub_data

        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Data parsing error" in result["message"]

    async def test_missing_incident_data(self, mock_request: Mock) -> None:
        """Test handling of missing incident data."""

        incomplete_data = {"no_incident": "data"}
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(incomplete_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_response = Mock()
            mock_response.status_code = 204
            mock_context.post.return_value = mock_response

            result = await app_hosting_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "Unknown Policy" in embed["description"]

    async def test_discord_webhook_failure(
        self,
        mock_request: Mock,
        app_hosting_alert_data: dict[str, Any],
    ) -> None:
        """Test error handling when Discord webhook fails."""

        pubsub_data = {
            "message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}
        }
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_response = Mock()
            mock_response.status_code = 400
            mock_response.text = "Bad Request"
            mock_context.post.return_value = mock_response

            result = await app_hosting_alert_to_discord(mock_request)

            assert result["status"] == "error"
            assert "Discord webhook failed: 400" in result["message"]

    async def test_httpx_request_error(
        self,
        mock_request: Mock,
        app_hosting_alert_data: dict[str, Any],
    ) -> None:
        """Test error handling for HTTP request errors."""

        pubsub_data = {
            "message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}
        }
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.side_effect = httpx.RequestError("Connection failed")

            result = await app_hosting_alert_to_discord(mock_request)

            assert result["status"] == "error"
            assert "Discord webhook request failed" in result["message"]


class TestCreateTestAlertEmbed:
    """Test create test alert embed function."""

    def test_creates_valid_embed(self) -> None:
        """Test that create_test_alert_embed creates a valid embed structure."""

        embed = create_test_alert_embed("staging", "grantflow-staging")

        assert "🧪" in embed["title"]
        assert "Test alert" in embed["description"]
        assert embed["color"] == 0x00FF00

        field_names = [field["name"] for field in embed["fields"]]
        assert "🔧 Environment" in field_names
        assert "📅 Test Time" in field_names
        assert "✅ Status" in field_names
        assert "🔗 Console Links" in field_names

        env_field = next(field for field in embed["fields"] if "Environment" in field["name"])
        assert env_field["value"] == "staging"


class TestSendTestAlert:
    """Test send test alert function."""

    async def test_successful_test_alert(self, mock_discord_webhook_response: Mock) -> None:
        """Test successful test alert sending."""

        webhook_url = "https://discord.com/api/webhooks/123/test"

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await send_test_alert(webhook_url, "staging", "grantflow-staging")

            assert result is True
            mock_context.post.assert_called_once()

            call_args = mock_context.post.call_args
            assert call_args[0][0] == webhook_url

            payload = call_args[1]["json"]
            assert "Monitoring Test" in payload["content"]
            assert len(payload["embeds"]) == 1

    async def test_failed_test_alert(self) -> None:
        """Test failed test alert sending."""

        webhook_url = "https://discord.com/api/webhooks/123/test"

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.side_effect = httpx.RequestError("Connection failed")

            result = await send_test_alert(webhook_url, "staging", "grantflow-staging")

            assert result is False


class TestSyncWrapper:
    """Test synchronous wrapper function."""

    def test_sync_wrapper_calls_async_function(
        self,
        mock_request: Mock,
        app_hosting_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test that the sync wrapper correctly calls the async function."""

        pubsub_data = {
            "message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}
        }
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            app_hosting_alert_to_discord_sync(mock_request)

            mock_context.post.assert_called_once()
