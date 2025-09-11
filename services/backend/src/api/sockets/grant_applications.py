import asyncio
import time
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from google.api_core import exceptions as gcp_exceptions
from litestar import websocket_stream
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import WebsocketMessage, pull_notifications

logger = get_logger(__name__)

NOTIFICATION_POLL_INTERVAL = 3.0


@websocket_stream(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/notifications",
    opt={"allowed_roles": [UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR]},
    type_encoders={UUID: str, SourceIndexingStatusEnum: lambda x: x.value},
)
async def handle_grant_application_notifications(
    organization_id: UUID,
    project_id: UUID,
    application_id: UUID,
) -> AsyncGenerator[WebsocketMessage[dict[str, Any]]]:
    logger.info(
        "WebSocket connection established for notifications",
        organization_id=str(organization_id),
        project_id=str(project_id),
        application_id=str(application_id),
    )

    while True:
        poll_start = time.time()
        logger.debug(
            "Polling for source updates",
            organization_id=str(organization_id),
            project_id=str(project_id),
            application_id=str(application_id),
        )
        try:
            messages = await pull_notifications(
                parent_id=application_id,
            )
            poll_duration = time.time() - poll_start

            if messages:
                logger.info(
                    "Received messages from Pub/Sub",
                    num_messages=len(messages),
                    application_id=str(application_id),
                    poll_duration_ms=round(poll_duration * 1000, 2),
                )
                for message in messages:
                    logger.debug(
                        "Sending message to WebSocket client",
                        notification_event=message.get("event"),
                        application_id=str(application_id),
                    )
                    yield message
            else:
                logger.debug(
                    "No messages received in this poll",
                    application_id=str(application_id),
                    poll_duration_ms=round(poll_duration * 1000, 2),
                )
        except gcp_exceptions.DeadlineExceeded:
            logger.debug(
                "Pub/Sub pull timed out (expected behavior), continuing polling",
                organization_id=str(organization_id),
                project_id=str(project_id),
                application_id=str(application_id),
            )
        except Exception as e:
            logger.error(
                "Error pulling notifications, continuing polling",
                organization_id=str(organization_id),
                project_id=str(project_id),
                application_id=str(application_id),
                error=str(e),
                error_type=type(e).__name__,
                exc_info=e,
            )

        await asyncio.sleep(NOTIFICATION_POLL_INTERVAL)
