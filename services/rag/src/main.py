import base64
import binascii
import time
from typing import Any

from litestar import post
from packages.shared_utils.src.ai import init_llm_connection
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import PubSubEvent, RagRequest
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.grant_template.handler import grant_template_generation_pipeline_handler

configure_otel("rag")

logger = get_logger(__name__)


def handle_pubsub_message(message: PubSubEvent) -> RagRequest:
    start_time = time.time()
    logger.debug(
        "Decoding PubSub message", message_id=message.message.message_id, publish_time=message.message.publish_time
    )

    try:
        encoded_data = message.message.data
        if not encoded_data:
            logger.error("PubSub message missing data field", message_id=message.message.message_id)
            raise ValidationError("PubSub message missing data field")

        logger.debug("Decoding base64 data", data_length=len(encoded_data))
        decoded_data = base64.b64decode(encoded_data).decode()

        logger.debug("Deserializing RAG request", decoded_length=len(decoded_data))
        rag_request = deserialize(decoded_data, RagRequest)

        decode_duration = time.time() - start_time
        logger.debug(
            "PubSub message decoded successfully",
            parent_type=rag_request["parent_type"],
            parent_id=str(rag_request["parent_id"]),
            trace_id=rag_request.get("trace_id"),
            decode_duration_ms=round(decode_duration * 1000, 2),
        )

        return rag_request
    except (DeserializationError, binascii.Error, UnicodeDecodeError) as e:
        decode_duration = time.time() - start_time
        logger.error(
            "Failed to parse PubSub message",
            error=str(e),
            message_id=message.message.message_id,
            error_type=type(e).__name__,
            decode_duration_ms=round(decode_duration * 1000, 2),
        )
        raise ValidationError("Invalid pubsub message format") from e


@post("/")
async def handle_rag_request(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    start_time = time.time()
    logger.debug(
        "Received PubSub RAG request",
        message_id=data.message.message_id if data.message else "unknown",
        publish_time=data.message.publish_time if data.message else "unknown",
    )

    rag_request = handle_pubsub_message(data)
    trace_id = rag_request.get("trace_id")

    logger.debug(
        "Starting RAG processing pipeline",
        parent_type=rag_request["parent_type"],
        parent_id=str(rag_request["parent_id"]),
        trace_id=trace_id,
    )

    try:
        pipeline_start = time.time()

        if rag_request["parent_type"] == "grant_template":
            logger.debug(
                "Processing grant template",
                grant_template_id=str(rag_request["parent_id"]),
                trace_id=trace_id,
            )
            await grant_template_generation_pipeline_handler(
                grant_template_id=rag_request["parent_id"],
                session_maker=session_maker,
            )
        else:
            logger.debug(
                "Processing grant application",
                grant_application_id=str(rag_request["parent_id"]),
                trace_id=trace_id,
            )
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=rag_request["parent_id"],
                session_maker=session_maker,
            )

        pipeline_duration = time.time() - pipeline_start
        total_duration = time.time() - start_time

        logger.info(
            "RAG processing completed successfully",
            parent_type=rag_request["parent_type"],
            parent_id=str(rag_request["parent_id"]),
            trace_id=trace_id,
            pipeline_duration_ms=round(pipeline_duration * 1000, 2),
            total_duration_ms=round(total_duration * 1000, 2),
        )

    except RuntimeError as e:
        error_duration = time.time() - start_time
        logger.warning(
            "Failed to process RAG request - parent entity may have been deleted",
            parent_type=rag_request["parent_type"],
            parent_id=str(rag_request["parent_id"]),
            trace_id=trace_id,
            error_type=type(e).__name__,
            error=str(e),
            error_duration_ms=round(error_duration * 1000, 2),
        )
        return
    except Exception as e:
        error_duration = time.time() - start_time
        logger.exception(
            "Unexpected error during RAG processing",
            parent_type=rag_request["parent_type"],
            parent_id=str(rag_request["parent_id"]),
            trace_id=trace_id,
            error_type=type(e).__name__,
            error_duration_ms=round(error_duration * 1000, 2),
        )
        raise


async def before_server_start() -> None:
    init_llm_connection()


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_rag_request,
    ],
    on_startup=[before_server_start],
)
