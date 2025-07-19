import asyncio
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
    while True:
        logger.info("Polling for source updates", organization_id=str(organization_id), project_id=str(project_id), application_id=str(application_id))
        try:
            messages = await pull_notifications(
                logger=logger,
                parent_id=application_id,
            )
            logger.debug("Received messages", messages=messages)
            for message in messages:
                yield message
        except gcp_exceptions.DeadlineExceeded:
            logger.warning(
                "Pub/Sub pull timed out, continuing polling",
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
                exc_info=e,
            )

        await asyncio.sleep(NOTIFICATION_POLL_INTERVAL)
