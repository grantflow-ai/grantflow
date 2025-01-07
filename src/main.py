import logging
from typing import Any

import uvicorn
from sanic import Sanic

from src.api import register_routes
from src.api_types import RequestContext
from src.indexer.files import parse_and_index_file
from src.middleware import authenticate_user, set_session_maker
from src.rag.application_draft.generate_draft import generate_application_draft
from src.rag.grant_template.handler import handle_generate_grant_template
from src.utils.serialization import decoder, encoder
from src.utils.server import before_server_start_hook, handle_exception

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

app = Sanic[Any, RequestContext]("grantflow", dumps=encoder, loads=decoder)

app.config.CORS_ORIGINS = "*"
app.config.CORS_ALLOW_HEADERS = "*"
app.config.CORS_METHODS = ["OPTIONS", "GET", "POST", "PATCH", "DELETE"]
app.config.CORS_MAX_AGE = 86400
app.config.CORS_AUTOMATIC_OPTIONS = True

app.error_handler.add(Exception, handle_exception)

app.register_middleware(authenticate_user)
app.register_middleware(set_session_maker)
app.register_listener(before_server_start_hook, "before_server_start")

app.add_signal(generate_application_draft, generate_application_draft.__name__)
app.add_signal(parse_and_index_file, parse_and_index_file.__name__)
app.add_signal(handle_generate_grant_template, handle_generate_grant_template.__name__)

register_routes(app)

if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(host="0.0.0.0", log_level="debug", app="src.main:app")
