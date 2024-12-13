from typing import Any

from sanic import Sanic

from src.api.applications import (
    handle_create_application,
    handle_retrieve_application_detail,
    handle_retrieve_applications,
)
from src.api.cfps import handle_retrieve_cfps
from src.api.chat import chat_room_ws_handler
from src.api.files import handle_upload_application_files
from src.api.health import health_check
from src.api.login import handle_login
from src.api.otp import handle_create_otp
from src.api.research_aims import (
    handle_create_research_aims,
    handle_delete_research_aim,
    handle_retrieve_research_aims,
    handle_update_research_aim,
    handle_update_research_task,
)
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

    # CFPs
    app.add_route(handle_retrieve_cfps, "/cfps", methods=["GET"])

    # Workspaces CRUD
    app.add_route(handle_create_workspace, "/workspaces", methods=["POST"])
    app.add_route(handle_retrieve_workspaces, "/workspaces", methods=["GET"])
    app.add_route(handle_update_workspace, "/workspaces/<workspace_id:uuid>", methods=["PATCH"])
    app.add_route(handle_retrieve_workspace, "/workspaces/<workspace_id:uuid>", methods=["GET"])
    app.add_route(handle_delete_workspace, "/workspaces/<workspace_id:uuid>", methods=["DELETE"])

    # Applications CRUD
    app.add_route(handle_create_application, "/workspaces/<workspace_id:uuid>/applications", methods=["POST"])
    app.add_route(handle_retrieve_applications, "/workspaces/<workspace_id:uuid>/applications", methods=["GET"])
    app.add_route(
        handle_retrieve_application_detail,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>",
        methods=["GET"],
    )

    # Research Aims CRUD
    app.add_route(
        handle_create_research_aims,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/research-aims",
        methods=["POST"],
    )
    app.add_route(
        handle_retrieve_research_aims,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/research-aims",
        methods=["GET"],
    )
    app.add_route(
        handle_update_research_aim,
        "/workspaces/<workspace_id:uuid>/research-aims/<research_aim_id:uuid>",
        methods=["PATCH"],
    )
    app.add_route(
        handle_update_research_task,
        "/workspaces/<workspace_id:uuid>/research-tasks/<research_task_id:uuid>",
        methods=["PATCH"],
    )
    app.add_route(
        handle_delete_research_aim,
        "/workspaces/<workspace_id:uuid>/research-aims/<research_aim_id:uuid>",
        methods=["DELETE"],
    )

    # Indexing
    app.add_route(
        handle_upload_application_files,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/index-files",
        methods=["POST"],
    )

    # Chat Websocket

    app.add_websocket_route(
        chat_room_ws_handler,
        "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/chat-room",
    )
