from litestar.handlers import HTTPRouteHandler, WebsocketRouteHandler
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app

from services.backend.src.api.middleware import AuthMiddleware
from services.backend.src.api.routes.auth import handle_create_otp, handle_login
from services.backend.src.api.routes.funding_organizations import (
    handle_create_organization,
    handle_delete_organization,
    handle_retrieve_organizations,
    handle_update_organization,
)
from services.backend.src.api.routes.grant_applications import (
    handle_create_application,
    handle_delete_application,
    handle_generate_application,
    handle_retrieve_application,
    handle_update_application,
)
from services.backend.src.api.routes.grant_template import (
    handle_generate_grant_template,
    handle_update_grant_template,
)
from services.backend.src.api.routes.sources import (
    handle_crawl_url,
    handle_create_upload_url,
    handle_delete_rag_source,
    handle_retrieve_rag_sources,
)
from services.backend.src.api.routes.workspaces import (
    handle_accept_invitation,
    handle_create_invitation_redirect_url,
    handle_create_workspace,
    handle_delete_invitation,
    handle_delete_workspace,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_invitation_role,
    handle_update_workspace,
)
from services.backend.src.api.sockets.grant_applications import (
    handle_grant_application_notifications,
)
from services.backend.src.utils.firebase import get_firebase_app

logger = get_logger(__name__)

api_routes: list[HTTPRouteHandler | WebsocketRouteHandler] = [
    handle_accept_invitation,
    handle_crawl_url,
    handle_create_application,
    handle_create_invitation_redirect_url,
    handle_create_organization,
    handle_create_otp,
    handle_create_upload_url,
    handle_create_workspace,
    handle_delete_application,
    handle_delete_invitation,
    handle_delete_organization,
    handle_delete_rag_source,
    handle_delete_workspace,
    handle_generate_application,
    handle_generate_grant_template,
    handle_grant_application_notifications,
    handle_login,
    handle_retrieve_application,
    handle_retrieve_organizations,
    handle_retrieve_rag_sources,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_application,
    handle_update_grant_template,
    handle_update_invitation_role,
    handle_update_organization,
    handle_update_workspace,
]


async def before_server_start() -> None:
    get_firebase_app()


app = create_litestar_app(
    logger=logger,
    route_handlers=api_routes,
    on_startup=[before_server_start],
    middleware=[AuthMiddleware],
)
