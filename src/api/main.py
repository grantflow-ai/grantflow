import logging
import sys
from http import HTTPStatus
from typing import Any

import uvicorn
from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.di import Provide
from litestar.events import listener
from litestar.exceptions import HTTPException
from litestar.handlers import HTTPRouteHandler
from litestar.logging import StructLoggingConfig
from litestar.response import Response
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.api.api_types import APIRequest
from src.api.middleware import AuthMiddleware
from src.api.routes.application_files import (
    handle_application_file_uploads,
    handle_delete_application_file,
    retrieve_application_files,
)
from src.api.routes.auth import handle_create_otp, handle_login
from src.api.routes.funding_organizations import (
    handle_create_organization,
    handle_delete_organization,
    handle_retrieve_organizations,
    handle_update_organization,
)
from src.api.routes.grant_applications import (
    handle_create_application,
    handle_delete_application,
    handle_retrieve_application,
    handle_retrieve_application_text,
    handle_update_application,
)
from src.api.routes.health import health_check
from src.api.routes.organization_files import (
    handle_delete_organization_file,
    handle_organization_file_uploads,
    retrieve_organization_files,
)
from src.api.routes.workspaces import (
    handle_create_workspace,
    handle_delete_workspace,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_workspace,
)
from src.db.connection import get_session_maker
from src.dto import APIError
from src.exceptions import BackendError, DeserializationError
from src.indexer.files import parse_and_index_file
from src.rag.grant_template.determine_longform_metadata import handle_generate_grant_template
from src.utils.ai import init_llm_connection
from src.utils.firebase import get_firebase_app
from src.utils.logger import get_logger

logger = get_logger(__name__)

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

api_routes: list[HTTPRouteHandler] = [
    handle_application_file_uploads,
    handle_create_application,
    handle_create_organization,
    handle_create_otp,
    handle_create_workspace,
    handle_delete_application,
    handle_delete_application_file,
    handle_delete_organization,
    handle_delete_organization_file,
    handle_delete_workspace,
    handle_login,
    handle_organization_file_uploads,
    handle_retrieve_application,
    handle_retrieve_application_text,
    handle_retrieve_organizations,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_application,
    handle_update_organization,
    handle_update_workspace,
    health_check,
    retrieve_application_files,
    retrieve_organization_files,
]

session_maker_provider = Provide(get_session_maker, sync_to_thread=True)
parse_and_index_file_listener = listener("parse_and_index_file")(parse_and_index_file)
handle_generate_grant_template_listener = listener("handle_generate_grant_template")(handle_generate_grant_template)


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


app = Litestar(
    route_handlers=api_routes,
    cors_config=CORSConfig(
        allow_origins=["*"],
        allow_methods=["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
        max_age=86400,
    ),
    on_startup=[before_server_start],
    middleware=[AuthMiddleware],
    exception_handlers={Exception: handle_exception},
    dependencies={"session_maker": session_maker_provider},
    logging_config=StructLoggingConfig(),
)

if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(app, host="0.0.0.0", log_level="debug")
