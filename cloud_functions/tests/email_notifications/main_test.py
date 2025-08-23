import base64
import json
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest
from cloudevents.http import CloudEvent

from cloud_functions.src.email_notifications.main import (
    get_application_data,
    markdown_to_docx,
    send_application_email,
    send_resend_email,
)


@pytest.fixture
def cloud_event_data() -> dict[str, Any]:
    return {
        "application_id": "123e4567-e89b-12d3-a456-426614174000",
    }


@pytest.fixture
def mock_cloud_event(cloud_event_data: dict[str, Any]) -> CloudEvent:
    message_data = base64.b64encode(json.dumps(cloud_event_data).encode()).decode("utf-8")
    attributes = {
        "type": "google.cloud.pubsub.topic.v1.messagePublished",
        "source": "test",
    }
    data = {
        "message": {
            "data": message_data,
            "attributes": {},
        }
    }
    return CloudEvent(attributes, data)


@pytest.fixture
def mock_application_data() -> dict[str, Any]:
    return {
        "application": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "title": "Test Grant Application",
            "text": "# Grant Application\n\n## Introduction\n\nThis is a test grant application.",
            "created_at": "2023-01-01T00:00:00",
        },
        "user": {
            "email": "test@example.com",
            "name": "Test Organization",
        },
        "project": {
            "id": "456e7890-e89b-12d3-a456-426614174000",
            "name": "Test Project",
        },
    }


