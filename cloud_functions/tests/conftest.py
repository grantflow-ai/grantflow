"""
Pytest configuration for cloud functions tests.
"""

import base64
import json
import os
from typing import Any
from unittest.mock import Mock

import pytest


@pytest.fixture(autouse=True)
def cloud_functions_env() -> None:
    """Set up environment variables for cloud functions tests."""
    os.environ.setdefault("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/123/test")
    os.environ.setdefault("ENVIRONMENT", "test")
    os.environ.setdefault("PROJECT_ID", "grantflow-test")
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "grantflow-test")
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")


@pytest.fixture
def mock_request() -> Mock:
    """Create a mock Cloud Functions request object."""
    request = Mock()
    request.data = {}
    return request


@pytest.fixture
def mock_pubsub_message() -> dict[str, Any]:
    """Create a mock Pub/Sub message."""
    return {
        "message": {
            "data": base64.b64encode(b'{"test": "data"}').decode("utf-8"),
            "attributes": {},
            "messageId": "test-message-id",
            "publishTime": "2025-01-01T00:00:00Z",
        }
    }


@pytest.fixture
def app_hosting_alert_data() -> dict[str, Any]:
    """Sample App Hosting alert data."""
    return {
        "incident": {
            "policy_name": "App Hosting Error Rate",
            "condition_name": "Error rate too high",
            "state": "OPEN",
            "summary": "Error rate exceeded 5% threshold",
            "started_at": "2025-01-01T00:00:00Z",
        },
        "resource": {
            "labels": {
                "service_name": "grantflow-backend",
                "project_id": "grantflow-test",
            }
        },
    }


@pytest.fixture
def budget_alert_data() -> dict[str, Any]:
    """Sample budget alert data."""
    return {
        "budgetDisplayName": "Monthly Budget",
        "costAmount": 85.50,
        "budgetAmount": 100.00,
        "currencyCode": "USD",
        "projectId": "grantflow-test",
        "alertThresholdExceeded": {"spendUpdateTime": "2025-01-01T00:00:00Z"},
        "forecastedAmount": 95.00,
    }


@pytest.fixture
def encoded_pubsub_data() -> str:
    """Create base64 encoded Pub/Sub data."""
    data = {"test": "data"}
    return base64.b64encode(json.dumps(data).encode()).decode("utf-8")


@pytest.fixture
def mock_discord_webhook_response() -> Mock:
    """Mock successful Discord webhook response."""
    response = Mock()
    response.status_code = 204
    response.text = ""
    return response
