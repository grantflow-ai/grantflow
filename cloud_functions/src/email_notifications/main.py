import asyncio
import base64
import json
import os
from io import BytesIO
from typing import Any

import functions_framework
import httpx
from cloudevents.http import CloudEvent
from docx import Document
from markdown import markdown
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

logger = __import__("logging").getLogger(__name__)


async def get_application_data(application_id: str) -> dict[str, Any]:
    """Fetch application data from the database."""
    db_connection_string = os.environ.get("DATABASE_CONNECTION_STRING")
    if not db_connection_string:
        raise ValueError("DATABASE_CONNECTION_STRING not configured")

    # Import here to avoid circular imports
    from packages.db.src.tables import GrantApplication, OrganizationUser, Project  # noqa: PLC0415

    engine = create_async_engine(db_connection_string)
    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)  # type: ignore[call-overload]

    async with async_session_maker() as session:
        # Get application with project
        app_result = await session.execute(
            select(GrantApplication, Project)
            .join(Project, GrantApplication.project_id == Project.id)
            .where(GrantApplication.id == application_id)
        )
        app_row = app_result.first()

        if not app_row:
            raise ValueError(f"Application {application_id} not found")

        application, project = app_row

        # For now, we'll use the project organization's contact email
        # In the future, we might want to track which specific user initiated the generation
        org_result = await session.execute(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == project.organization_id)
            .where(OrganizationUser.role == "OWNER")
            .limit(1)
        )
        org_user = org_result.scalar_one_or_none()

        # Get organization details for contact info
        from packages.db.src.tables import Organization  # noqa: PLC0415

        org_result = await session.execute(select(Organization).where(Organization.id == project.organization_id))
        organization = org_result.scalar_one()

        return {
            "application": {
                "id": str(application.id),
                "title": application.title,
                "text": application.text,
                "created_at": application.created_at.isoformat(),
            },
            "user": {
                # Use organization contact email if available, otherwise use owner's firebase_uid as placeholder
                "email": organization.contact_email or (org_user.firebase_uid if org_user else "user@example.com"),
                "name": organization.contact_person_name or organization.name,
            },
            "project": {
                "id": str(project.id),
                "name": project.name,
            },
        }


def markdown_to_docx(markdown_text: str) -> bytes:
    """Convert markdown text to DOCX format."""
    # Convert markdown to HTML first
    markdown(markdown_text, extensions=["tables", "fenced_code", "nl2br"])

    # Create a new Document
    doc = Document()

    # Add title
    doc.add_heading("Grant Application", 0)

    # Parse markdown and add to document
    # This is a simplified version - you might want to use a more sophisticated parser
    lines = markdown_text.split("\n")
    current_paragraph = None

    for line in lines:
        stripped_line = line.strip()

        if stripped_line.startswith("# "):
            doc.add_heading(stripped_line[2:], level=1)
            current_paragraph = None
        elif stripped_line.startswith("## "):
            doc.add_heading(stripped_line[3:], level=2)
            current_paragraph = None
        elif stripped_line.startswith("### "):
            doc.add_heading(stripped_line[4:], level=3)
            current_paragraph = None
        elif stripped_line.startswith(("- ", "* ")):
            # Add bullet point
            doc.add_paragraph(stripped_line[2:], style="List Bullet")
            current_paragraph = None
        elif stripped_line.startswith("1. ") or (
            len(stripped_line) > 2 and stripped_line[0].isdigit() and stripped_line[1:3] == ". "
        ):
            # Add numbered list
            doc.add_paragraph(stripped_line[stripped_line.index(". ") + 2 :], style="List Number")
            current_paragraph = None
        elif stripped_line:
            # Regular paragraph
            if current_paragraph is None:
                current_paragraph = doc.add_paragraph(stripped_line)
            else:
                current_paragraph.add_run(" " + stripped_line)
        else:
            # Empty line - end current paragraph
            current_paragraph = None

    # Save to bytes buffer
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()


