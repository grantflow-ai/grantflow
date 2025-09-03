import base64
import json
from typing import Any

import pytest

from services.backend.src.api.webhooks.email_sending import (
    EmailNotificationRequest,
    GrantAlertRequest,
    SubscriptionVerificationRequest,
    handle_pubsub_message,
)


def create_pubsub_event(data: dict[str, Any]) -> dict[str, Any]:
    encoded_data = base64.b64encode(json.dumps(data).encode()).decode()
    return {
        "message": {
            "data": encoded_data,
            "messageId": "test-msg-123",
            "publishTime": "2024-01-01T00:00:00Z",
        },
        "subscription": "test-subscription",
    }


def test_handle_pubsub_message_email_notification() -> None:
    data = {
        "application_id": "550e8400-e29b-41d4-a716-446655440000",
        "firebase_uid": "test-firebase-uid",
        "trace_id": "trace-123",
    }
    
    event = create_pubsub_event(data)
    result = handle_pubsub_message(event)
    
    assert isinstance(result, dict)
    assert "application_id" in result
    assert str(result["application_id"]) == data["application_id"]
    assert result["firebase_uid"] == data["firebase_uid"]
    assert result["trace_id"] == data["trace_id"]


def test_handle_pubsub_message_subscription_verification() -> None:
    data = {
        "email": "test@example.com",
        "subscription_id": "sub-123",
        "verification_token": "token-456",
        "search_params": {"query": "AI"},
        "frequency": "weekly",
        "trace_id": "trace-789",
    }
    
    event = create_pubsub_event(data)
    result = handle_pubsub_message(event)
    
    assert isinstance(result, dict)
    assert "subscription_id" in result
    assert result["email"] == data["email"]
    assert result["subscription_id"] == data["subscription_id"]
    assert result["verification_token"] == data["verification_token"]
    assert result["search_params"] == data["search_params"]
    assert result["frequency"] == data["frequency"]


def test_handle_pubsub_message_grant_alert() -> None:
    data = {
        "email": "recipient@example.com",
        "template_data": {
            "grants": [
                {"title": "Grant 1", "amount": "$100,000"},
                {"title": "Grant 2", "amount": "$50,000"},
            ],
            "frequency": "daily",
            "unsubscribe_url": "https://example.com/unsub",
        },
        "trace_id": "trace-alert",
    }
    
    event = create_pubsub_event(data)
    result = handle_pubsub_message(event)
    
    assert isinstance(result, dict)
    assert "template_data" in result
    assert result["email"] == data["email"]
    assert result["template_data"]["grants"] == data["template_data"]["grants"]
    assert result["template_data"]["frequency"] == data["template_data"]["frequency"]
    assert result["template_data"]["unsubscribe_url"] == data["template_data"]["unsubscribe_url"]


def test_handle_pubsub_message_unknown_format() -> None:
    data = {
        "unknown_field": "unknown_value",
        "another_field": 123,
    }
    
    event = create_pubsub_event(data)
    
    with pytest.raises(Exception) as exc_info:
        handle_pubsub_message(event)
    
    assert "Unknown pubsub request" in str(exc_info.value)


def test_handle_pubsub_message_minimal_email_notification() -> None:
    data = {
        "application_id": "550e8400-e29b-41d4-a716-446655440000",
        "firebase_uid": "uid-123",
    }
    
    event = create_pubsub_event(data)
    result = handle_pubsub_message(event)
    
    assert isinstance(result, dict)
    assert "application_id" in result
    assert str(result["application_id"]) == data["application_id"]
    assert result["firebase_uid"] == data["firebase_uid"]
    assert "trace_id" not in result


def test_handle_pubsub_message_minimal_subscription_verification() -> None:
    data = {
        "email": "test@example.com",
        "subscription_id": "sub-123",
        "verification_token": "token-456",
    }
    
    event = create_pubsub_event(data)
    result = handle_pubsub_message(event)
    
    assert isinstance(result, dict)
    assert "subscription_id" in result
    assert result["email"] == data["email"]
    assert result["subscription_id"] == data["subscription_id"]
    assert result["verification_token"] == data["verification_token"]
    assert "search_params" not in result
    assert "frequency" not in result


def test_handle_pubsub_message_minimal_grant_alert() -> None:
    data = {
        "email": "recipient@example.com",
        "template_data": {
            "grants": [],
            "frequency": "daily",
            "unsubscribe_url": "https://example.com/unsub",
        },
    }
    
    event = create_pubsub_event(data)
    result = handle_pubsub_message(event)
    
    assert isinstance(result, dict)
    assert "template_data" in result
    assert result["email"] == data["email"]
    assert result["template_data"]["grants"] == []
    assert "trace_id" not in result