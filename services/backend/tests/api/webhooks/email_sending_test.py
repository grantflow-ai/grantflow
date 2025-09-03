import base64
import json
from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from packages.db.src.tables import GrantApplication, Organization, Project

from services.backend.tests.conftest import TestingClientType


def create_pubsub_message(data: dict[str, Any]) -> dict[str, Any]:
    encoded_data = base64.b64encode(json.dumps(data).encode()).decode()
    return {
        "message": {
            "data": encoded_data,
            "messageId": f"msg-{uuid4()}",
            "publishTime": "2024-01-01T00:00:00Z",
        },
        "subscription": "projects/test-project/subscriptions/test-subscription",
    }


@pytest.fixture
def webhook_token() -> str:
    return "test-webhook-token-123"


@pytest.fixture
def mock_webhook_env(webhook_token: str) -> Generator[None]:
    with patch("services.backend.src.api.webhooks.email_sending.get_env") as mock_get_env:
        mock_get_env.return_value = webhook_token
        yield


@pytest.fixture
def mock_send_subscription_verification_email() -> Generator[AsyncMock]:
    with patch("services.backend.src.api.webhooks.email_sending.send_subscription_verification_email", new_callable=AsyncMock) as mock:
        yield mock


@pytest.fixture
def mock_send_grant_alert_email() -> Generator[AsyncMock]:
    with patch("services.backend.src.api.webhooks.email_sending.send_grant_alert_email", new_callable=AsyncMock) as mock:
        yield mock


@pytest.fixture
def mock_send_application_ready_email() -> Generator[AsyncMock]:
    with patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email", new_callable=AsyncMock) as mock:
        yield mock


async def test_webhook_unauthorized_no_token(
    test_client: TestingClientType,
    mock_webhook_env: None,
) -> None:
    data = create_pubsub_message({"application_id": str(uuid4())})

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
    response_data = response.json()
    assert response_data["status"] == "error"
    assert response_data["message"] == "Unauthorized"


async def test_webhook_unauthorized_wrong_token(
    test_client: TestingClientType,
    mock_webhook_env: None,
) -> None:
    data = create_pubsub_message({"application_id": str(uuid4())})

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": "Bearer wrong-token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
    response_data = response.json()
    assert response_data["status"] == "error"
    assert response_data["message"] == "Unauthorized"


async def test_webhook_invalid_message_no_data(
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
) -> None:
    data = {
        "message": {
            "data": "",
            "messageId": f"msg-{uuid4()}",
            "publishTime": "2024-01-01T00:00:00Z",
        },
        "subscription": "projects/test-project/subscriptions/test-subscription",
    }

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    response_data = response.json()
    assert response_data["status"] == "error"
    assert "No data in Pub/Sub message" in response_data["message"]


async def test_webhook_invalid_json_in_message(
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
) -> None:
    invalid_json = "{'not': 'valid json}"
    encoded_data = base64.b64encode(invalid_json.encode()).decode()

    data = {
        "message": {
            "data": encoded_data,
            "messageId": f"msg-{uuid4()}",
            "publishTime": "2024-01-01T00:00:00Z",
        },
        "subscription": "projects/test-project/subscriptions/test-subscription",
    }

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    response_data = response.json()
    assert response_data["status"] == "error"
    assert "Invalid Pub/Sub message format" in response_data["message"]


async def test_webhook_subscription_verification_email(
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
    mock_send_subscription_verification_email: AsyncMock,
) -> None:
    data = create_pubsub_message({
        "template_type": "subscription_verification",
        "email": "test@example.com",
        "subscription_id": "sub-123",
        "verification_token": "verify-token-456",
        "search_params": {"query": "AI research"},
        "frequency": "weekly",
        "trace_id": "trace-789",
    })

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["message"] == "Verification email sent successfully"

    mock_send_subscription_verification_email.assert_called_once_with(
        email="test@example.com",
        subscription_id="sub-123",
        verification_token="verify-token-456",
        search_params={"query": "AI research"},
        frequency="weekly",
    )


async def test_webhook_grant_alert_email(
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
    mock_send_grant_alert_email: AsyncMock,
) -> None:
    grants = [
        {"title": "Grant 1", "amount": "$100,000"},
        {"title": "Grant 2", "amount": "$50,000"},
    ]

    data = create_pubsub_message({
        "template_type": "grant_alert",
        "email": "recipient@example.com",
        "template_data": {
            "grants": grants,
            "frequency": "daily",
            "unsubscribe_url": "https://example.com/unsubscribe",
        },
        "trace_id": "trace-alert-123",
    })

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["message"] == "Grant alert sent successfully"

    mock_send_grant_alert_email.assert_called_once_with(
        email="recipient@example.com",
        grants=grants,
        frequency="daily",
        unsubscribe_url="https://example.com/unsubscribe",
    )


