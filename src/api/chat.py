import logging
from asyncio import sleep
from typing import Literal, cast
from uuid import UUID

from sanic import Websocket
from sanic.exceptions import ServerError, WebsocketClosed
from sqlalchemy import exists, select

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
)
from src.db.tables import (
    ApplicationDraft,
    ApplicationFile,
    FileIndexingStatusEnum,
)
from src.utils.db import check_exists_files_being_indexed
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds


class _Sender:
    """A class to send messages to the frontend via websocket.

    Args:
        ws: The websocket object.
    """

    def __init__(self, ws: Websocket) -> None:
        self.ws = ws

    async def __call__(
        self,
        text: str,
        message_type: Literal["notification", "error", "finished"] = "notification",
    ) -> None:
        try:
            # note: decode is important, otherwise a binary frame will be sent
            await self.ws.send(
                serialize(
                    {
                        "type": message_type,
                        "text": text,
                    }
                ).decode()
            )
        except (ServerError, WebsocketClosed):
            logger.error("Websocket connection closed while sending message")


async def wait_for_file_processing_finish(request: APIRequest, application_id: UUID, sender: _Sender) -> None:
    """Wait for the file processing to finish.

    Args:
        request: The request object.
        application_id: The application ID.
        sender: The sender object.

    Returns:
        None
    """
    while await check_exists_files_being_indexed(
        session_maker=request.ctx.session_maker, application_id=application_id
    ):
        await sender(
            message_type="notification",
            text="Processing files...",
        )
        await sleep(PROCESSING_SLEEP_INTERVAL)


async def report_file_failures(request: APIRequest, application_id: UUID, sender: _Sender) -> None:
    """Report any files that failed to be indexed.

    Args:
        request: The request object.
        application_id: The application ID.
        sender: The sender object.

    Returns:
        None
    """
    async with request.ctx.session_maker() as session:
        failed_files = await session.scalars(
            select(ApplicationFile.name)
            .where(ApplicationFile.application_id == application_id)
            .where(ApplicationFile.status == FileIndexingStatusEnum.FAILED)
        )
        if failed_files:
            await sender(
                message_type="error",
                text=", ".join([f"File {filename} could not be indexed." for filename in failed_files]),
            )


async def poll_for_draft_generation_finish(request: APIRequest, application_draft_id: UUID) -> bool:
    """Poll the database to check if the application draft generation has finished.

    Args:
        request: The request object.
        application_draft_id: The application draft ID.

    Returns:
        Whether the application draft generation has finished.
    """
    async with request.ctx.session_maker() as session:
        return cast(
            bool,
            await session.scalar(
                select(
                    exists(
                        select(ApplicationDraft)
                        .where(ApplicationDraft.id == application_draft_id)
                        .where(ApplicationDraft.completed_at.isnot(None))
                    )
                )
            ),
        )


async def application_generation_ws(
    request: APIRequest, ws: Websocket, workspace_id: UUID, application_id: UUID, application_draft_id: UUID
) -> None:
    """Route handler for the application chat room websocket.

    Args:
        request: The request object.
        ws: The websocket object.
        workspace_id: The workspace ID.
        application_id: The application
        application_draft_id: The application draft ID.
    """
    logger.info("Web socket request with ID %s", application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    sender = _Sender(ws)

    await wait_for_file_processing_finish(request=request, application_id=application_id, sender=sender)
    await report_file_failures(request=request, application_id=application_id, sender=sender)
    while not await poll_for_draft_generation_finish(request=request, application_draft_id=application_draft_id):
        await sender(
            message_type="notification",
            text="Generating application draft...",
        )
        await sleep(PROCESSING_SLEEP_INTERVAL)
    await sender(
        message_type="finished",
        text="Application draft generation complete.",
    )
