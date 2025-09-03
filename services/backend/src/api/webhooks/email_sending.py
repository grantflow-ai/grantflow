from contextlib import suppress
from typing import Any, Literal, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import post
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import DeserializationError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import PubSubEvent, decode_pubsub_message
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.utils.email import (
    send_application_ready_email,
    send_grant_alert_email,
    send_subscription_verification_email,
)
from services.backend.src.utils.firebase import get_user

logger = get_logger(__name__)


class EmailNotificationRequest(TypedDict):
    application_id: UUID
    firebase_uid: str
    trace_id: NotRequired[str]


class SubscriptionVerificationRequest(TypedDict):
    email: str
    subscription_id: str
    verification_token: str
    search_params: NotRequired[dict[str, Any]]
    frequency: NotRequired[str]
    trace_id: NotRequired[str]


class GrantAlertTemplateData(TypedDict):
    grants: list[dict[str, Any]]
    frequency: str
    unsubscribe_url: str
    subscription_id: NotRequired[str]


class GrantAlertRequest(TypedDict):
    email: str
    template_data: GrantAlertTemplateData
    trace_id: NotRequired[str]


class EmailResponse(TypedDict):
    status: Literal["success"]
    message: str


def handle_pubsub_message(
    event: PubSubEvent,
) -> EmailNotificationRequest | SubscriptionVerificationRequest | GrantAlertRequest:
    logger.debug(
        "Decoding PubSub message", message_id=event.message.message_id, publish_time=event.message.publish_time
    )
    decoded_data = decode_pubsub_message(event=event)

    for request_type in [EmailNotificationRequest, SubscriptionVerificationRequest, GrantAlertRequest]:
        with suppress(DeserializationError):
            return deserialize(decoded_data, request_type)

    raise ValidationError("Unknown pubsub request", context={"data": decoded_data})


@post(
    "/webhooks/pubsub/email-notifications",
    operation_id="HandleEmailNotificationWebhook",
    tags=["Webhooks"],
)
async def handle_email_notification_webhook(data: PubSubEvent, session_maker: async_sessionmaker[Any]) -> EmailResponse:
    request = handle_pubsub_message(event=data)

    if "application_id" in request:
        email_notification_request = cast("EmailNotificationRequest", request)
        async with session_maker() as session:
            application = await retrieve_application(
                application_id=email_notification_request["application_id"], session=session
            )

        firebase_user = await get_user(email_notification_request["firebase_uid"])
        if firebase_user is None:
            raise ValidationError(
                "Firebase user does not exist", context={"firebase_uid": email_notification_request["firebase_uid"]}
            )

        await send_application_ready_email(
            application_title=application.title,
            application_text=application.text or "",
            project_id=str(application.project.id),
            application_id=str(application.id),
            user_email=cast("str", firebase_user["email"]),
            user_name=cast("str", firebase_user["display_name"]),
        )
    elif "subscription_id" in request:
        subscription_request = cast("SubscriptionVerificationRequest", request)
        await send_subscription_verification_email(
            email=request["email"],
            subscription_id=subscription_request["subscription_id"],
            verification_token=subscription_request["verification_token"],
            search_params=subscription_request.get("search_params"),
            frequency=subscription_request.get("frequency", "daily"),
        )
    else:
        template_data = request["template_data"]
        await send_grant_alert_email(
            email=request["email"],
            grants=template_data["grants"],
            frequency=template_data["frequency"],
            unsubscribe_url=template_data["unsubscribe_url"],
        )

    return EmailResponse(
        status="success",
        message="Email notification sent successfully",
    )
