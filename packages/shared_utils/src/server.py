from typing import NotRequired, TypedDict

from litestar.di import Provide

from packages.db.src.connection import get_session_maker


class APIError(TypedDict):
    message: str
    detail: NotRequired[str]


session_maker_provider = Provide(get_session_maker, sync_to_thread=False)
