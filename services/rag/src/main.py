import base64
import binascii
import time
from typing import TYPE_CHECKING, Any

from litestar import post
from packages.shared_utils.src.ai import init_llm_connection
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import AutofillRequest, PubSubEvent, RagRequest
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.research_deep_dive_handler import generate_research_answers
from services.rag.src.autofill.research_plan_handler import generate_research_objectives
from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.grant_template.handler import grant_template_generation_pipeline_handler

if TYPE_CHECKING:
    from services.rag.src.dto import AutofillRequestDTO

configure_otel("rag")

logger = get_logger(__name__)


def handle_pubsub_message(message: PubSubEvent) -> RagRequest | AutofillRequest:
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

        logger.debug("Deserializing message", decoded_length=len(decoded_data))

        try:
            rag_request = deserialize(decoded_data, RagRequest)
            decode_duration = time.time() - start_time
            logger.debug(
                "PubSub message decoded as RagRequest",
                parent_type=rag_request["parent_type"],
                parent_id=str(rag_request["parent_id"]),
                trace_id=rag_request.get("trace_id"),
                decode_duration_ms=round(decode_duration * 1000, 2),
            )
            return rag_request
        except DeserializationError:
            autofill_request = deserialize(decoded_data, AutofillRequest)
            decode_duration = time.time() - start_time
            logger.debug(
                "PubSub message decoded as AutofillRequest",
                parent_type=autofill_request["parent_type"],
                parent_id=str(autofill_request["parent_id"]),
                autofill_type=autofill_request["autofill_type"],
                trace_id=autofill_request.get("trace_id"),
                decode_duration_ms=round(decode_duration * 1000, 2),
            )
            return autofill_request

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


async def handle_autofill_request(request: AutofillRequest) -> dict[str, Any]:
    """Handle autofill requests"""
    trace_id = request.get("trace_id")

    logger.info(
        "Processing autofill request",
        application_id=str(request["parent_id"]),
        autofill_type=request["autofill_type"],
        field_name=request.get("field_name"),
        trace_id=trace_id,
    )

    try:
        handler_request: AutofillRequestDTO = {
            "parent_type": request["parent_type"],
            "parent_id": str(request["parent_id"]),
            "autofill_type": request["autofill_type"],
        }

        if request.get("field_name"):
            handler_request["field_name"] = request["field_name"]
        if request.get("context"):
            handler_request["context"] = request["context"]
        if trace_id:
            handler_request["trace_id"] = trace_id

        if request["autofill_type"] == "research_plan":
            result = await generate_research_objectives(handler_request, logger)
        elif request["autofill_type"] == "research_deep_dive":
            result = await generate_research_answers(handler_request, logger)
        else:
            raise ValueError(f"Unknown autofill type: {request['autofill_type']}")

        logger.info(
            "Autofill generation completed",
            application_id=str(request["parent_id"]),
            autofill_type=request["autofill_type"],
            trace_id=trace_id,
        )

        return {"success": True, "data": result}

    except Exception as e:
        logger.exception(
            "Autofill generation failed",
            application_id=str(request["parent_id"]),
            autofill_type=request["autofill_type"],
            trace_id=trace_id,
        )
        return {"success": False, "error": str(e)}


@post("/")
async def handle_request(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    start_time = time.time()
    logger.debug(
        "Received PubSub request",
        message_id=data.message.message_id if data.message else "unknown",
        publish_time=data.message.publish_time if data.message else "unknown",
    )

    request = handle_pubsub_message(data)

    if isinstance(request, dict) and "autofill_type" in request:
        autofill_request: AutofillRequest = request  # type: ignore[assignment]
        trace_id = autofill_request.get("trace_id")

        try:
            result = await handle_autofill_request(autofill_request)

            total_duration = time.time() - start_time
            logger.info(
                "Autofill request completed",
                application_id=str(autofill_request["parent_id"]),
                autofill_type=autofill_request["autofill_type"],
                success=result["success"],
                trace_id=trace_id,
                total_duration_ms=round(total_duration * 1000, 2),
            )
            return

        except Exception as e:
            error_duration = time.time() - start_time
            logger.exception(
                "Unexpected error during autofill processing",
                application_id=str(autofill_request["parent_id"]),
                autofill_type=autofill_request["autofill_type"],
                trace_id=trace_id,
                error_type=type(e).__name__,
                error_duration_ms=round(error_duration * 1000, 2),
            )
            raise

    else:
        rag_request: RagRequest = request
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
        handle_request,
    ],
    on_startup=[before_server_start],
)
