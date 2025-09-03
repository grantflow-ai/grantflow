from litestar import Router
from litestar.handlers import HTTPRouteHandler, WebsocketRouteHandler
from litestar.stores.memory import MemoryStore
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.server import create_litestar_app

from services.backend.src.api.middleware import AuthMiddleware, TraceIdMiddleware
from services.backend.src.api.routes.auth import handle_create_otp, handle_login
from services.backend.src.api.routes.grant_applications import (
    handle_create_application,
    handle_delete_application,
    handle_duplicate_application,
    handle_generate_application,
    handle_list_applications,
    handle_list_organization_applications,
    handle_retrieve_application,
    handle_trigger_autofill,
    handle_update_application,
)
from services.backend.src.api.routes.grant_template import (
    handle_generate_grant_template,
    handle_update_grant_template,
)
from services.backend.src.api.routes.granting_institutions import (
    handle_create_organization as handle_create_granting_institution,
)
from services.backend.src.api.routes.granting_institutions import (
    handle_delete_organization as handle_delete_granting_institution,
)
from services.backend.src.api.routes.granting_institutions import (
    handle_retrieve_organizations as handle_retrieve_granting_institutions,
)
from services.backend.src.api.routes.granting_institutions import (
    handle_update_organization as handle_update_granting_institution,
)
from services.backend.src.api.routes.grants import (
    handle_create_subscription,
    handle_get_grant_details,
    handle_search_grants,
    handle_unsubscribe,
)
from services.backend.src.api.routes.notifications import (
    dismiss_notification,
    list_notifications,
)
from services.backend.src.api.routes.organization_invitations import (
    handle_create_organization_invitation,
    handle_delete_organization_invitation,
    handle_list_organization_invitations,
    handle_update_organization_invitation,
)
from services.backend.src.api.routes.organizations import (
    handle_create_organization as handle_create_org,
)
from services.backend.src.api.routes.organizations import (
    handle_delete_organization as handle_delete_org,
)
from services.backend.src.api.routes.organizations import (
    handle_get_organization,
    handle_list_organizations,
    handle_restore_organization,
)
from services.backend.src.api.routes.organizations import (
    handle_update_organization as handle_update_org,
)
from services.backend.src.api.routes.organizations_members import (
    handle_add_organization_member,
    handle_list_organization_members,
    handle_remove_member,
)
from services.backend.src.api.routes.organizations_members import (
    handle_update_member_role as handle_update_organization_member_role,
)
from services.backend.src.api.routes.projects import (
    handle_accept_invitation,
    handle_create_invitation_redirect_url,
    handle_create_project,
    handle_delete_invitation,
    handle_delete_project,
    handle_list_project_members,
    handle_remove_project_member,
    handle_retrieve_project,
    handle_retrieve_projects,
    handle_update_invitation_role,
    handle_update_member_role,
    handle_update_project,
)
from services.backend.src.api.routes.rag_jobs import handle_retrieve_rag_job
from services.backend.src.api.routes.sources import (
    handle_crawl_url,
    handle_create_upload_url,
    handle_delete_rag_source,
    handle_retrieve_rag_sources,
)
from services.backend.src.api.routes.user import delete_user, get_sole_owned_organizations, get_sole_owned_projects
from services.backend.src.api.sockets.grant_applications import (
    handle_grant_application_notifications,
)
from services.backend.src.api.webhooks.email_sending import handle_email_notification_webhook
from services.backend.src.api.webhooks.grant_matcher import handle_grant_matcher_webhook
from services.backend.src.utils.firebase import get_firebase_app

configure_otel("backend")

logger = get_logger(__name__)

api_routes: list[HTTPRouteHandler | WebsocketRouteHandler] = [
    handle_create_otp,
    handle_login,
    delete_user,
    get_sole_owned_projects,
    get_sole_owned_organizations,
    handle_create_org,
    handle_list_organizations,
    handle_get_organization,
    handle_update_org,
    handle_delete_org,
    handle_restore_organization,
    handle_list_organization_members,
    handle_add_organization_member,
    handle_update_organization_member_role,
    handle_remove_member,
    handle_list_organization_invitations,
    handle_create_organization_invitation,
    handle_update_organization_invitation,
    handle_delete_organization_invitation,
    handle_create_project,
    handle_retrieve_projects,
    handle_retrieve_project,
    handle_update_project,
    handle_delete_project,
    handle_list_project_members,
    handle_update_member_role,
    handle_remove_project_member,
    handle_create_invitation_redirect_url,
    handle_delete_invitation,
    handle_update_invitation_role,
    handle_accept_invitation,
    handle_create_application,
    handle_list_applications,
    handle_list_organization_applications,
    handle_retrieve_application,
    handle_update_application,
    handle_delete_application,
    handle_duplicate_application,
    handle_generate_application,
    handle_trigger_autofill,
    handle_grant_application_notifications,
    handle_generate_grant_template,
    handle_update_grant_template,
    handle_create_granting_institution,
    handle_retrieve_granting_institutions,
    handle_update_granting_institution,
    handle_delete_granting_institution,
    handle_create_upload_url,
    handle_crawl_url,
    handle_retrieve_rag_sources,
    handle_delete_rag_source,
    handle_retrieve_rag_job,
    list_notifications,
    dismiss_notification,
    handle_search_grants,
    handle_get_grant_details,
    handle_create_subscription,
    handle_unsubscribe,
    handle_email_notification_webhook,
    handle_grant_matcher_webhook,
]


route_handlers: (
    list[HTTPRouteHandler | WebsocketRouteHandler] | list[HTTPRouteHandler | WebsocketRouteHandler | Router]
) = api_routes


async def before_server_start() -> None:
    get_firebase_app()


try:
    from litestar.contrib.opentelemetry import OpenTelemetryPlugin

    otel_plugin = OpenTelemetryPlugin()
    plugins = [otel_plugin]
except ImportError:
    logger.warning("Litestar OpenTelemetry plugin not available, using ASGI instrumentation instead")
    plugins = []

app = create_litestar_app(
    logger=logger,
    route_handlers=route_handlers,
    on_startup=[before_server_start],
    middleware=[TraceIdMiddleware(), AuthMiddleware],
    plugins=plugins,
    stores={"firebase_user_cache": MemoryStore()},
)
