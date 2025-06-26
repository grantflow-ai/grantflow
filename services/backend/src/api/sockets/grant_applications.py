import asyncio
from collections.abc import AsyncGenerator
from typing import Any
from uuid import UUID

from litestar import websocket_stream
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import WebsocketMessage, pull_notifications

logger = get_logger(__name__)

NOTIFICATION_POLL_INTERVAL = 3.0


@websocket_stream(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}/notifications",
    opt={
        "allowed_roles": [UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER]
    },
    type_encoders={UUID: str, SourceIndexingStatusEnum: lambda x: x.value},
)
async def handle_grant_application_notifications(
    application_id: UUID,
) -> AsyncGenerator[WebsocketMessage[dict[str, Any]]]:
    while True:
        logger.info("Polling for source updates")
        messages = await pull_notifications(
            logger=logger,
            parent_id=application_id,
        )
        logger.debug("Received messages", messages=messages)
        for message in messages:
            yield message

        await asyncio.sleep(NOTIFICATION_POLL_INTERVAL)
