import logging
from asyncio import sleep
from typing import Literal, TypedDict
from uuid import UUID

from sanic import Websocket
from sqlalchemy import exists, select

from src.api.api_types import APIRequest, ApplicationDraftGenerationResponse
from src.api.utils import create_application_draft, verify_workspace_access
from src.db.tables import ApplicationFile, FileIndexingStatusEnum
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)

PROCESSING_SLEEP_INTERVAL = 3


class ChatNotification(TypedDict):
    """Application chat room message type."""

    type: Literal["notification"]
    """The message type."""
    text: str
    """The message text."""


class ChatErrorNotification(TypedDict):
    """Application chat room message type."""

    type: Literal["error"]
    """The message type."""
    text: str
    """The message text."""


class ChatGenerationResultMessage(TypedDict):
    """Application chat room message type."""

    type: Literal["content"]
    """The message type."""
    data: ApplicationDraftGenerationResponse
    """The message text."""


async def application_ws_handler(request: APIRequest, ws: Websocket, workspace_id: UUID, application_id: UUID) -> None:
    """Route handler for the application chat room websocket.

    Args:
        request: The request object.
        ws: The websocket object.
        workspace_id: The workspace ID.
        application_id: The application
    """
    logger.info("Web socket request with ID %s", application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    try:
        async with request.ctx.session_maker() as session:
            is_processing_files = True
            while is_processing_files:
                if is_processing_files := await session.scalar(
                    select(
                        exists(
                            select(ApplicationFile)
                            .where(ApplicationFile.application_id == application_id)
                            .where(ApplicationFile.status == FileIndexingStatusEnum.INDEXING)
                        )
                    )
                ):
                    await ws.send(
                        serialize(
                            ChatNotification(
                                type="notification",
                                text="Indexing files...",
                            )
                        )
                    )
                    await sleep(PROCESSING_SLEEP_INTERVAL)

        await ws.send(
            serialize(
                ChatNotification(
                    type="notification",
                    text="Generating Text...",
                )
            )
        )

        result = await create_application_draft(request=request, application_id=application_id)
        await ws.send(
            serialize(
                ChatGenerationResultMessage(
                    type="content",
                    data=result,
                )
            )
        )

    except Exception as e:  # noqa: BLE001
        logger.error(
            "An error occurred while processing grant application with ID %s application: %s", application_id, e
        )
        await ws.send(
            serialize(
                ChatErrorNotification(
                    type="error",
                    text="An error occurred while processing the application.",
                )
            )
        )

    async for msg in ws:
        logger.info("Received message: %s", msg)
