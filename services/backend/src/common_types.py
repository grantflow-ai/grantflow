from typing import Any, TypedDict

from litestar import Request, WebSocket
from litestar.datastructures import State
from packages.db.src.enums import UserRoleEnum
from sqlalchemy.ext.asyncio import async_sessionmaker


class TableIdResponse(TypedDict):
    id: str


class APIRequestState(State):
    session_maker: async_sessionmaker[Any]
    trace_id: str | None = None


APIRequest = Request[UserRoleEnum | None, str | None, APIRequestState]
APIWebsocket = WebSocket[UserRoleEnum | None, str | None, APIRequestState]