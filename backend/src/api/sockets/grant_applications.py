from typing import Any, cast
from uuid import UUID

from litestar import websocket
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.common_types import APIWebsocket, WebsocketMessage
from src.db.enums import UserRoleEnum
from src.db.tables import GrantApplication
from src.dto import WebsocketDataMessage, WebsocketErrorMessage
from src.exceptions import BackendError, DatabaseError
from src.files import FileDTO
from src.utils.env import get_env
from src.utils.logger import get_logger
from src.utils.serialization import deserialize

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
        await self._socket.send_json(message)


async def handle_create_application(workspace_id: UUID, session_maker: async_sessionmaker[Any]) -> UUID:
    async with session_maker() as session, session.begin():
        try:
            application_id = await session.scalar(
                insert(GrantApplication)
                .values({"workspace_id": workspace_id, "title": ""})
                .returning(GrantApplication.id)
            )
            await session.commit()
            return cast("UUID", application_id)

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application", exc_info=e)
            raise DatabaseError("Error creating application", context=str(e)) from e


async def handle_user_data_message[T](
    *,
    application_id: UUID,
    event_type: str,
    data: dict[str, Any],
    handler: MessageHandler,
) -> None:
    match event_type:
        case "update_application":
            await handler.send_message(
                WebsocketDataMessage(
                    type="data",
                    event="application_update_success",
                    content=data,
                ),
            )


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
    handler = MessageHandler(socket)

    try:
        if not application_id:
            application_id = await handle_create_application(workspace_id=workspace_id, session_maker=session_maker)
            await handler.send_message(
                WebsocketDataMessage(
                    type="data",
                    event="application_creation_success",
                    content={"application_id": str(application_id)},
                ),
            )

        while data := await socket.receive_data(mode="text"):
            message = deserialize(data, WebsocketDataMessage)
            if message.type == "data":
                await handle_user_data_message(
                    event_type=message.event,
                    data=message.content,
                    handler=handler,
                    application_id=application_id,
                )
    except BackendError as e:
        logger.error("Backend error in grant application websocket", error=e)
        await handler.send_message(
            WebsocketErrorMessage(
                type="error",
                event="pipeline_error",
                content=f"Error in grant application websocket: {e!s}",
                context={"error_type": e.__class__.__name__, **e.context},
            )
        )

    finally:
        await socket.close()
        logger.info("Grant application websocket closed", application_id=application_id)
