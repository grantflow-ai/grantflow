import base64
import json
import os
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

# Set environment variables before importing the module
os.environ.setdefault("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/123/test")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("PROJECT_ID", "grantflow-test")

import httpx
import pytest

from cloud_functions.src.app_hosting_alerts.main import (
    app_hosting_alert_to_discord,
    app_hosting_alert_to_discord_sync,
    create_test_alert_embed,
    send_test_alert,
)


async def test_app_hosting_alert_high_priority(
    mock_request: Mock,
    app_hosting_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app_hosting_alert_data["incident"]["policy_name"] = "Critical Error Alert"

    mock_cloud_event = Mock()
    mock_cloud_event.data = app_hosting_alert_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await app_hosting_alert_to_discord(mock_cloud_event)

        assert result["status"] == "success"
        assert result["message"] == "Alert sent to Discord"

        mock_post.assert_called_once()
        call_args = mock_post.call_args

        assert call_args[0][0] == "https://discord.com/api/webhooks/123/test"

        payload = call_args[1]["json"]
        assert "**CRITICAL**" in payload["content"]
        assert "App Hosting alert in test" in payload["content"]
        assert len(payload["embeds"]) == 1

        embed = payload["embeds"][0]
        assert "🚨" in embed["title"]
        assert embed["color"] == 0xFF0000
        assert "Critical Error Alert" in embed["description"]


async def test_app_hosting_alert_medium_priority(
    mock_request: Mock,
    app_hosting_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    app_hosting_alert_data["incident"]["policy_name"] = "Memory Usage Alert"
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "⚠️" in embed["title"]
        assert embed["color"] == 0xFF8C00
        assert payload["content"] is None


async def test_app_hosting_alert_low_priority(
    mock_request: Mock,
    app_hosting_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    app_hosting_alert_data["incident"]["policy_name"] = "General Monitoring"
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "🔍" in embed["title"]
        assert embed["color"] == 0xFFD700


async def test_app_hosting_alert_missing_webhook_url(mock_request: Mock, monkeypatch: pytest.MonkeyPatch) -> None:
    with patch("cloud_functions.src.app_hosting_alerts.main.webhook_url", None):
        result = await app_hosting_alert_to_discord(mock_request)

    assert result["status"] == "error"
    assert "Discord webhook URL not configured" in result["message"]


async def test_app_hosting_alert_invalid_json_data(mock_request: Mock) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(b"invalid json").decode("utf-8")}}
    mock_request.data = pubsub_data

    result = await app_hosting_alert_to_discord(mock_request)

    assert result["status"] == "error"
    assert "Data parsing error" in result["message"]


async def test_app_hosting_alert_missing_incident_data(mock_request: Mock) -> None:
    incomplete_data = {"no_incident": "data"}
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(incomplete_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_response = Mock()
    mock_response.status_code = 204
    mock_post = AsyncMock(return_value=mock_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "success"

        call_args = mock_post.call_args
        payload = call_args[1]["json"]
        embed = payload["embeds"][0]

        assert "Unknown Policy" in embed["description"]


async def test_app_hosting_alert_discord_webhook_failure(
    mock_request: Mock,
    app_hosting_alert_data: dict[str, Any],
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_response = Mock()
    mock_response.status_code = 400
    mock_response.text = "Bad Request"
    mock_post = AsyncMock(return_value=mock_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Discord webhook failed: 400" in result["message"]


async def test_app_hosting_alert_httpx_request_error(
    mock_request: Mock,
    app_hosting_alert_data: dict[str, Any],
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await app_hosting_alert_to_discord(mock_request)

        assert result["status"] == "error"
        assert "Discord webhook request failed" in result["message"]


def test_create_test_alert_embed_creates_valid_embed() -> None:
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


async def test_send_test_alert_success(mock_discord_webhook_response: Mock) -> None:
    webhook_url = "https://discord.com/api/webhooks/123/test"

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await send_test_alert(webhook_url, "staging", "grantflow-staging")

        assert result is True
        mock_post.assert_called_once()

        call_args = mock_post.call_args
        assert call_args[0][0] == webhook_url

        payload = call_args[1]["json"]
        assert "Monitoring Test" in payload["content"]
        assert len(payload["embeds"]) == 1


async def test_send_test_alert_failure() -> None:
    webhook_url = "https://discord.com/api/webhooks/123/test"

    mock_post = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        result = await send_test_alert(webhook_url, "staging", "grantflow-staging")

        assert result is False


def test_app_hosting_alert_sync_wrapper(
    mock_request: Mock,
    app_hosting_alert_data: dict[str, Any],
    mock_discord_webhook_response: Mock,
) -> None:
    pubsub_data = {"message": {"data": base64.b64encode(json.dumps(app_hosting_alert_data).encode()).decode("utf-8")}}
    mock_request.data = pubsub_data

    mock_post = AsyncMock(return_value=mock_discord_webhook_response)
    with patch("cloud_functions.src.app_hosting_alerts.main.http_client.post", mock_post):
        app_hosting_alert_to_discord_sync(mock_request)

        mock_post.assert_called_once()