async def send_resend_email(
    to_email: str, subject: str, html: str, attachments: list[dict[str, Any]]
) -> dict[str, Any]:
    """Send email via Resend API."""
    resend_api_key = os.environ.get("RESEND_API_KEY")
    if not resend_api_key:
        raise ValueError("RESEND_API_KEY not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": "GrantFlow <notifications@grantflow.ai>",
                "to": [to_email],
                "subject": subject,
                "html": html,
                "attachments": attachments,
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            raise Exception(f"Resend API error: {response.status_code} - {response.text}")

        return response.json()  # type: ignore[no-any-return]


async def send_application_email(cloud_event: CloudEvent) -> dict[str, Any]:
    """Send email notification for generated application."""
    try:
        # Extract message data - handle both direct data and attributes
        event_data = cloud_event.data
        if event_data is None:
            # Check if data is in attributes (happens with some CloudEvent implementations)
            attributes = cloud_event.get_attributes()
            if "data" in attributes:
                event_data = attributes["data"]

        if isinstance(event_data, dict) and "message" in event_data:
            pubsub_message = event_data["message"]
            if "data" in pubsub_message:
                message_data = base64.b64decode(pubsub_message["data"]).decode("utf-8")
            else:
                return {"status": "error", "message": "No data in Pub/Sub message"}
        else:
            return {"status": "error", "message": "Invalid CloudEvent format"}

        # Parse the message
        notification_data = json.loads(message_data)
        application_id = notification_data.get("application_id")

        if not application_id:
            return {"status": "error", "message": "Missing application_id in message"}

        # Get application data from database
        app_data = await get_application_data(application_id)

        # Generate DOCX from markdown
        docx_content = markdown_to_docx(app_data["application"]["text"])

        # Create email HTML
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Grant Application is Ready!</h2>
            <p>Hi {app_data["user"]["name"] or "there"},</p>
            <p>Great news! Your grant application "<strong>{app_data["application"]["title"]}</strong>" has been successfully generated.</p>
            <p>We've attached your application in two formats:</p>
            <ul>
                <li><strong>Markdown (.md)</strong> - For easy editing and version control</li>
                <li><strong>Word Document (.docx)</strong> - For submission and final formatting</li>
            </ul>
            <p>You can also view and edit your application online in our editor.</p>
            <p style="margin-top: 30px;">
                <a href="https://grantflow.ai/projects/{app_data["project"]["id"]}/applications/{app_data["application"]["id"]}/editor"
                   style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Open in Editor
                </a>
            </p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Best of luck with your grant application!<br>
                The GrantFlow Team
            </p>
        </div>
        """

        # Prepare attachments
        attachments = [
            {
                "filename": f"{app_data['application']['title']}.md",
                "content": base64.b64encode(app_data["application"]["text"].encode()).decode(),
            },
            {
                "filename": f"{app_data['application']['title']}.docx",
                "content": base64.b64encode(docx_content).decode(),
            },
        ]

        # Send email
        subject = f"Your Grant Application is Ready - {app_data['application']['title']}"
        await send_resend_email(app_data["user"]["email"], subject, html_content, attachments)

        logger.info("Email sent successfully for application %s to %s", application_id, app_data["user"]["email"])

        return {"status": "success", "message": "Email sent successfully"}

    except Exception as e:
        logger.exception("Failed to send application email")
        return {"status": "error", "message": f"Failed to send email: {e!s}"}


@functions_framework.cloud_event
def main(cloud_event: CloudEvent) -> None:
    """Cloud Function entry point for email notifications."""
    result = asyncio.run(send_application_email(cloud_event))

    if result["status"] == "error":
        logger.error("Email notification error: %s", result["message"])
        # Raise exception to trigger retry
        raise Exception(result["message"])
    logger.info("Email notification sent: %s", result["message"])
