import base64
from typing import Any

from litestar import post
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import PubSubEvent, RagRequest
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.grant_template.handler import grant_template_generation_pipeline_handler

logger = get_logger(__name__)


def handle_pubsub_message(message: PubSubEvent) -> RagRequest:
    try:
        encoded_data = message["message"].get("data")
        if not encoded_data:
            raise ValidationError("PubSub message missing data field")
        decoded_data = base64.b64decode(encoded_data).decode()
        return deserialize(decoded_data, RagRequest)
    except (DeserializationError, ValueError, KeyError) as e:
        raise ValidationError("Invalid pubsub message") from e


@post("/")
async def handle_rag_request(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    rag_request = handle_pubsub_message(data)
    if rag_request["parent_type"] == "grant_template":
        await grant_template_generation_pipeline_handler(
            grant_template_id=rag_request["parent_id"],
            session_maker=session_maker,
        )
    else:
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=rag_request["parent_id"],
            session_maker=session_maker,
        )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_rag_request,
    ],
)
