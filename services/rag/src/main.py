from contextlib import suppress
from typing import Any

from litestar import post
from packages.shared_utils.src.ai import init_llm_connection
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import AutofillRequest, PubSubEvent, RagRequest, decode_pubsub_message
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.handler import handle_autofill_request
from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.grant_template.handler import grant_template_generation_pipeline_handler

configure_otel("rag")

logger = get_logger(__name__)


def handle_pubsub_message(event: PubSubEvent) -> RagRequest | AutofillRequest:
    logger.debug(
        "Decoding PubSub message", message_id=event.message.message_id, publish_time=event.message.publish_time
    )
    decoded_data = decode_pubsub_message(event=event)
    try:
        with suppress(DeserializationError):
            autofill_request = deserialize(decoded_data, AutofillRequest)
            logger.debug(
                "PubSub message decoded as AutofillRequest",
                autofill_type=autofill_request["autofill_type"],
                trace_id=autofill_request.get("trace_id"),
            )
            return autofill_request

        rag_request = deserialize(decoded_data, RagRequest)
        logger.debug(
            "PubSub message decoded as RagRequest",
            parent_type=rag_request["parent_type"],
            parent_id=str(rag_request["parent_id"]),
            trace_id=rag_request.get("trace_id"),
        )
        return rag_request
    except DeserializationError as e:
        logger.error(
            "Failed to parse PubSub message",
            error=str(e),
            message_id=event.message.message_id,
            error_type=type(e).__name__,
        )
        raise ValidationError("Invalid pubsub message format", context={"error": str(e)}) from e


@post("/")
async def handle_request(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    request = handle_pubsub_message(data)
    trace_id = request.get("trace_id")

    logger.debug(
        "Received PubSub request",
        message_id=data.message.message_id if data.message else "unknown",
        publish_time=data.message.publish_time if data.message else "unknown",
        trace_id=trace_id,
        request=request,
    )

    if "autofill_type" in request:
        await handle_autofill_request(request=request, session_maker=session_maker)
        return

    if request["parent_type"] == "grant_template":
        await grant_template_generation_pipeline_handler(
            grant_template_id=request["parent_id"],
            session_maker=session_maker,
        )
        return

    await grant_application_text_generation_pipeline_handler(
        grant_application_id=request["parent_id"],
        session_maker=session_maker,
    )


async def before_server_start() -> None:
    init_llm_connection()


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_request,
    ],
    on_startup=[before_server_start],
)
