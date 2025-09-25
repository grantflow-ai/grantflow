import time
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
from sqlalchemy.orm import selectinload

from services.rag.src.autofill.handler import handle_autofill_request
from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER
from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
from services.rag.src.grant_template.constants import GRANT_TEMPLATE_PIPELINE_STAGES
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline

configure_otel("rag")

logger = get_logger(__name__)
tracer = get_tracer(__name__)


def handle_pubsub_message(event: PubSubEvent) -> RagRequest:
    message_id = event.message.message_id
    logger.debug(
        "Processing PubSub message",
        message_id=message_id,
        publish_time=event.message.publish_time,
        attributes=event.message.attributes,
    )

    decoded_data = decode_pubsub_message(event=event)
    try:
        request: RagRequest = deserialize(decoded_data, RagRequest)  # type: ignore[arg-type]
        logger.debug(
            "Successfully parsed PubSub message",
            message_id=message_id,
            request_type=type(request).__name__,
            trace_id=request.trace_id,
        )
        return request
    except DeserializationError as e:
        logger.error(
            "Failed to parse PubSub message",
            error=str(e),
            message_id=message_id,
            error_type=type(e).__name__,
            decoded_data_type=type(decoded_data).__name__,
            has_keys=len(decoded_data.keys()) if isinstance(decoded_data, dict) else False,
        )
        raise ValidationError("Invalid pubsub message format", context={"error": str(e)}) from e


async def _handle_autofill_request(
    request: ResearchPlanAutofillRequest | ResearchDeepDiveAutofillRequest,
    session_maker: async_sessionmaker[Any],
) -> None:
    start_time = time.perf_counter()

    logger.info(
        "Starting autofill request processing",
        application_id=str(request.application_id),
        request_type=type(request).__name__,
        trace_id=request.trace_id,
    )

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
                elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )
            # Return early instead of raising an error - acknowledge the message
            # This handles stale Pub/Sub messages for deleted applications
            return

    logger.debug(
        "Found application for autofill",
        application_id=str(request.application_id),
        application_title=application.title,
        trace_id=request.trace_id,
        elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
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
        await handle_autofill_request(request=request, application=application, session_maker=session_maker)
        span.set_attribute("autofill.success", True)

    elapsed_time = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(
        "Completed autofill request processing",
        application_id=str(request.application_id),
        request_type=type(request).__name__,
        trace_id=request.trace_id,
        elapsed_ms=elapsed_time,
    )


async def _handle_grant_template_request(
    request: GrantTemplateRagRequest,
    session_maker: async_sessionmaker[Any],
) -> None:
    start_time = time.perf_counter()

    logger.info(
        "Starting grant template processing",
        template_id=str(request.parent_id),
        trace_id=request.trace_id,
    )

    async with session_maker() as session:
        grant_template = await session.scalar(select_active(GrantTemplate).where(GrantTemplate.id == request.parent_id))

        if not grant_template:
            logger.error(
                "Grant template not found",
                template_id=str(request.parent_id),
                trace_id=request.trace_id,
                elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )
            # Return early instead of raising an error - acknowledge the message
            # This handles stale Pub/Sub messages for deleted templates
            return

    logger.debug(
        "Found grant template for processing",
        template_id=str(request.parent_id),
        trace_id=request.trace_id,
        elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
    )

    await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=session_maker,
        trace_id=request.trace_id,
    )

    elapsed_time = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(
        "Completed grant template processing",
        template_id=str(request.parent_id),
        trace_id=request.trace_id,
        elapsed_ms=elapsed_time,
    )


