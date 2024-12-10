import logging
import sys
from typing import Any

from dotenv import load_dotenv
from sanic import Sanic
from sanic_ext import Extend

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
from src.api.login import handle_login
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
    handle_retrieve_workspaces,
    handle_update_workspace,
)
from src.middleware import authenticate_user, set_session_maker

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
app = Sanic[Any, RequestContext]("grantflow")

app.config.CORS_ORIGINS = "*"
app.config.CORS_ALLOW_HEADERS = "*"
app.config.CORS_METHODS = ["OPTIONS", "GET", "POST", "PATCH", "DELETE"]
app.config.CORS_MAX_AGE = 86400
app.config.CORS_AUTOMATIC_OPTIONS = True

Extend(app)

app.register_middleware(authenticate_user, "request")
app.register_middleware(set_session_maker, "request")

app.add_route(handle_login, "/login", methods=["POST"])

# CFPs
app.add_route(handle_retrieve_cfps, "/cfps", methods=["GET"])

# Workspaces CRUD
app.add_route(handle_create_workspace, "/workspaces", methods=["POST"])
app.add_route(handle_retrieve_workspaces, "/workspaces", methods=["GET"])
app.add_route(handle_update_workspace, "/workspaces/<workspace_id:uuid>", methods=["PATCH"])
app.add_route(handle_delete_workspace, "/workspaces/<workspace_id:uuid>", methods=["DELETE"])

# Applications CRUD
app.add_route(handle_create_application, "/workspaces/<workspace_id:uuid>/applications", methods=["POST"])
app.add_route(handle_retrieve_applications, "/workspaces/<workspace_id:uuid>/applications", methods=["GET"])
app.add_route(
    handle_retrieve_application_detail,
    "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>",
    methods=["GET"],
)
app.add_route(
    application_ws_handler,
    "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/chat-room",
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

# RAG
app.add_route(
    handle_create_application_draft,
    "/workspaces/<workspace_id:uuid>/applications/<application_id:uuid>/generate-draft",
    methods=["POST"],
)

if __name__ == "__main__":
    load_dotenv()
    app.run(host="0.0.0.0", port=8000)
