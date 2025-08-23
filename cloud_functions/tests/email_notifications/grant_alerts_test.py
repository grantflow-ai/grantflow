import base64
import json
from unittest.mock import AsyncMock, MagicMock, patch

from cloudevents.http import CloudEvent


@patch("cloud_functions.src.email_notifications.main.send_resend_email")
@patch("cloud_functions.src.email_notifications.main.jinja_env")
async def test_send_grant_alert_email_success(
    mock_jinja_env: MagicMock,
    mock_send_resend: AsyncMock,
) -> None:
    from cloud_functions.src.email_notifications.main import send_grant_alert_email

    mock_template = MagicMock()
    mock_template.render.return_value = "<html>Grant Alert</html>"
    mock_jinja_env.get_template.return_value = mock_template

    mock_send_resend.return_value = {"id": "email-123"}

    notification_data = {
        "email": "subscriber@example.com",
        "template_type": "grant_alert",
        "template_data": {
            "grants": [
                {
                    "id": "grant-1",
                    "title": "Healthcare Research Grant",
                    "amount": "$50,000",
                    "deadline": "2024-12-31",
                    "url": "https://example.com/grant1",
                },
                {
                    "id": "grant-2",
                    "title": "Innovation Grant",
                    "amount": "$100,000",
                    "deadline": "2024-11-30",
                    "url": "https://example.com/grant2",
                },
            ],
            "frequency": "daily",
            "subscription_id": "sub-123",
            "unsubscribe_url": "https://grantflow.ai/grants/unsubscribe?id=sub-123",
        },
    }

    result = await send_grant_alert_email(notification_data)  # type: ignore[arg-type]

    assert result["status"] == "success"
    assert result["message"] == "Grant alert sent successfully"

    mock_jinja_env.get_template.assert_called_once_with("grant_alert.html")
    mock_template.render.assert_called_once_with(
        grants=notification_data["template_data"]["grants"],  # type: ignore[index]
        frequency="daily",
        unsubscribe_url="https://grantflow.ai/grants/unsubscribe?id=sub-123",
    )

    mock_send_resend.assert_called_once()
    mock_send_resend.assert_called_with(
        "subscriber@example.com",
        "🎯 2 New Grants Available",
        "<html>Grant Alert</html>",
        [],
    )


@patch("cloud_functions.src.email_notifications.main.send_resend_email")
@patch("cloud_functions.src.email_notifications.main.jinja_env")
async def test_send_grant_alert_single_grant(
    mock_jinja_env: MagicMock,
    mock_send_resend: AsyncMock,
) -> None:
    from cloud_functions.src.email_notifications.main import send_grant_alert_email

    mock_template = MagicMock()
    mock_template.render.return_value = "<html>Single Grant</html>"
    mock_jinja_env.get_template.return_value = mock_template
    mock_send_resend.return_value = {"id": "email-456"}

    notification_data = {
        "email": "user@example.com",
        "template_type": "grant_alert",
        "template_data": {
            "grants": [
                {
                    "id": "grant-1",
                    "title": "Single Grant",
                    "amount": "$25,000",
                },
            ],
            "frequency": "weekly",
            "unsubscribe_url": "https://grantflow.ai/unsubscribe",
        },
    }

    result = await send_grant_alert_email(notification_data)  # type: ignore[arg-type]

    assert result["status"] == "success"

    mock_send_resend.assert_called_once()
    args = mock_send_resend.call_args.args
    assert args[1] == "🎯 1 New Grant Available"


@patch("cloud_functions.src.email_notifications.main.send_resend_email")
async def test_send_grant_alert_email_failure(
    mock_send_resend: AsyncMock,
) -> None:
    from cloud_functions.src.email_notifications.main import send_grant_alert_email

    mock_send_resend.side_effect = Exception("Resend API error")

    notification_data = {
        "email": "user@example.com",
        "template_type": "grant_alert",
        "template_data": {
            "grants": [],
            "frequency": "daily",
            "unsubscribe_url": "https://grantflow.ai/unsubscribe",
        },
    }

    result = await send_grant_alert_email(notification_data)  # type: ignore[arg-type]

    assert result["status"] == "error"
    assert "Failed to send grant alert: Resend API error" in result["message"]


@patch("cloud_functions.src.email_notifications.main.send_grant_alert_email")
async def test_main_function_routes_grant_alerts(
    mock_send_grant_alert: AsyncMock,
) -> None:
    from cloud_functions.src.email_notifications.main import send_application_email

    mock_send_grant_alert.return_value = {
        "status": "success",
        "message": "Grant alert sent successfully",
    }

    grant_alert_data = {
        "email": "user@example.com",
        "template_type": "grant_alert",
        "template_data": {
            "grants": [{"title": "Test Grant"}],
            "frequency": "daily",
            "unsubscribe_url": "https://example.com/unsubscribe",
        },
    }

    cloud_event = CloudEvent(
        {
            "type": "google.cloud.pubsub.topic.v1.messagePublished",
            "source": "//pubsub.googleapis.com/projects/test/topics/email",
        },
        {
            "message": {
                "data": base64.b64encode(json.dumps(grant_alert_data).encode()).decode(),
            },
        },
    )

    result = await send_application_email(cloud_event)

    assert result["status"] == "success"
    mock_send_grant_alert.assert_called_once_with(grant_alert_data)


@patch("cloud_functions.src.email_notifications.main.get_application_data")
@patch("cloud_functions.src.email_notifications.main.send_resend_email")
async def test_main_function_routes_application_emails(
    mock_send_resend: AsyncMock,
    mock_get_app_data: AsyncMock,
) -> None:
    from cloud_functions.src.email_notifications.main import send_application_email

    mock_get_app_data.return_value = {
        "application": {
            "id": "app-123",
            "title": "Test Application",
            "text": "# Application Content",
            "created_at": "2024-01-01T00:00:00",
        },
        "user": {
            "email": "user@example.com",
            "name": "Test User",
        },
        "project": {
            "id": "proj-123",
            "name": "Test Project",
        },
    }

    mock_send_resend.return_value = {"id": "email-789"}

    application_data = {
        "application_id": "app-123",
    }

    cloud_event = CloudEvent(
        {
            "type": "google.cloud.pubsub.topic.v1.messagePublished",
            "source": "//pubsub.googleapis.com/projects/test/topics/email",
        },
        {
            "message": {
                "data": base64.b64encode(json.dumps(application_data).encode()).decode(),
            },
        },
    )

    with patch("cloud_functions.src.email_notifications.main.markdown_to_docx") as mock_docx:
        mock_docx.return_value = b"docx content"
        with patch("cloud_functions.src.email_notifications.main.jinja_env") as mock_jinja:
            mock_template = MagicMock()
            mock_template.render.return_value = "<html>Application Ready</html>"
            mock_jinja.get_template.return_value = mock_template

            result = await send_application_email(cloud_event)

    assert result["status"] == "success"
    mock_get_app_data.assert_called_once_with("app-123")
    mock_send_resend.assert_called_once()
