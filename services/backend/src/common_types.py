from collections.abc import Callable, Coroutine
from typing import Any, TypedDict

from litestar import Request, WebSocket
from litestar.datastructures import State
from sqlalchemy.ext.asyncio import async_sessionmaker

from db.src.enums import UserRoleEnum
from src.dto import WebsocketDataMessage, WebsocketErrorMessage, WebsocketInfoMessage


class APIRequestState(State):
    session_maker: async_sessionmaker[Any]


APIRequest = Request[UserRoleEnum | None, str | None, APIRequestState]


APIWebsocket = WebSocket[UserRoleEnum | None, str | None, APIRequestState]


class TableIdResponse(TypedDict):
    id: str


WebsocketMessage = WebsocketInfoMessage | WebsocketErrorMessage | WebsocketDataMessage
MessageHandler = Callable[[WebsocketMessage], Coroutine[None, None, None]]
