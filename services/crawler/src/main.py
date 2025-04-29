import logging
import sys
from typing import Any, Literal, TypedDict

from litestar import Litestar, post
from litestar.config.cors import CORSConfig
from litestar.logging import StructLoggingConfig
from packages.db.src.connection import get_session_maker
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_exception_handler, session_maker_provider
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

exception_handler = create_exception_handler(logger)


async def before_server_start(app_instance: Litestar) -> None:
    session_maker = app_instance.state.session_maker = get_session_maker()
    try:
        async with session_maker() as session:
            await session.execute(text("SELECT 1"))

        logger.info("DB connection established.")
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to connect to the database.", exc_info=e)
        sys.exit(1)


class CrawlingRequest(TypedDict):
    url: str


class CrawlingResponse(TypedDict):
    status: Literal["success", "error"]
    results: list[dict[str, str]]


@post("/{workspace_id:uuid}/{application_id:uuid}/crawl")
async def handle_url_crawling(
    data: CrawlingRequest,
    session_maker: async_sessionmaker[Any],
) -> CrawlingResponse:
    pass


app = Litestar(
    route_handlers=[
        handle_url_crawling,
    ],
    cors_config=CORSConfig(
        allow_origins=["*"],
        allow_methods=["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
        max_age=86400,
    ),
    on_startup=[before_server_start],
    exception_handlers={SQLAlchemyError: exception_handler, BackendError: exception_handler},
    dependencies={"session_maker": session_maker_provider},
    logging_config=StructLoggingConfig(log_exceptions="always"),
)
