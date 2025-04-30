import logging
import sys
from http import HTTPStatus
from typing import Any, NotRequired, TypedDict

from litestar import Litestar, Response
from litestar.config.cors import CORSConfig
from litestar.connection.request import Request
from litestar.di import Provide
from litestar.logging import StructLoggingConfig
from litestar.types import ExceptionHandler, LifespanHook
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from structlog.typing import FilteringBoundLogger

from packages.db.src.connection import get_session_maker
from packages.shared_utils.src.exceptions import BackendError, DeserializationError


class APIError(TypedDict):
    message: str
    detail: NotRequired[str]


session_maker_provider = Provide(get_session_maker, sync_to_thread=False)


def create_exception_handler(logger: FilteringBoundLogger) -> ExceptionHandler:  # type: ignore[type-arg]
    def handle_exception(_: Request[Any, Any, Any], exception: Exception) -> Response[Any]:
        if isinstance(exception, SQLAlchemyError):
            logger.error(
                "An unexpected sqlalchemy error occurred", exc_name=type(exception).__name__, exec_info=exception
            )
            message = "An unexpected database error occurred"
            status_code = HTTPStatus.INTERNAL_SERVER_ERROR
        elif isinstance(exception, DeserializationError):
            logger.error("Failed to deserialize the request body", exec_info=exception)
            message = "Failed to deserialize the request body"
            status_code = HTTPStatus.BAD_REQUEST
        else:
            logger.error("An unexpected backend error occurred.", exec_info=exception)
            message = "An unexpected backend error occurred"
            status_code = HTTPStatus.INTERNAL_SERVER_ERROR

        return Response(
            content=APIError(
                message=message,
                detail=str(exception),
            ),
            status_code=status_code,
        )

    return handle_exception


def create_session_maker_server_statup(logger: FilteringBoundLogger) -> LifespanHook:
    async def session_maker_server_statup(app_instance: Litestar) -> None:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

        session_maker = app_instance.state.session_maker = get_session_maker()
        try:
            async with session_maker() as session:
                await session.execute(text("SELECT 1"))

            logger.info("DB connection established.")
        except Exception as e:  # noqa: BLE001
            logger.error("Failed to connect to the database.", exc_info=e)
            sys.exit(1)

    return session_maker_server_statup


def create_litestar_app(logger: FilteringBoundLogger, add_session_maker: bool = True, **kwargs: Any) -> Litestar:
    exception_handler = create_exception_handler(logger)

    if add_session_maker:
        session_maker_startup_hook = create_session_maker_server_statup(logger)
        if "dependencies" in kwargs:
            kwargs["dependencies"]["session_maker"] = session_maker_provider
        else:
            kwargs["dependencies"] = {"session_maker": session_maker_provider}

        if "on_startup" in kwargs:
            kwargs["on_startup"].append(session_maker_startup_hook)
        else:
            kwargs["on_startup"] = [session_maker_startup_hook]

    return Litestar(
        cors_config=CORSConfig(
            allow_origins=["*"],
            allow_methods=["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
            allow_headers=["*"],
            max_age=86400,
        ),
        exception_handlers={SQLAlchemyError: exception_handler, BackendError: exception_handler},
        logging_config=StructLoggingConfig(log_exceptions="always"),
        **kwargs,
    )
