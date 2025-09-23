from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.ref import Ref

session_maker_ref = Ref[async_sessionmaker[Any]]()
engine_ref = Ref[AsyncEngine]()


def get_async_engine() -> AsyncEngine:
    if engine_ref.value is None:
        engine_ref.value = create_async_engine(
            get_env("DATABASE_CONNECTION_STRING"),
            echo=get_env("DEBUG", fallback="").lower() in ["true", "1"],
            pool_size=int(get_env("DB_POOL_SIZE", fallback="20")),
            max_overflow=int(get_env("DB_MAX_OVERFLOW", fallback="10")),
            pool_timeout=int(get_env("DB_POOL_TIMEOUT", fallback="60")),
            pool_recycle=int(get_env("DB_POOL_RECYCLE", fallback="3600")),
            pool_pre_ping=True,
        )
    return engine_ref.value


def get_session_maker() -> async_sessionmaker[Any]:
    if session_maker_ref.value is None:
        session_maker_ref.value = async_sessionmaker[Any](bind=get_async_engine(), expire_on_commit=False)
    return session_maker_ref.value
