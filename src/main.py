import logging
import sys
from typing import Any

import uvicorn
from sanic import Sanic

from src.api import register_routes
from src.api_types import RequestContext
from src.middleware import authenticate_user, set_session_maker
from src.rag.generate_draft import generate_application_draft
from src.utils.serialization import decoder, encoder
from src.utils.server import before_server_start_hook, handle_exception

logging.basicConfig(
    level=logging.DEBUG,
    stream=sys.stdout,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

app = Sanic[Any, RequestContext]("grantflow", dumps=encoder, loads=decoder)

app.config.CORS_ORIGINS = "*"
app.config.CORS_ALLOW_HEADERS = "*"
app.config.CORS_METHODS = ["OPTIONS", "GET", "POST", "PATCH", "DELETE"]
app.config.CORS_MAX_AGE = 86400
app.config.CORS_AUTOMATIC_OPTIONS = True

app.error_handler.add(Exception, handle_exception)

app.register_middleware(authenticate_user, "request")
app.register_middleware(set_session_maker, "request")
app.register_listener(before_server_start_hook, "before_server_start")
app.add_signal(generate_application_draft, "generate_application_draft")
register_routes(app)

if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(host="0.0.0.0", port=8000, log_level="debug", app="src.main:app")
