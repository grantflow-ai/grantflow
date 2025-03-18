import sys
from http import HTTPStatus
from typing import Any

from litestar import Litestar
from litestar.exceptions import HTTPException
from litestar.response import Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.api_types import APIRequest
from src.db.connection import get_session_maker
from src.dto import APIError
from src.exceptions import BackendError, DeserializationError
from src.utils.ai import init_llm_connection
from src.utils.firebase import get_firebase_app
from src.utils.logger import get_logger

logger = get_logger(__name__)


def handle_exception(_: APIRequest, exception: Exception) -> Response[Any]:
    if isinstance(exception, DeserializationError):
        logger.error("Failed to deserialize the request body", exec_info=exception)
        message = "Failed to deserialize the request body"
        status_code: int = HTTPStatus.BAD_REQUEST
    elif isinstance(exception, BackendError):
        logger.error("An unexpected backend error occurred.", exec_info=exception)
        message = "An unexpected backend error occurred"
        status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    elif isinstance(exception, HTTPException):
        message = str(exception)
        status_code = exception.status_code
    elif isinstance(exception, SQLAlchemyError):
        logger.error("An unexpected sqlalchemy error occurred", exc_name=type(exception).__name__, exec_info=exception)
        message = "An unexpected database error occurred"
        status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    else:
        logger.error("An unexpected error occurred", exc_name=type(exception).__name__, exec_info=exception)
        message = "An unexpected error occurred"
        status_code = HTTPStatus.INTERNAL_SERVER_ERROR

    return Response(
        content=APIError(
            message=message,
            details=str(exception),
        ),
        status_code=status_code,
    )


async def before_server_start(app: Litestar) -> None:
    """Hook to run before the server starts."""
    get_firebase_app()
    init_llm_connection()

    session_maker = app.state.session_maker = get_session_maker()
    try:
        async with session_maker() as session:
            await session.execute(text("SELECT 1"))

        logger.info("DB connection established.")
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to connect to the database.", exc_info=e)
        sys.exit(1)
