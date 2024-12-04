import logging
import sys

from sanic import Sanic

from src.indexer.handler import handle_files_upload
from src.rag.handler import handle_generate_draft_request

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)

app = Sanic("grantflow")

app.add_route(handle_files_upload, "/<application_id:uuid>/index-files", methods=["POST"])
app.add_route(handle_generate_draft_request, "/<application_id:uuid>/generate-draft", methods=["POST"])