@patch("services.backend.src.api.webhooks.email_sending.get_user", new_callable=AsyncMock)
@patch("services.backend.src.api.webhooks.email_sending.retrieve_application", new_callable=AsyncMock)
@patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email", new_callable=AsyncMock)
async def test_webhook_application_ready_email(
    mock_send_email: AsyncMock,
    mock_get_application_data: AsyncMock,
    mock_get_user: AsyncMock,
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
) -> None:
    application_id = str(uuid4())
    firebase_uid = "test-firebase-uid"

    # Mock application data
    mock_project = MagicMock(spec=Project)
    mock_project.id = uuid4()
    mock_project.name = "Test Project"

    mock_app = MagicMock(spec=GrantApplication)
    mock_app.id = uuid4()
    mock_app.title = "Test Application"
    mock_app.text = "Application content"
    mock_app.project = mock_project

    mock_get_application_data.return_value = mock_app
    mock_get_user.return_value = {
        "email": "user@example.com",
        "display_name": "Test User",
    }
    mock_send_email.return_value = None

    data = create_pubsub_message({
        "application_id": application_id,
        "firebase_uid": firebase_uid,
        "trace_id": "trace-app-456",
    })

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["message"] == "Email notification sent successfully"

    mock_send_email.assert_called_once_with(
        application_title="Test Application",
        application_text="Application content",
        project_id=str(mock_project.id),
        application_id=str(mock_app.id),
        user_email="user@example.com",
        user_name="Test User",
    )


@patch("services.backend.src.api.webhooks.email_sending.get_user", new_callable=AsyncMock)
@patch("services.backend.src.api.webhooks.email_sending.retrieve_application", new_callable=AsyncMock)
@patch("services.backend.src.api.webhooks.email_sending.send_application_ready_email")
async def test_webhook_email_sending_failure(
    mock_send_email: AsyncMock,
    mock_get_application_data: AsyncMock,
    mock_get_user: AsyncMock,
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
) -> None:
    mock_send_email.side_effect = Exception("Email service unavailable")

    # Mock application data
    mock_project = MagicMock(spec=Project)
    mock_project.id = uuid4()
    
    mock_app = MagicMock(spec=GrantApplication)
    mock_app.id = uuid4()
    mock_app.title = "Test"
    mock_app.text = "Content"
    mock_app.project = mock_project

    mock_get_application_data.return_value = mock_app
    mock_get_user.return_value = {
        "email": "user@example.com",
        "display_name": "Test User",
    }

    application_id = str(uuid4())
    firebase_uid = "test-firebase-uid"
    data = create_pubsub_message({
        "application_id": application_id,
        "firebase_uid": firebase_uid,
    })

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    response_data = response.json()
    assert response_data["status"] == "error"
    assert "Failed to send email" in response_data["message"]


@patch("services.backend.src.api.webhooks.email_sending.send_subscription_verification_email")
async def test_webhook_subscription_email_failure(
    mock_send_email: AsyncMock,
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
) -> None:
    mock_send_email.side_effect = Exception("SMTP connection failed")

    data = create_pubsub_message({
        "template_type": "subscription_verification",
        "email": "test@example.com",
        "subscription_id": "sub-123",
        "verification_token": "verify-token-456",
    })

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    response_data = response.json()
    assert response_data["status"] == "error"
    assert "Failed to send email: SMTP connection failed" in response_data["message"]


async def test_webhook_malformed_base64_data(
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
) -> None:
    data = {
        "message": {
            "data": "not-valid-base64!!!",
            "messageId": f"msg-{uuid4()}",
            "publishTime": "2024-01-01T00:00:00Z",
        },
        "subscription": "projects/test-project/subscriptions/test-subscription",
    }

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    response_data = response.json()
    assert response_data["status"] == "error"
    assert "Invalid Pub/Sub message format" in response_data["message"]


async def test_webhook_with_trace_id_propagation(
    test_client: TestingClientType,
    webhook_token: str,
    mock_webhook_env: None,
    mock_send_subscription_verification_email: AsyncMock,
) -> None:
    trace_id = "trace-id-xyz-789"
    data = create_pubsub_message({
        "template_type": "subscription_verification",
        "email": "test@example.com",
        "subscription_id": "sub-123",
        "verification_token": "verify-token-456",
        "trace_id": trace_id,
    })

    response = await test_client.post(
        "/webhooks/pubsub/email-notifications",
        json=data,
        headers={"Authorization": f"Bearer {webhook_token}"},
    )

    assert response.status_code == HTTPStatus.OK
    response_data = response.json()
    assert response_data["status"] == "success"

