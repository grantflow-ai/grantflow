from contextlib import suppress
from typing import TYPE_CHECKING, Any, cast

from litestar import post
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.shared_utils.src.ai import init_llm_connection
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    RagJobCancelledError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import AutofillRequest, PubSubEvent, RagRequest, decode_pubsub_message
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.handler import handle_autofill_request
from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline

if TYPE_CHECKING:
    from services.rag.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum

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
            trace_id=rag_request["trace_id"],
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

    logger.debug(
        "Received PubSub request",
        message_id=data.message.message_id if data.message else "unknown",
        publish_time=data.message.publish_time if data.message else "unknown",
        request=request,
    )

    if "autofill_type" in request:
        try:
            await handle_autofill_request(request=cast("AutofillRequest", request), session_maker=session_maker)
        except RagJobCancelledError:
            logger.info(
                "Autofill request job was cancelled",
                autofill_type=request.get("autofill_type"),
                application_id=request.get("application_id"),
                trace_id=request.get("trace_id"),
            )
            # Return None to ACK the message and prevent retries
            return
        return

    if request["parent_type"] == "grant_template":
        # Fetch the GrantTemplate from database
        async with session_maker() as session:
            grant_template = await session.scalar(select_active(GrantTemplate).where(GrantTemplate.id == request["parent_id"]))

            if not grant_template:
                logger.error(
                    "Grant template not found",
                    template_id=str(request["parent_id"]),
                    trace_id=request["trace_id"],
                )
                raise ValidationError(f"Grant template {request['parent_id']} not found")

        try:
            await handle_grant_template_pipeline(
                grant_template=grant_template,
                session_maker=session_maker,
                generation_stage=cast("GrantTemplateStageEnum", request["stage"]),
                trace_id=request["trace_id"],
            )
        except RagJobCancelledError:
            logger.info(
                "Grant template pipeline job was cancelled",
                template_id=str(request["parent_id"]),
                stage=request["stage"],
                trace_id=request["trace_id"],
            )
            # Return None to ACK the message and prevent retries
            return
        return

    # Fetch the GrantApplication from database
    async with session_maker() as session:
        grant_application = await session.scalar(
            select_active(GrantApplication).where(GrantApplication.id == request["parent_id"])
        )

        if not grant_application:
            logger.error(
                "Grant application not found",
                application_id=str(request["parent_id"]),
                trace_id=request["trace_id"],
            )
            raise ValidationError(f"Grant application {request['parent_id']} not found")

    try:
        await handle_grant_application_pipeline(
            grant_application=grant_application,
            session_maker=session_maker,
            generation_stage=cast("GrantApplicationStageEnum", request["stage"]),
            trace_id=request["trace_id"],
        )
    except RagJobCancelledError:
        logger.info(
            "Grant application pipeline job was cancelled",
            application_id=str(request["parent_id"]),
            stage=request["stage"],
            trace_id=request["trace_id"],
        )
        # Return None to ACK the message and prevent retries
        return


async def before_server_start() -> None:
    init_llm_connection()


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_request,
    ],
    on_startup=[before_server_start],
)
