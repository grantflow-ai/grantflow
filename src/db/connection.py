from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine  # type: ignore[attr-defined]

from src.utils.env import get_env
from src.utils.ref import Ref

session_maker_ref = Ref[async_sessionmaker[Any]]()
engine_ref = Ref[AsyncEngine]()


def get_async_engine() -> AsyncEngine:
    """Get an async engine for the database.

    Returns:
        An async engine.
    """
    if engine_ref.value is None:
        engine_ref.value = create_async_engine(get_env("DATABASE_CONNECTION_STRING"), echo=True, pool_size=25)
    return engine_ref.value


def get_session_maker() -> async_sessionmaker[Any]:
    """Get a session maker for the database.

    Returns:
        An async session maker.
    """
    if session_maker_ref.value is None:
        session_maker_ref.value = async_sessionmaker[Any](bind=get_async_engine(), expire_on_commit=False)
    return session_maker_ref.value
