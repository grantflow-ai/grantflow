import logging
import sys

import uvicorn
from sanic import Sanic
from sanic_ext import Config

from src.api.api_types import RequestContext
from src.api.applications import (
    handle_create_application,
    handle_retrieve_application_detail,
    handle_retrieve_applications,
)
from src.api.cfps import handle_retrieve_cfps
from src.api.chat import application_ws_handler
from src.api.drafts import handle_create_application_draft
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
from src.exceptions import BackendError
from src.middleware import authenticate_user, set_session_maker
from src.utils.env import get_env
from src.utils.serialization import decoder, encoder
from src.utils.server import handle_backend_error

logging.basicConfig(
    level=logging.DEBUG if get_env("DEBUG", "") == "true" else logging.INFO,
    stream=sys.stdout,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = Sanic[Config, RequestContext](
    "grantflow",
    dumps=encoder,
    loads=decoder,
    config=Config(
        CORS_ORIGINS="*",
        CORS_ALLOW_HEADERS="*",
        CORS_METHODS=["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
        CORS_MAX_AGE=86400,
        CORS_AUTOMATIC_OPTIONS=True,
    ),
)

app.error_handler.add(BackendError, handle_backend_error)

app.register_middleware(authenticate_user, "request")
app.register_middleware(set_session_maker, "request")

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
app.add_websocket_route(
    application_ws_handler,
    "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/chat-room",
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

# RAG
app.add_route(
    handle_create_application_draft,
    "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/generate-draft",
    methods=["POST"],
)

if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(host="0.0.0.0", port=8000, log_level="debug", app="src.main:app")
