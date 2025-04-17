from collections.abc import Callable, Coroutine
from typing import TYPE_CHECKING, Any, TypedDict

from litestar import Request, WebSocket
from litestar.datastructures import State
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import UserRoleEnum

if TYPE_CHECKING:
    from src.dto import WebsocketMessage


class APIRequestState(State):
    session_maker: async_sessionmaker[Any]


APIRequest = Request[UserRoleEnum | None, str | None, APIRequestState]


APIWebsocket = WebSocket[UserRoleEnum | None, str | None, APIRequestState]


class TableIdResponse(TypedDict):
    id: str


MessageHandler = Callable[["WebsocketMessage"], Coroutine[None, None, None]]
