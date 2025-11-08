import traceback
from typing import Any

import msgspec
from packages.db.src.json_objects import ResearchDeepDive
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    DatabaseError,
    DeserializationError,
    InsufficientContextError,
    LLMTimeoutError,
    RagError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import (
    ResearchDeepDiveAutofillRequest,
    ResearchPlanAutofillRequest,
    publish_notification,
)
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.research_deep_dive_handler import generate_research_deep_dive_content
from services.rag.src.autofill.research_plan_handler import generate_research_plan_content
from services.rag.src.utils.checks import verify_rag_sources_indexed

logger = get_logger(__name__)


def _get_autofill_error_details(error: BackendError) -> tuple[str, str]:
    if isinstance(error, InsufficientContextError):
        return (
            "The uploaded documents don't contain sufficient information for autofill. Please upload more research documents or refine your research objectives.",
            NotificationEvents.INSUFFICIENT_CONTEXT_ERROR,
        )
    if isinstance(error, ValidationError) and "indexing timeout" in str(error):
        return (
            "Document indexing is taking longer than expected. Please wait a few minutes and try again.",
            NotificationEvents.INDEXING_TIMEOUT,
        )
    if isinstance(error, ValidationError) and "indexing failed" in str(error).lower():
        return (
            "Document indexing failed. Please upload new documents and try again.",
            NotificationEvents.INDEXING_FAILED,
        )
    if isinstance(error, LLMTimeoutError):
        return (
            "AI processing took longer than expected. The request will be retried automatically. Please wait a moment and check back.",
            NotificationEvents.LLM_TIMEOUT,
        )
    if isinstance(error, DatabaseError):
        return (
            "Database error occurred while saving your autofill results. Please try again.",
            NotificationEvents.PIPELINE_ERROR,
        )
    if isinstance(error, RagError):
        return (
            "Document processing error occurred during autofill. Please try again or upload different documents.",
            NotificationEvents.PIPELINE_ERROR,
        )
    if isinstance(error, DeserializationError):
        return (
            "Data processing error occurred during autofill. Please try again.",
            NotificationEvents.PIPELINE_ERROR,
        )
    return (
        "An unexpected error occurred while generating autofill content. Please try again or contact support if this persists.",
        NotificationEvents.PIPELINE_ERROR,
    )


async def _save_research_plan_to_database(
    research_objectives: list[Any],
    application_id: Any,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    try:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(GrantApplication)
                .where(GrantApplication.id == application_id)
                .values(research_objectives=research_objectives)
            )

        logger.info(
            "Successfully saved research plan to database",
            application_id=str(application_id),
            objectives_count=len(research_objectives),
            trace_id=trace_id,
        )
    except SQLAlchemyError as e:
        logger.error(
            "Failed to save research plan to database",
            application_id=str(application_id),
            sql_error=str(e),
            trace_id=trace_id,
        )
        raise DatabaseError(
            "Failed to save research plan to database",
            context={"application_id": str(application_id), "sql_error": str(e)},
        ) from e


async def _save_research_deep_dive_to_database(
    research_deep_dive: ResearchDeepDive,
    application_id: Any,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    try:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(GrantApplication)
                .where(GrantApplication.id == application_id)
                .values(form_inputs=research_deep_dive)
            )

        fields_dict = (
            msgspec.structs.asdict(research_deep_dive)
            if isinstance(research_deep_dive, msgspec.Struct)
            else research_deep_dive
        )
        logger.info(
            "Successfully saved research deep dive to database",
            application_id=str(application_id),
            fields_count=len([k for k, v in fields_dict.items() if v and not str(v).startswith("[Failed")]),
            trace_id=trace_id,
        )
    except SQLAlchemyError as e:
        logger.error(
            "Failed to save research deep dive to database",
            application_id=str(application_id),
            sql_error=str(e),
            trace_id=trace_id,
        )
        raise DatabaseError(
            "Failed to save research deep dive to database",
            context={"application_id": str(application_id), "sql_error": str(e)},
        ) from e


