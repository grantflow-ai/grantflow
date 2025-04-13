from typing import Any, TypedDict

from litestar import Request, WebSocket
from litestar.datastructures import State
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import UserRoleEnum


class APIRequestState(State):
    """State object for API requests containing the session maker."""

    session_maker: async_sessionmaker[Any]


APIRequest = Request[UserRoleEnum | None, str | None, APIRequestState]
"""Type for API requests with user role, auth token, and request state."""

APIWebsocket = WebSocket[UserRoleEnum | None, str | None, APIRequestState]
"""Type for API websockets with user role, auth token, and request state."""


class TableIdResponse(TypedDict):
    """A base response containing only a row ID."""

    id: str
    """The ID of the row."""
