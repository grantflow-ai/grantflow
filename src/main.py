import logging
import sys

from sanic import Sanic

from src.api.application_drafts import handle_create_application_draft
from src.api.application_files import handle_upload_application_files
from src.api.workspaces import (
    handle_create_workspace,
    handle_delete_workspace,
    handle_retrieve_workspaces,
    handle_update_workspace,
)

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)

app = Sanic("grantflow")

# Workspaces CRUD
app.add_route(handle_create_workspace, "/<user_id:uuid>/workspaces", methods=["POST"])
app.add_route(handle_retrieve_workspaces, "/<user_id:uuid>/workspaces", methods=["GET"])
app.add_route(handle_update_workspace, "/<user_id:uuid>/workspaces/<workspace_id:uuid>", methods=["PATCH"])
app.add_route(handle_delete_workspace, "/<user_id:uuid>/workspaces/<workspace_id:uuid>", methods=["DELETE"])

# Indexing
app.add_route(handle_upload_application_files, "/<application_id:uuid>/index-files", methods=["POST"])

# RAG
app.add_route(handle_create_application_draft, "/<application_id:uuid>/generate-draft", methods=["POST"])
