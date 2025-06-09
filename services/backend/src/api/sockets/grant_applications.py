import asyncio
from collections.abc import AsyncGenerator
from uuid import UUID

from litestar import websocket_stream
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import SourceProcessingResult, pull_source_processing_notifications

logger = get_logger(__name__)

NOTIFICATION_POLL_INTERVAL = 3.0


@websocket_stream(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/notifications",
    opt={"allowed_roles": [UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER]},
    type_encoders={UUID: str, SourceIndexingStatusEnum: lambda x: x.value},
)
async def handle_grant_application_notifications(
    application_id: UUID,
) -> AsyncGenerator[SourceProcessingResult]:
    while True:
        logger.info("Polling for source updates")
        source_updates = await pull_source_processing_notifications(
            logger=logger,
            parent_id=application_id,
        )
        logger.debug("Received source updates", source_updates=source_updates)
        for source_update in source_updates:
            yield source_update

        await asyncio.sleep(NOTIFICATION_POLL_INTERVAL)
