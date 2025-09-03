import base64
from pathlib import Path
from typing import Any, TypedDict

import httpx
from jinja2 import Environment, FileSystemLoader
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

from services.backend.src.utils.docx import markdown_to_docx

logger = get_logger(__name__)

template_dir = Path(__file__).parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(template_dir), autoescape=True)


class ResendAttachment(TypedDict):
    filename: str
    content: str


async def send_resend_email(
    *,
    to_email: str,
    subject: str,
    html: str,
    attachments: list[ResendAttachment] | None = None,
) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {get_env('RESEND_API_KEY')}",
                "Content-Type": "application/json",
            },
            json={
                "from": "GrantFlow <notifications@grantflow.ai>",
                "to": [to_email],
                "subject": subject,
                "html": html,
                "attachments": attachments or [],
            },
        )
        response.raise_for_status()


async def send_grant_alert_email(
    email: str,
    grants: list[dict[str, Any]],
    frequency: str,
    unsubscribe_url: str,
) -> None:
    template = jinja_env.get_template("grant_alert.html")
    html_content = template.render(
        grants=grants,
        frequency=frequency,
        unsubscribe_url=unsubscribe_url,
    )

    grant_count = len(grants)
    subject = f"🎯 {grant_count} New Grant{'s' if grant_count != 1 else ''} Available"

    await send_resend_email(
        to_email=email,
        subject=subject,
        html=html_content,
    )

    logger.info(
        "Grant alert email sent",
        email=email,
        grant_count=grant_count,
    )


async def send_application_ready_email(
    application_title: str,
    application_text: str,
    project_id: str,
    application_id: str,
    user_email: str,
    user_name: str,
) -> None:
    docx_content = markdown_to_docx(application_text)

    template = jinja_env.get_template("application_ready.html")
    site_url = get_env("SITE_URL", fallback="https://grantflow.ai")

    html_content = template.render(
        application_title=application_title,
        user_name=user_name,
        site_url=site_url,
        editor_url=f"{site_url}/projects/{project_id}/applications/{application_id}/editor",
    )

    attachments: list[ResendAttachment] = [
        ResendAttachment(
            filename=f"{application_title}.md",
            content=base64.b64encode(application_text.encode()).decode(),
        ),
        ResendAttachment(
            filename=f"{application_title}.docx",
            content=base64.b64encode(docx_content).decode(),
        ),
    ]

    subject = f"Your Grant Application is Ready - {application_title}"

    await send_resend_email(
        to_email=user_email,
        subject=subject,
        html=html_content,
        attachments=attachments,
    )

    logger.info(
        "Application email sent",
        application_id=application_id,
        email=user_email,
    )
