from typing import Any

from sanic import Sanic

from src.api.applications import (
    handle_create_application,
    handle_delete_application,
    handle_retrieve_application,
    handle_retrieve_application_text,
    handle_update_application,
)
from src.api.format import handle_create_grant_format
from src.api.health import health_check
from src.api.login import handle_login
from src.api.otp import handle_create_otp
from src.api.workspaces import (
    handle_create_workspace,
    handle_delete_workspace,
    handle_retrieve_workspace,
    handle_retrieve_workspaces,
    handle_update_workspace,
)


def register_routes(app: Sanic[Any, Any]) -> None:
    """Register the API routes.

    Args:
        app: The Sanic app instance
    """
    # Health check
    app.add_route(health_check, "/health", methods=["GET"])

    # Auth
    app.add_route(handle_login, "/login", methods=["POST"])
    app.add_route(handle_create_otp, "/otp", methods=["GET"])

    # Workspaces
    app.add_route(handle_create_workspace, "/workspaces", methods=["POST"])
    app.add_route(handle_retrieve_workspaces, "/workspaces", methods=["GET"])
    app.add_route(handle_update_workspace, "/workspaces/<workspace_id:uuid>", methods=["PATCH"])
    app.add_route(handle_retrieve_workspace, "/workspaces/<workspace_id:uuid>", methods=["GET"])
    app.add_route(handle_delete_workspace, "/workspaces/<workspace_id:uuid>", methods=["DELETE"])

    # Applications
    app.add_route(handle_create_application, "/workspaces/<workspace_id:uuid>/applications", methods=["POST"])
    app.add_route(
        handle_retrieve_application,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>",
        methods=["GET"],
    )
    app.add_route(
        handle_update_application,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>",
        methods=["PATCH"],
    )
    app.add_route(
        handle_delete_application,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>",
        methods=["DELETE"],
    )
    app.add_route(
        handle_retrieve_application_text,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/content",
        methods=["GET"],
    )

    # Grant Formats
    app.add_route(handle_create_grant_format, "/grant-formats", methods=["POST"])
