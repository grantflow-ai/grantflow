import logging
import sys
from typing import Any

from sanic import Request, Sanic

from src.api.api_types import RequestContext
from src.api.applications import handle_create_application, handle_retrieve_applications
from src.api.cfps import handle_retrieve_cfps
from src.api.drafts import handle_create_application_draft
from src.api.files import handle_upload_application_files
from src.api.workspaces import (
    handle_create_workspace,
    handle_delete_workspace,
    handle_retrieve_workspaces,
    handle_update_workspace,
)
from src.db.connection import get_session_maker

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)

app = Sanic[Any, RequestContext]("grantflow")


def create_request_context(request: Request) -> None:
    """Middleware to create a session maker for each request.

    Args:
        request: The request object.
    """
    request.ctx.session_maker = get_session_maker()


app.register_middleware(create_request_context, "request")

# CFPs
app.add_route(handle_retrieve_cfps, "/cfps", methods=["GET"])

# Workspaces CRUD
app.add_route(handle_create_workspace, "/<user_id:uuid>/workspaces", methods=["POST"])
app.add_route(handle_retrieve_workspaces, "/<user_id:uuid>/workspaces", methods=["GET"])
app.add_route(handle_update_workspace, "/<user_id:uuid>/workspaces/<workspace_id:uuid>", methods=["PATCH"])
app.add_route(handle_delete_workspace, "/<user_id:uuid>/workspaces/<workspace_id:uuid>", methods=["DELETE"])

# Applications CRUD
app.add_route(
    handle_create_application, "/<user_id:uuid>/workspaces/<workspace_id:uuid>/applications", methods=["POST"]
)
app.add_route(
    handle_retrieve_applications, "/<user_id:uuid>/workspaces/<workspace_id:uuid>/applications", methods=["GET"]
)

# Indexing
app.add_route(handle_upload_application_files, "/<application_id:uuid>/index-files", methods=["POST"])

# RAG
app.add_route(handle_create_application_draft, "/<application_id:uuid>/generate-draft", methods=["POST"])