async def _handle_grant_application_request(
    request: GrantApplicationRagRequest,
    session_maker: async_sessionmaker[Any],
) -> None:
    start_time = time.perf_counter()

    logger.info(
        "Starting grant application processing",
        application_id=str(request.parent_id),
        trace_id=request.trace_id,
    )

    async with session_maker() as session:
        grant_application = await session.scalar(
            select_active(GrantApplication)
            .where(GrantApplication.id == request.parent_id)
            .options(selectinload(GrantApplication.grant_template))
        )

        if not grant_application:
            logger.error(
                "Grant application not found",
                application_id=str(request.parent_id),
                trace_id=request.trace_id,
                elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )
            return

        if not grant_application.grant_template:
            logger.error(
                "Grant template not found for application",
                application_id=str(request.parent_id),
                trace_id=request.trace_id,
                elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )
            return

        if not grant_application.grant_template.grant_sections:
            logger.error(
                "Grant template has no sections",
                application_id=str(request.parent_id),
                template_id=str(grant_application.grant_template.id),
                trace_id=request.trace_id,
                elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )
            return

        if not grant_application.grant_template.cfp_analysis:
            logger.error(
                "CFP analysis is missing from grant template",
                application_id=str(request.parent_id),
                template_id=str(grant_application.grant_template.id),
                trace_id=request.trace_id,
                elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )
            return

    logger.debug(
        "Found grant application with valid template for processing",
        application_id=str(request.parent_id),
        application_title=grant_application.title,
        template_id=str(grant_application.grant_template.id),
        template_sections_count=len(grant_application.grant_template.grant_sections),
        research_objectives_count=len(grant_application.research_objectives or []),
        trace_id=request.trace_id,
        elapsed_ms=round((time.perf_counter() - start_time) * 1000, 2),
    )

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=session_maker,
        trace_id=request.trace_id,
    )

    elapsed_time = round((time.perf_counter() - start_time) * 1000, 2)
    logger.info(
        "Completed grant application processing",
        application_id=str(request.parent_id),
        trace_id=request.trace_id,
        elapsed_ms=elapsed_time,
    )


@post("/")
async def handle_request(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    request_start_time = time.perf_counter()
    message_id = data.message.message_id
    request: RagRequest | None = None

    logger.info(
        "Received RAG request",
        message_id=message_id,
        publish_time=data.message.publish_time,
    )

    try:
        request = handle_pubsub_message(data)

        logger.info(
            "Processing RAG request",
            request_type=type(request).__name__,
            trace_id=request.trace_id,
            message_id=message_id,
        )

        if isinstance(request, (ResearchPlanAutofillRequest, ResearchDeepDiveAutofillRequest)):
            await _handle_autofill_request(request, session_maker)
        elif isinstance(request, GrantTemplateRagRequest):
            await _handle_grant_template_request(request, session_maker)
        elif isinstance(request, GrantApplicationRagRequest):
            await _handle_grant_application_request(request, session_maker)
        else:
            logger.error(
                "Unknown request type received",
                request_type=type(request).__name__,
                trace_id=request.trace_id,
                message_id=message_id,
            )
            return

        elapsed_time = round((time.perf_counter() - request_start_time) * 1000, 2)
        logger.info(
            "Successfully processed RAG request",
            request_type=type(request).__name__,
            trace_id=request.trace_id,
            message_id=message_id,
            total_elapsed_ms=elapsed_time,
        )

    except RagJobCancelledError:
        elapsed_time = round((time.perf_counter() - request_start_time) * 1000, 2)
        logger.info(
            "RAG job cancelled",
            request_type=type(request).__name__ if request else "unknown",
            trace_id=request.trace_id if request else "unknown",
            message_id=message_id,
            elapsed_ms=elapsed_time,
        )
        return
    except ValidationError as e:
        elapsed_time = round((time.perf_counter() - request_start_time) * 1000, 2)
        logger.warning(
            "Validation error - acknowledging message to prevent retries",
            error=str(e),
            error_context=getattr(e, "context", None),
            request_type=type(request).__name__ if request else "unknown",
            trace_id=request.trace_id if request else "unknown",
            message_id=message_id,
            elapsed_ms=elapsed_time,
        )
        return
    except Exception as e:
        elapsed_time = round((time.perf_counter() - request_start_time) * 1000, 2)
        logger.error(
            "Unexpected error processing RAG request",
            error=str(e),
            error_type=type(e).__name__,
            request_type=type(request).__name__ if request else "unknown",
            trace_id=request.trace_id if request else "unknown",
            message_id=message_id,
            elapsed_ms=elapsed_time,
        )
        raise


async def before_server_start() -> None:
    logger.info("Starting RAG service initialization")

    try:
        init_llm_connection()
        logger.info("LLM connection initialized successfully")
    except Exception as e:
        logger.error(
            "Failed to initialize LLM connection",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise

    logger.info(
        "RAG service initialization completed",
        service_name="rag",
        application_stages=len(GRANT_APPLICATION_STAGES_ORDER),
        template_stages=len(GRANT_TEMPLATE_PIPELINE_STAGES),
    )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_request,
    ],
    on_startup=[before_server_start],
)
