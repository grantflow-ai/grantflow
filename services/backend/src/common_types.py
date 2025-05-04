from collections.abc import Callable, Coroutine
from typing import Any, TypedDict

from litestar import Request, WebSocket
from litestar.datastructures import State
from packages.db.src.enums import FileIndexingStatusEnum, UserRoleEnum
from services.backend.src.dto import WebsocketDataMessage, WebsocketErrorMessage, WebsocketInfoMessage
from sqlalchemy.ext.asyncio import async_sessionmaker


class TableIdResponse(TypedDict):
    id: str


class UploadedFileResponse(TypedDict):
    file_id: str
    filename: str
    size: int
    mime_type: str
    created_at: str
    indexing_status: FileIndexingStatusEnum


class APIRequestState(State):
    session_maker: async_sessionmaker[Any]


APIRequest = Request[UserRoleEnum | None, str | None, APIRequestState]
APIWebsocket = WebSocket[UserRoleEnum | None, str | None, APIRequestState]
WebsocketMessage = WebsocketInfoMessage | WebsocketErrorMessage | WebsocketDataMessage
MessageHandler = Callable[[WebsocketMessage], Coroutine[None, None, None]]
