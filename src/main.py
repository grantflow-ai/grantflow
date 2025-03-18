import logging

import uvicorn
from litestar import Litestar
from litestar.config.cors import CORSConfig
from litestar.di import Provide
from litestar.events import listener
from litestar.handlers import HTTPRouteHandler

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
from src.indexer.files import parse_and_index_file
from src.middleware import AuthMiddleware
from src.utils.server import before_server_start, handle_exception

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

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

session_maker_provider = Provide(get_session_maker)
parse_and_index_file_listener = listener("parse_and_index_file")(parse_and_index_file)

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
)

if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(host="0.0.0.0", log_level="debug", app="src.main:app")