async def _send_autofill_success_notification(
    application_id: Any,
    autofill_type: str,
    trace_id: str,
    **extra_data: Any,
) -> None:
    try:
        await publish_notification(
            parent_id=application_id,
            event=NotificationEvents.AUTOFILL_COMPLETED,
            trace_id=trace_id,
            data={
                "message": f"{autofill_type.replace('_', ' ').title()} autofill completed successfully",
                "notification_type": "success",
                "autofill_type": autofill_type,
                **extra_data,
            },
        )
    except SQLAlchemyError as e:
        logger.error(
            "Failed to send autofill success notification",
            application_id=str(application_id),
            sql_error=str(e),
            trace_id=trace_id,
        )
        raise DatabaseError("Failed to send autofill success notification") from e


async def _handle_autofill_error(
    error: BackendError,
    application_id: Any,
    request: ResearchPlanAutofillRequest | ResearchDeepDiveAutofillRequest,
    trace_id: str,
) -> None:
    error_traceback = traceback.format_exc()
    error_context = getattr(error, "context", None)
    request_type = type(request).__name__

    logger.error(
        "Backend error during autofill processing",
        error=error,
        error_type=type(error).__name__,
        error_message=str(error),
        application_id=str(application_id),
        request_type=request_type,
        trace_id=trace_id,
        error_context=error_context,
        error_traceback=error_traceback,
    )

    user_message, event_type = _get_autofill_error_details(error)
    autofill_type = "research_plan" if isinstance(request, ResearchPlanAutofillRequest) else "research_deep_dive"

    try:
        await publish_notification(
            parent_id=application_id,
            event=event_type,
            trace_id=trace_id,
            data={
                "message": user_message,
                "notification_type": "error" if event_type == NotificationEvents.PIPELINE_ERROR else "warning",
                "autofill_type": autofill_type,
                "error_type": error.__class__.__name__,
                "recoverable": event_type not in [NotificationEvents.PIPELINE_ERROR],
                "retryable": event_type in [NotificationEvents.INDEXING_TIMEOUT, NotificationEvents.LLM_TIMEOUT],
            },
        )
    except SQLAlchemyError as e:
        logger.warning(
            "Failed to send error notification for autofill failure",
            application_id=str(application_id),
            sql_error=str(e),
            original_error=str(error),
            trace_id=trace_id,
        )


async def handle_autofill_request(
    request: ResearchPlanAutofillRequest | ResearchDeepDiveAutofillRequest,
    application: GrantApplication,
    session_maker: async_sessionmaker[Any],
) -> None:
    trace_id = request.trace_id
    application_id = application.id
    request_type = type(request).__name__

    logger.info(
        "Starting autofill content generation",
        application_id=str(application_id),
        request_type=request_type,
        trace_id=trace_id,
    )

    try:
        await verify_rag_sources_indexed(
            parent_id=application.id,
            session_maker=session_maker,
            entity_type=GrantApplication,
            trace_id=trace_id,
        )

        if isinstance(request, ResearchPlanAutofillRequest):
            logger.debug(
                "Generating research plan content",
                application_id=str(application_id),
                trace_id=trace_id,
            )
            research_objectives = await generate_research_plan_content(application=application, trace_id=trace_id)

            logger.info(
                "Research plan content generated successfully",
                application_id=str(application_id),
                objectives_count=len(research_objectives),
                trace_id=trace_id,
            )

            await _save_research_plan_to_database(research_objectives, application_id, session_maker, trace_id)
            await _send_autofill_success_notification(
                application_id, "research_plan", trace_id, objectives_count=len(research_objectives)
            )

        else:
            logger.debug(
                "Generating research deep dive content",
                application_id=str(application_id),
                trace_id=trace_id,
            )
            research_deep_dive = await generate_research_deep_dive_content(application=application, trace_id=trace_id)

            fields_dict = (
                msgspec.structs.asdict(research_deep_dive)
                if isinstance(research_deep_dive, msgspec.Struct)
                else research_deep_dive
            )
            logger.info(
                "Research deep dive content generated successfully",
                application_id=str(application_id),
                fields_count=len([k for k, v in fields_dict.items() if v and not str(v).startswith("[Failed")]),
                trace_id=trace_id,
            )

            await _save_research_deep_dive_to_database(research_deep_dive, application_id, session_maker, trace_id)
            fields_generated = len([k for k, v in fields_dict.items() if v and not str(v).startswith("[Failed")])
            await _send_autofill_success_notification(
                application_id, "research_deep_dive", trace_id, fields_generated=fields_generated
            )

    except BackendError as error:
        await _handle_autofill_error(error, application_id, request, trace_id)
        raise
