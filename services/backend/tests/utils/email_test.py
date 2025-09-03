import base64
from unittest.mock import AsyncMock, MagicMock, Mock, patch
from uuid import uuid4

import pytest
from pytest_mock import MockerFixture

from services.backend.src.utils.email import (
    send_application_ready_email,
    send_grant_alert_email,
    send_resend_email,
)


@pytest.fixture
def mock_resend_api_key() -> str:
    return "test-resend-key"


@pytest.fixture
def mock_site_url() -> str:
    return "https://test.grantflow.ai"


@pytest.fixture
def mock_email_env(mock_resend_api_key: str, mock_site_url: str, mocker: MockerFixture) -> None:
    mocker.patch(
        "services.backend.src.utils.email.get_env",
        side_effect=lambda key, fallback=None: {
            "RESEND_API_KEY": mock_resend_api_key,
            "SITE_URL": mock_site_url,
        }.get(key, fallback),
    )


@pytest.fixture
def mock_httpx_post(mocker: MockerFixture) -> AsyncMock:
    mock_response = AsyncMock()
    mock_response.raise_for_status = MagicMock()

    mock_post = AsyncMock(return_value=mock_response)

    mock_client = AsyncMock()
    mock_client.post = mock_post
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    mocker.patch("services.backend.src.utils.email.httpx.AsyncClient", return_value=mock_client)

    return mock_post


@pytest.fixture
def mock_jinja_template(mocker: MockerFixture) -> MagicMock:
    mock_template = MagicMock()
    mock_template.render.return_value = "<html>Test Email Content</html>"

    mock_env = MagicMock()
    mock_env.get_template.return_value = mock_template

    mocker.patch("services.backend.src.utils.email.jinja_env", mock_env)

    return mock_template


async def test_send_resend_email_with_attachments(
    mock_httpx_post: AsyncMock,
    mock_email_env: None,
    mock_resend_api_key: str,
) -> None:
    await send_resend_email(
        to_email="test@example.com",
        subject="Test Subject",
        html="<html>Test Body</html>",
        attachments=[
            {"filename": "test.txt", "content": "dGVzdCBjb250ZW50"},
        ],
    )

    mock_httpx_post.assert_called_once_with(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {mock_resend_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": "GrantFlow <notifications@grantflow.ai>",
            "to": ["test@example.com"],
            "subject": "Test Subject",
            "html": "<html>Test Body</html>",
            "attachments": [{"filename": "test.txt", "content": "dGVzdCBjb250ZW50"}],
        },
    )


async def test_send_resend_email_without_attachments(
    mock_httpx_post: AsyncMock,
    mock_email_env: None,
) -> None:
    await send_resend_email(
        to_email="recipient@example.com",
        subject="Simple Email",
        html="<p>Simple content</p>",
    )

    call_args = mock_httpx_post.call_args
    assert call_args.kwargs["json"]["to"] == ["recipient@example.com"]
    assert call_args.kwargs["json"]["subject"] == "Simple Email"
    assert call_args.kwargs["json"]["attachments"] == []


async def test_send_grant_alert_email(
    mock_httpx_post: AsyncMock,
    mock_email_env: None,
    mock_jinja_template: MagicMock,
) -> None:
    grants = [
        {"title": "Research Grant 1", "amount": "$50,000"},
        {"title": "Research Grant 2", "amount": "$75,000"},
    ]

    await send_grant_alert_email(
        email="researcher@example.com",
        grants=grants,
        frequency="daily",
        unsubscribe_url="https://test.grantflow.ai/unsubscribe/token-123",
    )

    mock_jinja_template.render.assert_called_once_with(
        grants=grants,
        frequency="daily",
        unsubscribe_url="https://test.grantflow.ai/unsubscribe/token-123",
    )

    mock_httpx_post.assert_called_once()
    call_args = mock_httpx_post.call_args
    assert call_args.kwargs["json"]["to"] == ["researcher@example.com"]
    assert call_args.kwargs["json"]["subject"] == "🎯 2 New Grants Available"


async def test_send_grant_alert_email_single_grant(
    mock_httpx_post: AsyncMock,
    mock_email_env: None,
    mock_jinja_template: MagicMock,
) -> None:
    grants = [{"title": "Single Grant", "amount": "$25,000"}]

    await send_grant_alert_email(
        email="user@example.com",
        grants=grants,
        frequency="weekly",
        unsubscribe_url="https://test.grantflow.ai/unsubscribe",
    )

    call_args = mock_httpx_post.call_args
    assert call_args.kwargs["json"]["subject"] == "🎯 1 New Grant Available"


@patch("services.backend.src.utils.email.markdown_to_docx")
async def test_send_application_ready_email(
    mock_markdown_to_docx: Mock,
    mock_httpx_post: AsyncMock,
    mock_email_env: None,
    mock_jinja_template: MagicMock,
    mock_site_url: str,
) -> None:
    application_id = uuid4()
    project_id = uuid4()

    mock_markdown_to_docx.return_value = b"docx-content"

    await send_application_ready_email(
        application_title="Grant Application Title",
        application_text="# Application\n\nContent here",
        project_id=str(project_id),
        application_id=str(application_id),
        user_email="applicant@example.com",
        user_name="Applicant Name",
    )

    mock_markdown_to_docx.assert_called_once_with("# Application\n\nContent here")
    mock_jinja_template.render.assert_called_once()
    render_call = mock_jinja_template.render.call_args
    assert render_call.kwargs["application_title"] == "Grant Application Title"
    assert render_call.kwargs["user_name"] == "Applicant Name"
    assert str(application_id) in render_call.kwargs["editor_url"]

    mock_httpx_post.assert_called_once()
    call_args = mock_httpx_post.call_args
    json_data = call_args.kwargs["json"]

    assert json_data["to"] == ["applicant@example.com"]
    assert json_data["subject"] == "Your Grant Application is Ready - Grant Application Title"
    assert len(json_data["attachments"]) == 2

    md_attachment = next(a for a in json_data["attachments"] if a["filename"].endswith(".md"))
    docx_attachment = next(a for a in json_data["attachments"] if a["filename"].endswith(".docx"))

    assert md_attachment["filename"] == "Grant Application Title.md"
    assert docx_attachment["filename"] == "Grant Application Title.docx"

    decoded_md = base64.b64decode(md_attachment["content"]).decode()
    assert decoded_md == "# Application\n\nContent here"

    decoded_docx = base64.b64decode(docx_attachment["content"])
    assert decoded_docx == b"docx-content"
