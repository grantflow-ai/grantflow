from typing import Any, Generic, Literal, TypedDict, TypeVar
from uuid import UUID

from litestar import websocket
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.api_types import APIWebsocket
from src.db.enums import UserRoleEnum
from src.db.tables import GrantApplication
from src.exceptions import DatabaseError
from src.files import FileDTO
from src.utils.logger import get_logger

M = str
T = TypeVar("T")

logger = get_logger(__name__)


class ErrorMessage(TypedDict, Generic[T]):
    """A message sent over a WebSocket connection."""

    type: Literal["error"]
    """The type of the message."""
    content: str
    """The content of the message."""
    context: dict[str, Any] | None
    """A dictionary containing additional information about the error."""


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


async def notify_error(socket: APIWebsocket, message: str, context: dict[str, Any] | None = None) -> None:
    await socket.send_json(ErrorMessage(type="error", content=message, context=context))


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

    if not application_id:
        # TODO: create a new application

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
                await notify_error(socket, "Error creating application")

                raise DatabaseError("Error creating application", context=str(e)) from e

    await socket.send_json({"type": "connected", "application_id": str(application_id)})
