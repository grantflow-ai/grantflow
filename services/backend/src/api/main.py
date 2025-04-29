import logging
import sys

from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.events import listener
from litestar.handlers import HTTPRouteHandler, WebsocketRouteHandler
from litestar.logging import StructLoggingConfig
from litestar.stores.registry import StoreRegistry
from litestar.stores.valkey import ValkeyStore
from packages.db.src.connection import get_session_maker
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_exception_handler, session_maker_provider
from services.backend.src.api.middleware import AuthMiddleware
from services.backend.src.api.routes.application_files import (
    handle_create_upload_url,
    handle_delete_application_file,
    retrieve_application_files,
)
from services.backend.src.api.routes.auth import handle_create_otp, handle_login
from services.backend.src.api.routes.funding_organizations import (
    handle_create_organization,
    handle_delete_organization,
    handle_retrieve_organizations,
    handle_update_organization,
)
from services.backend.src.api.routes.grant_applications import (
    handle_delete_application,
)
from services.backend.src.api.routes.health import health_check
from services.backend.src.api.routes.organization_files import (
    handle_delete_organization_file,
    retrieve_organization_files,
)
from services.backend.src.api.routes.workspaces import (
    handle_create_workspace,
    handle_delete_workspace,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_workspace,
)
from services.backend.src.api.sockets.grant_applications import handle_application_websocket
from services.backend.src.rag.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.backend.src.rag.grant_template.handler import grant_template_generation_pipeline_handler
from services.backend.src.utils.ai import init_llm_connection
from services.backend.src.utils.firebase import get_firebase_app
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

logger = get_logger(__name__)

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

api_routes: list[HTTPRouteHandler | WebsocketRouteHandler] = [
    handle_application_websocket,
    handle_create_organization,
    handle_create_otp,
    handle_create_workspace,
    handle_create_upload_url,
    handle_delete_application,
    handle_delete_application_file,
    handle_delete_organization,
    handle_delete_organization_file,
    handle_delete_workspace,
    handle_login,
    handle_retrieve_organizations,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_organization,
    handle_update_workspace,
    health_check,
    retrieve_application_files,
    retrieve_organization_files,
]

grant_template_generation_pipeline_handler_listener = listener("grant_template_generation_pipeline_handler")(
    grant_template_generation_pipeline_handler
)
grant_application_text_generation_pipeline_handler_listener = listener(
    "grant_application_text_generation_pipeline_handler"
)(grant_application_text_generation_pipeline_handler)


exception_handler = create_exception_handler(logger)


async def before_server_start(app_instance: Litestar) -> None:
    get_firebase_app()
    init_llm_connection()

    session_maker = app_instance.state.session_maker = get_session_maker()
    try:
        async with session_maker() as session:
            await session.execute(text("SELECT 1"))

        logger.info("DB connection established.")
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to connect to the database.", exc_info=e)
        sys.exit(1)


def valkey_store_factory(name: str) -> ValkeyStore:
    connection_string = get_env("VALKEY_CONNECTION_STRING")

    return ValkeyStore.with_client(url=connection_string, namespace=name)


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
    exception_handlers={SQLAlchemyError: exception_handler, BackendError: exception_handler},
    dependencies={"session_maker": session_maker_provider},
    logging_config=StructLoggingConfig(log_exceptions="always"),
    listeners=[
        grant_template_generation_pipeline_handler_listener,
        grant_application_text_generation_pipeline_handler_listener,
    ],
    stores=StoreRegistry(default_factory=valkey_store_factory),
)
