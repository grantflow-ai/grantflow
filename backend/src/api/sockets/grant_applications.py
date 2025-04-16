from typing import Any
from uuid import UUID

from litestar import websocket
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.common_types import APIWebsocket
from src.db.enums import UserRoleEnum
from src.db.tables import GrantApplication
from src.dto import WebsocketMessage
from src.exceptions import DatabaseError
from src.files import FileDTO
from src.utils.env import get_env
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def get_cfp_content(cfp_file_upload: UploadFile | None, cfp_url: str | None) -> str:
    from src.utils.extraction import extract_file_content, extract_webpage_content

    if cfp_file_upload:
        file = await FileDTO.from_file(filename=cfp_file_upload.filename, file=cfp_file_upload)
        output, _ = await extract_file_content(
            content=file.content,
            mime_type=file.mime_type,
        )
        return output if isinstance(output, str) else output["content"]
    if cfp_url:
        return await extract_webpage_content(url=cfp_url)
    raise ValidationException("Either one file or a CFP URL is required")


class MessageHandler:
    """We pass this wrapper to dependent code, encapsulating the socket and the send_json method."""

    __slots__ = ("_debug", "_socket")

    def __init__(self, socket: APIWebsocket) -> None:
        self._socket = socket
        self._debug = get_env("DEBUG", raise_on_missing=False)

    async def send_message(self, message: WebsocketMessage) -> None:
        if message.type == "debug" and not self._debug:
            return

        await self._socket.send_json(message)


@websocket(
    [
        "/workspaces/{workspace_id:uuid}/applications/new",  # for creating a new application ~keep
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",  # for interacting with an existing application ~keep
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GrantApplicationWebsocket",
)
async def handle_application_websocket(
    session_maker: async_sessionmaker[Any],
    socket: APIWebsocket,
    workspace_id: UUID,
    application_id: UUID | None = None,
) -> None:
    await socket.accept()
    try:
        handler = MessageHandler(socket)

        if not application_id:
            async with session_maker() as session, session.begin():
                try:
                    application_id = await session.scalar(
                        insert(GrantApplication)
                        .values({"workspace_id": workspace_id, "title": ""})
                        .returning(GrantApplication.id)
                    )
                    await session.commit()
                except SQLAlchemyError as e:
                    await session.rollback()
                    logger.error("Error creating application", exc_info=e)
                    await handler.send_message(
                        WebsocketMessage(
                            type="error",
                            event="application_creation_failed",
                            content="Database error",
                        )
                    )

                    raise DatabaseError("Error creating application", context=str(e)) from e

            await handler.send_message(
                WebsocketMessage(
                    type="data",
                    event="application_creation_success",
                    content={"application_id": str(application_id)},
                ),
            )
    finally:
        await socket.close()
