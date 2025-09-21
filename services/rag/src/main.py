from typing import Any

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
from packages.shared_utils.src.otel import configure_otel, get_tracer
from packages.shared_utils.src.pubsub import (
    GrantApplicationRagRequest,
    GrantTemplateRagRequest,
    PubSubEvent,
    RagRequest,
    ResearchDeepDiveAutofillRequest,
    ResearchPlanAutofillRequest,
    decode_pubsub_message,
)
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.handler import handle_autofill_request
from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline

tracer = get_tracer(__name__)


configure_otel("rag")

logger = get_logger(__name__)


def handle_pubsub_message(event: PubSubEvent) -> RagRequest:
    # PubSub message decoding
    decoded_data = decode_pubsub_message(event=event)
    try:
        return deserialize(decoded_data, RagRequest)
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

    logger.info(
        "Processing request",
        request_type=type(request).__name__,
        trace_id=request.trace_id,
    )

    # Handle autofill requests
    if isinstance(request, (ResearchPlanAutofillRequest, ResearchDeepDiveAutofillRequest)):
        # Fetch the GrantApplication from database
        async with session_maker() as session:
            application = await session.scalar(
                select_active(GrantApplication).where(GrantApplication.id == request.application_id)
            )

            if not application:
                logger.error(
                    "Grant application not found for autofill request",
                    application_id=str(request.application_id),
                    request_type=type(request).__name__,
                    trace_id=request.trace_id,
                )
                raise ValidationError(
                    f"Grant application {request.application_id} not found or has been deleted",
                    context={
                        "application_id": str(request.application_id),
                        "request_type": type(request).__name__,
                        "trace_id": request.trace_id,
                    },
                )

        with tracer.start_as_current_span(
            "autofill_request",
            attributes={
                "request.type": type(request).__name__,
                "application.id": str(request.application_id),
                "application.title": application.title,
                "trace.id": request.trace_id,
            },
        ) as span:
            try:
                await handle_autofill_request(
                    request=request,
                    application=application,
                    session_maker=session_maker
                )
                span.set_attribute("autofill.success", True)
            except RagJobCancelledError:
                logger.info(
                    "Job cancelled",
                    request_type=type(request).__name__,
                    trace_id=request.trace_id,
                )
                span.set_attribute("autofill.cancelled", True)
                # Return None to ACK the message and prevent retries
                return
        return

    # Handle grant template pipeline requests
    if isinstance(request, GrantTemplateRagRequest):
        # Fetch the GrantTemplate from database
        async with session_maker() as session:
            grant_template = await session.scalar(
                select_active(GrantTemplate).where(GrantTemplate.id == request.parent_id)
            )

            if not grant_template:
                logger.error(
                    "Grant template not found",
                    template_id=str(request.parent_id),
                    trace_id=request.trace_id,
                )
                raise ValidationError(f"Grant template {request.parent_id} not found")

        try:
            await handle_grant_template_pipeline(
                grant_template=grant_template,
                session_maker=session_maker,
                generation_stage=request.stage,
                trace_id=request.trace_id,
            )
        except RagJobCancelledError:
            logger.info(
                "Job cancelled",
                stage=request.stage,
                trace_id=request.trace_id,
            )
            # Return None to ACK the message and prevent retries
            return
        return

    # Handle grant application pipeline requests
    if isinstance(request, GrantApplicationRagRequest):
        # Fetch the GrantApplication from database
        async with session_maker() as session:
            grant_application = await session.scalar(
                select_active(GrantApplication).where(GrantApplication.id == request.parent_id)
            )

            if not grant_application:
                logger.error(
                    "Grant application not found",
                    application_id=str(request.parent_id),
                    trace_id=request.trace_id,
                )
                raise ValidationError(f"Grant application {request.parent_id} not found")

        try:
            await handle_grant_application_pipeline(
                grant_application=grant_application,
                session_maker=session_maker,
                generation_stage=request.stage,
                trace_id=request.trace_id,
            )
        except RagJobCancelledError:
            logger.info(
                "Job cancelled",
                stage=request.stage,
                trace_id=request.trace_id,
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
