import asyncio
from typing import Any, Literal, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import post
from packages.db.src.tables import GrantApplication, OrganizationUser, ProjectAccess
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import PubSubEvent
from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.backend.src.utils.email import send_application_ready_email
from services.backend.src.utils.firebase import get_user

logger = get_logger(__name__)


class EmailNotificationRequest(TypedDict):
    application_id: UUID
    trace_id: NotRequired[str]


class EmailResponse(TypedDict):
    status: Literal["success"]
    message: str


def handle_pubsub_message(
    event: PubSubEvent,
) -> EmailNotificationRequest:
    logger.debug(
        "Processing PubSub message", message_id=event.message.message_id, publish_time=event.message.publish_time
    )

    # Get data from attributes instead of message body to avoid corruption issues
    attributes = event.message.attributes or {}

    application_id_str = attributes.get("application_id")
    if not application_id_str:
        raise ValidationError("Missing required attribute: application_id")

    try:
        application_id = UUID(application_id_str)
    except ValueError as e:
        raise ValidationError(f"Invalid application_id format: {application_id_str}") from e

    request = EmailNotificationRequest(application_id=application_id)

    # Add trace_id if present
    if trace_id := attributes.get("trace_id"):
        request["trace_id"] = trace_id

    return request


async def get_project_users(session_maker: async_sessionmaker[Any], application_id: UUID) -> list[OrganizationUser]:
    async with session_maker() as session:
        application = await session.get(
            GrantApplication, application_id, options=[selectinload(GrantApplication.project)]
        )

        if not application or application.deleted_at is not None:
            raise ValidationError("Application not found.", context=str(application_id))

        project_users = await session.scalars(
            select(OrganizationUser)
            .where(
                OrganizationUser.organization_id == application.project.organization_id,
                OrganizationUser.deleted_at.is_(None),
            )
            .where(
                or_(
                    OrganizationUser.has_all_projects_access,
                    exists(
                        select(ProjectAccess).where(
                            ProjectAccess.firebase_uid == OrganizationUser.firebase_uid,
                            ProjectAccess.project_id == application.project.id,
                        )
                    ),
                )
            )
        )

        return list(project_users)


async def send_email_to_user(
    user: OrganizationUser, application_title: str, application_text: str, project_id: str, application_id: str
) -> bool:
    try:
        firebase_user = await get_user(user.firebase_uid)
        if not firebase_user or not firebase_user.get("email"):
            logger.warning("Firebase user not found or no email", firebase_uid=user.firebase_uid)
            return False

        await send_application_ready_email(
            application_title=application_title,
            application_text=application_text,
            project_id=project_id,
            application_id=application_id,
            user_email=cast("str", firebase_user["email"]),
            user_name=cast("str", firebase_user.get("display_name", "User")),
        )

        logger.info("Email sent to user", firebase_uid=user.firebase_uid, application_id=application_id)
        return True

    except Exception as e:
        logger.error("Failed to send email to user", firebase_uid=user.firebase_uid, error=str(e))
        return False


@post(
    "/webhooks/pubsub/email-notifications",
    operation_id="HandleEmailNotificationWebhook",
    tags=["Webhooks"],
)
async def handle_email_notification_webhook(data: PubSubEvent, session_maker: async_sessionmaker[Any]) -> EmailResponse:
    request = handle_pubsub_message(event=data)
    application_id = request["application_id"]

    async with session_maker() as session:
        application = await session.get(
            GrantApplication, application_id, options=[selectinload(GrantApplication.project)]
        )
        if not application or application.deleted_at is not None:
            raise ValidationError("Application not found.", context=str(application_id))

    project_id = str(application.project.id)
    application_title = application.title
    application_text = application.text or ""

    users_list = await get_project_users(session_maker, application_id)

    if not users_list:
        logger.warning("No users found for application", application_id=str(application_id), project_id=project_id)
        return EmailResponse(
            status="success",
            message="No users to notify",
        )

    email_tasks = [
        send_email_to_user(
            user=user,
            application_title=application_title,
            application_text=application_text,
            project_id=project_id,
            application_id=str(application_id),
        )
        for user in users_list
    ]

    results = await asyncio.gather(*email_tasks, return_exceptions=True)
    emails_sent = sum(1 for result in results if result is True)

    logger.info(
        "Email notification batch completed",
        application_id=str(application_id),
        total_users=len(users_list),
        emails_sent=emails_sent,
    )

    return EmailResponse(
        status="success",
        message=f"Email notifications sent to {emails_sent}/{len(users_list)} users",
    )