async def test_get_application_data_success(
    mock_application_data: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DATABASE_CONNECTION_STRING", "postgresql://test:test@localhost/test")

    with (
        patch("cloud_functions.src.email_notifications.main.create_async_engine"),
        patch("cloud_functions.src.email_notifications.main.sessionmaker") as mock_sessionmaker,
    ):
        mock_session = AsyncMock()
        mock_session_maker = Mock()
        mock_session_maker.return_value = AsyncMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_sessionmaker.return_value = mock_session_maker

        mock_application = Mock()
        mock_application.id = "123e4567-e89b-12d3-a456-426614174000"
        mock_application.title = "Test Grant Application"
        mock_application.text = "# Grant Application\n\n## Introduction\n\nThis is a test grant application."
        mock_application.created_at = Mock(isoformat=Mock(return_value="2023-01-01T00:00:00"))

        mock_project = Mock()
        mock_project.id = "456e7890-e89b-12d3-a456-426614174000"
        mock_project.name = "Test Project"
        mock_project.organization_id = "org-123"

        mock_app_result = Mock()
        mock_app_result.first.return_value = (mock_application, mock_project)

        mock_org_user = Mock()
        mock_org_user.firebase_uid = "user-123"
        mock_org_user_result = Mock()
        mock_org_user_result.scalar_one_or_none.return_value = mock_org_user

        mock_organization = Mock()
        mock_organization.contact_email = "test@example.com"
        mock_organization.contact_person_name = "Test Organization"
        mock_organization.name = "Test Org"
        mock_org_result = Mock()
        mock_org_result.scalar_one.return_value = mock_organization

        mock_session.execute.side_effect = [mock_app_result, mock_org_user_result, mock_org_result]

        result = await get_application_data("123e4567-e89b-12d3-a456-426614174000")

        assert result["application"]["id"] == "123e4567-e89b-12d3-a456-426614174000"
        assert result["application"]["title"] == "Test Grant Application"
        assert result["user"]["email"] == "test@example.com"
        assert result["project"]["name"] == "Test Project"


async def test_get_application_data_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_CONNECTION_STRING", "postgresql://test:test@localhost/test")

    with (
        patch("cloud_functions.src.email_notifications.main.create_async_engine"),
        patch("cloud_functions.src.email_notifications.main.sessionmaker") as mock_sessionmaker,
    ):
        mock_session = AsyncMock()
        mock_session_maker = Mock()
        mock_session_maker.return_value = AsyncMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session
        mock_sessionmaker.return_value = mock_session_maker

        mock_result = Mock()
        mock_result.first.return_value = None
        mock_session.execute.return_value = mock_result

        with pytest.raises(ValueError, match="Application .* not found"):
            await get_application_data("123e4567-e89b-12d3-a456-426614174000")


def test_markdown_to_docx() -> None:
    markdown_text = """# Test Document

## Section 1

This is a test paragraph.

### Subsection 1.1

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2

## Section 2

Another paragraph with **bold** text.
"""

    docx_bytes = markdown_to_docx(markdown_text)

    assert isinstance(docx_bytes, bytes)
    assert len(docx_bytes) > 0
    assert docx_bytes[:2] == b"PK"


async def test_send_resend_email_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RESEND_API_KEY", "test-api-key")

    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "email-123", "status": "sent"}

    with patch("httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_context
        mock_context.post.return_value = mock_response

        result = await send_resend_email(
            to_email="test@example.com",
            subject="Test Email",
            html="<p>Test content</p>",
            attachments=[],
        )

        assert result["id"] == "email-123"
        assert result["status"] == "sent"

        mock_context.post.assert_called_once()
        call_args = mock_context.post.call_args

        assert call_args[0][0] == "https://api.resend.com/emails"
        assert call_args[1]["headers"]["Authorization"] == "Bearer test-api-key"
        assert call_args[1]["json"]["to"] == ["test@example.com"]
        assert call_args[1]["json"]["subject"] == "Test Email"


async def test_send_resend_email_api_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RESEND_API_KEY", "test-api-key")

    mock_response = Mock()
    mock_response.status_code = 400
    mock_response.text = "Invalid API key"

    with patch("httpx.AsyncClient") as mock_client:
        mock_context = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_context
        mock_context.post.return_value = mock_response

        with pytest.raises(Exception, match="Resend API error: 400"):
            await send_resend_email(
                to_email="test@example.com",
                subject="Test Email",
                html="<p>Test content</p>",
                attachments=[],
            )


async def test_send_application_email_success(
    mock_cloud_event: CloudEvent,
    mock_application_data: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SITE_URL", "https://test.grantflow.ai")

    with (
        patch("cloud_functions.src.email_notifications.main.get_application_data") as mock_get_data,
        patch("cloud_functions.src.email_notifications.main.send_resend_email") as mock_send_email,
        patch("cloud_functions.src.email_notifications.main.jinja_env") as mock_jinja_env,
    ):
        mock_template = Mock()
        mock_template.render.return_value = "<html>Test email content</html>"
        mock_jinja_env.get_template.return_value = mock_template

        mock_get_data.return_value = mock_application_data
        mock_send_email.return_value = {"id": "email-123", "status": "sent"}

        result = await send_application_email(mock_cloud_event)

        assert result["status"] == "success"
        assert result["message"] == "Email sent successfully"

        mock_get_data.assert_called_once_with("123e4567-e89b-12d3-a456-426614174000")
        mock_send_email.assert_called_once()

        mock_jinja_env.get_template.assert_called_once_with("application_ready.html")
        mock_template.render.assert_called_once_with(
            application_title="Test Grant Application",
            user_name="Test Organization",
            site_url="https://test.grantflow.ai",
            editor_url="https://test.grantflow.ai/projects/456e7890-e89b-12d3-a456-426614174000/applications/123e4567-e89b-12d3-a456-426614174000/editor",
        )

        args, kwargs = mock_send_email.call_args

        assert len(args) == 4
        assert args[0] == "test@example.com"
        assert "Test Grant Application" in args[1]
        assert args[2] == "<html>Test email content</html>"
        assert len(args[3]) == 2


async def test_send_application_email_invalid_event() -> None:
    invalid_event = CloudEvent({"type": "test", "source": "test"})

    result = await send_application_email(invalid_event)

    assert result["status"] == "error"
    assert "Invalid CloudEvent format" in result["message"]


async def test_send_application_email_missing_application_id() -> None:
    message_data = base64.b64encode(json.dumps({}).encode()).decode("utf-8")
    event_attributes = {
        "type": "google.cloud.pubsub.topic.v1.messagePublished",
        "source": "test",
    }
    event_data = {"message": {"data": message_data}}
    event = CloudEvent(event_attributes, event_data)

    result = await send_application_email(event)

    assert result["status"] == "error"
    assert result["message"] == "Missing application_id in message"


async def test_send_application_email_database_error(
    mock_cloud_event: CloudEvent, monkeypatch: pytest.MonkeyPatch
) -> None:
    with patch("cloud_functions.src.email_notifications.main.get_application_data") as mock_get_data:
        mock_get_data.side_effect = Exception("Database connection failed")

        result = await send_application_email(mock_cloud_event)

        assert result["status"] == "error"
        assert "Failed to send email" in result["message"]


def test_sync_wrapper_success(mock_cloud_event: CloudEvent, monkeypatch: pytest.MonkeyPatch) -> None:
    from cloud_functions.src.email_notifications.main import main

    with patch("cloud_functions.src.email_notifications.main.send_application_email") as mock_send:
        mock_send.return_value = {"status": "success", "message": "Email sent successfully"}

        main(mock_cloud_event)


def test_sync_wrapper_error(mock_cloud_event: CloudEvent, monkeypatch: pytest.MonkeyPatch) -> None:
    from cloud_functions.src.email_notifications.main import main

    with patch("cloud_functions.src.email_notifications.main.send_application_email") as mock_send:
        mock_send.return_value = {"status": "error", "message": "Test error"}

        with pytest.raises(Exception, match="Test error"):
            main(mock_cloud_event)
