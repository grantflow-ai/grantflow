"""Tests for budget alert function."""

import base64
import json
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import httpx
import pytest

from cloud_functions.src.budget_alerts.main import budget_alert_to_discord, budget_alert_to_discord_sync


class TestBudgetAlertToDiscord:
    """Test budget alert to Discord function."""

    async def test_success_critical_budget_alert(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test successful critical budget alert (100%+ usage)."""

        budget_alert_data["costAmount"] = 105.00
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"
            assert result["message"] == "Alert sent to Discord"

            mock_context.post.assert_called_once()
            call_args = mock_context.post.call_args

            assert call_args[0][0] == "https://discord.com/api/webhooks/123/test"

            payload = call_args[1]["json"]
            assert "@here Budget threshold exceeded" in payload["content"]
            assert len(payload["embeds"]) == 1

            embed = payload["embeds"][0]
            assert "🚨" in embed["title"]
            assert embed["color"] == 0xFF0000
            assert "105.0%" in embed["description"]

    async def test_success_high_budget_alert(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test successful high budget alert (90-99% usage)."""

        budget_alert_data["costAmount"] = 95.00
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "⚠️" in embed["title"]
            assert embed["color"] == 0xFF8C00
            assert "@here Budget threshold exceeded" in payload["content"]

    async def test_success_medium_budget_alert(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test successful medium budget alert (75-89% usage)."""

        budget_alert_data["costAmount"] = 80.00
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "⚠️" in embed["title"]
            assert embed["color"] == 0xFFA500
            assert payload["content"] is None

    async def test_success_low_budget_alert(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test successful low budget alert (<75% usage)."""

        budget_alert_data["costAmount"] = 50.00
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "💰" in embed["title"]
            assert embed["color"] == 0xFFD700
            assert payload["content"] is None

    async def test_budget_alert_with_forecast(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test budget alert includes forecast information when available."""

        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            field_names = [field["name"] for field in embed["fields"]]
            assert "Forecasted Monthly Spend" in field_names

            forecast_field = next(field for field in embed["fields"] if "Forecasted" in field["name"])
            assert "USD 95.00" in forecast_field["value"]
            assert "95.0%" in forecast_field["value"]

    async def test_budget_alert_without_forecast(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test budget alert without forecast information."""

        budget_alert_data.pop("forecastedAmount", None)
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            field_names = [field["name"] for field in embed["fields"]]
            assert "Forecasted Monthly Spend" not in field_names

    async def test_missing_webhook_url(self, mock_request: Mock, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test error when Discord webhook URL is not configured."""

        monkeypatch.delenv("DISCORD_WEBHOOK_URL", raising=False)

        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Discord webhook URL not configured" in result["message"]

    async def test_invalid_json_data(self, mock_request: Mock) -> None:
        """Test error handling for invalid JSON data."""

        pubsub_data = {"message": {"data": base64.b64encode(b"invalid json").decode("utf-8")}}
        mock_request.data = pubsub_data

        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Data parsing error" in result["message"]

    async def test_missing_budget_data(self, mock_request: Mock) -> None:
        """Test handling of missing budget data with defaults."""

        incomplete_data = {"budgetDisplayName": "Test Budget"}
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(incomplete_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_response = Mock()
            mock_response.status_code = 204
            mock_context.post.return_value = mock_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            cost_field = next(field for field in embed["fields"] if "Current Spend" in field["name"])
            assert "USD 0.00" in cost_field["value"]

    async def test_zero_budget_amount(self, mock_request: Mock, budget_alert_data: dict[str, Any]) -> None:
        """Test handling of zero budget amount to avoid division by zero."""

        budget_alert_data["budgetAmount"] = 0
        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_response = Mock()
            mock_response.status_code = 204
            mock_context.post.return_value = mock_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "success"

            call_args = mock_context.post.call_args
            payload = call_args[1]["json"]
            embed = payload["embeds"][0]

            assert "0.0%" in embed["description"]

    async def test_discord_webhook_failure(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
    ) -> None:
        """Test error handling when Discord webhook fails."""

        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_response = Mock()
            mock_response.status_code = 400
            mock_context.post.return_value = mock_response

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "error"
            assert "Discord webhook failed: 400" in result["message"]

    async def test_httpx_request_error(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
    ) -> None:
        """Test error handling for HTTP request errors."""

        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.side_effect = httpx.RequestError("Connection failed")

            result = await budget_alert_to_discord(mock_request)

            assert result["status"] == "error"
            assert "Discord webhook request failed" in result["message"]


class TestSyncWrapper:
    """Test synchronous wrapper function."""

    def test_sync_wrapper_calls_async_function(
        self,
        mock_request: Mock,
        budget_alert_data: dict[str, Any],
        mock_discord_webhook_response: Mock,
    ) -> None:
        """Test that the sync wrapper correctly calls the async function."""

        pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
        mock_request.data = pubsub_data

        with patch("httpx.AsyncClient") as mock_client:
            mock_context = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_context
            mock_context.post.return_value = mock_discord_webhook_response

            budget_alert_to_discord_sync(mock_request)

            mock_context.post.assert_called_once()
