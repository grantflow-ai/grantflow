import logging
import sys
from http import HTTPStatus
from typing import Any, NotRequired, TypedDict

from litestar import Litestar, Response, get
from litestar.config.cors import CORSConfig
from litestar.connection.request import Request
from litestar.di import Provide
from litestar.logging import StructLoggingConfig
from litestar.types import ExceptionHandler, LifespanHook
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from structlog.typing import EventDict, FilteringBoundLogger

from packages.db.src.connection import get_session_maker
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import (
    BackendError,
    DeserializationError,
    ValidationError,
)


class APIError(TypedDict):
    message: str
    detail: NotRequired[str]


session_maker_provider = Provide(get_session_maker, sync_to_thread=False)


def exception_serializer_processor(_: Any, __: str, event_dict: EventDict) -> EventDict:
    if event_dict.get("exc_info"):
        exc_info = event_dict["exc_info"]
        if isinstance(exc_info, tuple) and len(exc_info) >= 2:
            exc_type, exc_value, _ = exc_info
            if isinstance(exc_value, (BackendError, SQLAlchemyError)):
                event_dict["exc_info"] = {
                    "type": exc_type.__name__,
                    "message": str(exc_value),
                }
        elif isinstance(exc_info, (BackendError, SQLAlchemyError)):
            event_dict["exc_info"] = {
                "type": type(exc_info).__name__,
                "message": str(exc_info),
            }

    for key, value in event_dict.items():
        if key != "exc_info" and isinstance(value, (BackendError, SQLAlchemyError)):
            event_dict[key] = {"type": type(value).__name__, "message": str(value)}

    return event_dict


def create_exception_handler(logger: FilteringBoundLogger) -> ExceptionHandler:  # type: ignore[type-arg]
    def handle_exception(
        _: Request[Any, Any, Any], exception: Exception
    ) -> Response[Any]:
        if isinstance(exception, IntegrityError):
            if "duplicate key value violates unique constraint" in str(exception):
                logger.info(
                    "Duplicate job creation attempt - returning success for idempotency",
                    exc_name=type(exception).__name__,
                    constraint_error=str(exception),
                )
                message = "Job already exists or was created successfully"
                status_code = HTTPStatus.OK
            else:
                logger.error(
                    "Database integrity constraint violation",
                    exc_name=type(exception).__name__,
                    exec_info=exception,
                )
                message = "Database constraint violation"
                status_code = HTTPStatus.CONFLICT
        elif isinstance(exception, SQLAlchemyError):
            logger.error(
                "An unexpected sqlalchemy error occurred",
                exc_name=type(exception).__name__,
                exec_info=exception,
            )
            message = "An unexpected database error occurred"
            status_code = HTTPStatus.INTERNAL_SERVER_ERROR
        elif isinstance(exception, DeserializationError):
            logger.error("Failed to deserialize the request body", exec_info=exception)
            message = "Failed to deserialize the request body"
            status_code = HTTPStatus.BAD_REQUEST
        elif isinstance(exception, ValidationError):
            logger.error("Validation error", exec_info=exception)
            message = "Invalid pubsub message"
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


def create_session_maker_server_startup(logger: FilteringBoundLogger) -> LifespanHook:
    async def session_maker_server_startup(app_instance: Litestar) -> None:
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

    return session_maker_server_startup


async def _health_check() -> str:
    return "OK"


def create_litestar_app(
    logger: FilteringBoundLogger, add_session_maker: bool = True, **kwargs: Any
) -> Litestar:
    exception_handler = create_exception_handler(logger)

    health_check = get("/health", media_type="text/plain", operation_id="HealthCheck")(
        _health_check
    )
    if "route_handlers" in kwargs:
        kwargs["route_handlers"].append(health_check)
    else:
        kwargs["route_handlers"] = [health_check]

    if add_session_maker:
        session_maker_startup_hook = create_session_maker_server_startup(logger)
        if "dependencies" in kwargs:
            kwargs["dependencies"]["session_maker"] = session_maker_provider
        else:
            kwargs["dependencies"] = {"session_maker": session_maker_provider}

        if "on_startup" in kwargs:
            kwargs["on_startup"].append(session_maker_startup_hook)
        else:
            kwargs["on_startup"] = [session_maker_startup_hook]

    default_config = StructLoggingConfig()
    default_processors = default_config.processors if default_config.processors else []
    logging_config = StructLoggingConfig(
        log_exceptions="always",
        processors=[exception_serializer_processor, *default_processors],
    )

    return Litestar(
        cors_config=CORSConfig(
            allow_origins=["*"],
            allow_methods=["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
            allow_headers=["*"],
            max_age=86400,
        ),
        debug=get_env("DEBUG", fallback="", raise_on_missing=False) == "true",
        exception_handlers={
            IntegrityError: exception_handler,
            SQLAlchemyError: exception_handler,
            BackendError: exception_handler,
            ValidationError: exception_handler,
        },
        logging_config=logging_config,
        **kwargs,
    )
