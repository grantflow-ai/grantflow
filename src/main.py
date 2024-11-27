from sanic import Sanic

from src.indexer.handler import handle_files_upload
from src.rag_backend.handler import handle_generate_draft_request

app = Sanic("GrantFlow Backend API")

app.add_route(
    handle_files_upload, "/index-file/<workspace_id:uuid>/<application_id:uuid>/<section_name:str>", methods=["POST"]
)
app.add_route(handle_generate_draft_request, "/generate-draft", methods=["POST"])
