import logging
import sys
from http import HTTPStatus
from typing import Any

from sanic import HTTPResponse, Sanic, json
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.api_types import APIRequest, RequestContext
from src.db.connection import get_session_maker
from src.dto import APIError
from src.exceptions import BackendError, DeserializationError
from src.utils.ai import init_llm_connection
from src.utils.firebase import get_firebase_app

logger = logging.getLogger(__name__)


def handle_exception(request: APIRequest, exception: Exception) -> HTTPResponse:
    """Handle a exception.

    Args:
        request: The request object.
        exception: The exception.

    Returns:
        The HTTP response.
    """
    if isinstance(exception, DeserializationError):
        logger.error("Failed to deserialize the request body: %s, error: %s", request.body, exception)
        message = "Failed to deserialize the request body"
        status = HTTPStatus.BAD_REQUEST
    elif isinstance(exception, BackendError):
        logger.error("An unexpected backend error occurred: %s", exception)
        message = "An unexpected backend error occurred"
        status = HTTPStatus.INTERNAL_SERVER_ERROR
    elif isinstance(exception, SQLAlchemyError):
        logger.error("An unexpected sqlalchemy error occurred: %s, %s", type(exception).__name__, exception)
        message = "An unexpected database error occurred"
        status = HTTPStatus.INTERNAL_SERVER_ERROR
    else:
        logger.error("An unexpected error occurred: %s, %s", type(exception).__name__, exception)
        message = "An unexpected error occurred"
        status = HTTPStatus.INTERNAL_SERVER_ERROR

    return json(
        APIError(
            message=message,
            details=str(exception),
        ),
        status=status,
    )


async def before_server_start_hook(_: Sanic[Any, RequestContext]) -> None:
    """Hook to run before the server starts."""
    get_firebase_app()
    init_llm_connection()

    session_maker = get_session_maker()
    try:
        async with session_maker() as session:
            await session.execute(text("SELECT 1"))

        logger.info("DB connection established.")
    except Exception as e:  # noqa: BLE001
        logging.error("Failed to connect to the database: %s.", e)
        sys.exit(1)
