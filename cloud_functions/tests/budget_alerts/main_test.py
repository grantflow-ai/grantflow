import base64
import json
import os
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

# Set environment variables before importing the module
os.environ.setdefault("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/123/test")
os.environ.setdefault("ENVIRONMENT", "test")

import httpx
import pytest

from cloud_functions.src.budget_alerts.main import budget_alert_to_discord, budget_alert_to_discord_sync


async def test_budget_alert_critical_priority(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    budget_alert_data["costAmount"] = 105.00
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"
        assert result["message"] == "Alert sent to Discord"

        mock_post.assert_called_once()
        call_args = mock_post.call_args

        assert call_args[0][0] == "https://discord.com/api/webhooks/123/test"

        payload = call_args[1]["json"]
        assert payload["content"] is not None, "Payload content should not be None"
        assert "@here Budget threshold exceeded" in payload["content"]
        assert len(payload["embeds"]) == 1

        embed = payload["embeds"][0]
        assert "🚨" in embed["title"]
        assert embed["color"] == 0xFF0000
        assert "105.0%" in embed["description"]


async def test_budget_alert_high_priority(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    budget_alert_data["costAmount"] = 95.00
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "⚠️" in embed["title"]
        assert embed["color"] == 0xFF8C00
        assert "@here Budget threshold exceeded" in payload["content"]


async def test_budget_alert_medium_priority(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    budget_alert_data["costAmount"] = 80.00
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "⚠️" in embed["title"]
        assert embed["color"] == 0xFFA500
        assert payload["content"] is None


async def test_budget_alert_low_priority(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    budget_alert_data["costAmount"] = 50.00
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "💰" in embed["title"]
        assert embed["color"] == 0xFFD700
        assert payload["content"] is None


async def test_budget_alert_with_forecast(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        field_names = [field["name"] for field in embed["fields"]]
        assert "Forecasted Monthly Spend" in field_names

        forecast_field = next(field for field in embed["fields"] if "Forecasted" in field["name"])
        assert "USD 95.00" in forecast_field["value"]
        assert "95.0%" in forecast_field["value"]


async def test_budget_alert_without_forecast(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    budget_alert_data.pop("forecastedAmount", None)
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        field_names = [field["name"] for field in embed["fields"]]
        assert "Forecasted Monthly Spend" not in field_names


async def test_budget_alert_missing_webhook_url(mock_request: Mock, monkeypatch: pytest.MonkeyPatch) -> None:
    with patch("cloud_functions.src.budget_alerts.main.webhook_url", None):
        result = await budget_alert_to_discord(mock_request)

    assert result["status"] == "error"
    assert "Discord webhook URL not configured" in result["message"]


async def test_budget_alert_invalid_json_data(mock_request: Mock) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(b"invalid json").decode("utf-8")}}
    mock_request.data = pubsub_data

    result = await budget_alert_to_discord(mock_request)

    assert result["status"] == "error"
    assert "Data parsing error" in result["message"]


async def test_budget_alert_missing_budget_data(mock_request: Mock) -> None:
    incomplete_data = {"budgetDisplayName": "Test Budget"}
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(incomplete_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_response = Mock()
    mock_response.status_code = 204
    mock_post = AsyncMock(return_value=mock_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        cost_field = next(field for field in embed["fields"] if "Current Spend" in field["name"])
        assert "USD 0.00" in cost_field["value"]


async def test_budget_alert_zero_budget_amount(mock_request: Mock, budget_alert_data: dict[str, Any]) -> None:
    budget_alert_data["budgetAmount"] = 0
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_response = Mock()
    mock_response.status_code = 204
    mock_post = AsyncMock(return_value=mock_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "0.0%" in embed["description"]


async def test_budget_alert_discord_webhook_failure(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_response = Mock()
    mock_response.status_code = 400
    mock_post = AsyncMock(return_value=mock_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Discord webhook failed: 400" in result["message"]


async def test_budget_alert_httpx_request_error(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        result = await budget_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Discord webhook request failed" in result["message"]


def test_budget_alert_sync_wrapper(
    mock_request: Mock,
    budget_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(budget_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.budget_alerts.main.http_client.post", mock_post):
        budget_alert_to_discord_sync(mock_request)

        mock_post.assert_called_once()
