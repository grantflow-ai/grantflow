from typing import Any, Literal, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import post
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import DeserializationError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import PubSubEvent, decode_pubsub_message
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.utils.email import send_application_ready_email
from services.backend.src.utils.firebase import get_user

logger = get_logger(__name__)


class EmailNotificationRequest(TypedDict):
    application_id: UUID
    firebase_uid: str
    trace_id: NotRequired[str]


class EmailResponse(TypedDict):
    status: Literal["success"]
    message: str


def handle_pubsub_message(
    event: PubSubEvent,
) -> EmailNotificationRequest:
    logger.debug(
        "Decoding PubSub message", message_id=event.message.message_id, publish_time=event.message.publish_time
    )
    decoded_data = decode_pubsub_message(event=event)

    try:
        return deserialize(decoded_data, EmailNotificationRequest)
    except DeserializationError as e:
        raise ValidationError("Invalid email notification request", context={"data": decoded_data}) from e


@post(
    "/webhooks/pubsub/email-notifications",
    operation_id="HandleEmailNotificationWebhook",
    tags=["Webhooks"],
)
async def handle_email_notification_webhook(data: PubSubEvent, session_maker: async_sessionmaker[Any]) -> EmailResponse:
    request = handle_pubsub_message(event=data)

    async with session_maker() as session:
        application = await retrieve_application(application_id=request["application_id"], session=session)

    firebase_user = await get_user(request["firebase_uid"])
    if firebase_user is None:
        raise ValidationError("Firebase user does not exist", context={"firebase_uid": request["firebase_uid"]})

    await send_application_ready_email(
        application_title=application.title,
        application_text=application.text or "",
        project_id=str(application.project.id),
        application_id=str(application.id),
        user_email=cast("str", firebase_user["email"]),
        user_name=cast("str", firebase_user["display_name"]),
    )

    return EmailResponse(
        status="success",
        message="Email notification sent successfully",
    )
