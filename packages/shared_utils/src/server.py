from http import HTTPStatus
from typing import Any, NotRequired, TypedDict

from litestar import Response
from litestar.connection.request import Request
from litestar.di import Provide
from litestar.types import ExceptionHandler
from sqlalchemy.exc import SQLAlchemyError
from structlog.typing import FilteringBoundLogger

from packages.db.src.connection import get_session_maker
from packages.shared_utils.src.exceptions import DeserializationError


class APIError(TypedDict):
    message: str
    detail: NotRequired[str]


session_maker_provider = Provide(get_session_maker, sync_to_thread=False)


def create_exception_handler(logger: FilteringBoundLogger) -> ExceptionHandler[Any]:
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
