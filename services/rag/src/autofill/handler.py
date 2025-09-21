import time
from typing import Any

from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import ResearchDeepDiveAutofillRequest, ResearchPlanAutofillRequest
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.research_deep_dive_handler import generate_research_deep_dive_content
from services.rag.src.autofill.research_plan_handler import generate_research_plan_content
from services.rag.src.utils.checks import verify_rag_sources_indexed

logger = get_logger(__name__)


async def handle_autofill_request(
    request: ResearchPlanAutofillRequest | ResearchDeepDiveAutofillRequest, session_maker: async_sessionmaker[Any]
) -> list[ResearchObjective] | ResearchDeepDive:
    trace_id = request.trace_id

    start_time = time.time()
    logger.info(
        "Starting autofill request",
        request_type=type(request).__name__,
        application_id=str(request.application_id),
        trace_id=trace_id,
    )

    await verify_rag_sources_indexed(
        parent_id=request.application_id,
        session_maker=session_maker,
        entity_type=GrantApplication,
        trace_id=trace_id,
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
                trace_id=trace_id,
            )
            raise ValidationError(
                f"Grant application {request.application_id} not found or has been deleted",
                context={
                    "application_id": str(request.application_id),
                    "request_type": type(request).__name__,
                    "trace_id": trace_id,
                },
            )

    try:
        if isinstance(request, ResearchPlanAutofillRequest):
            logger.info(
                "Generating research plan content",
                application_id=str(application.id),
                application_title=application.title,
                trace_id=trace_id,
            )
            result = await generate_research_plan_content(application=application, trace_id=trace_id)
            duration = time.time() - start_time
            logger.info(
                "Research plan generation completed",
                application_id=str(application.id),
                objectives_count=len(result),
                duration_seconds=round(duration, 2),
                trace_id=trace_id,
            )
            return result
        logger.info(
            "Generating research deep dive content",
            application_id=str(application.id),
            application_title=application.title,
            trace_id=trace_id,
        )
        deep_dive_result = await generate_research_deep_dive_content(application=application, trace_id=trace_id)
        duration = time.time() - start_time
        logger.info(
            "Research deep dive generation completed",
            application_id=str(application.id),
            fields_count=len(deep_dive_result),
            duration_seconds=round(duration, 2),
            trace_id=trace_id,
        )
        return deep_dive_result
    except ValidationError:
        logger.error(
            "Autofill request failed with validation error",
            request_type=type(request).__name__,
            application_id=str(request.application_id),
            trace_id=trace_id,
        )
        raise
    except Exception as e:
        logger.error(
            "Autofill request failed with unexpected error",
            request_type=type(request).__name__,
            application_id=str(request.application_id),
            error=str(e),
            error_type=type(e).__name__,
            trace_id=trace_id,
        )
        raise ValidationError(
            f"Autofill request failed: {e!s}",
            context={
                "request_type": type(request).__name__,
                "application_id": str(request.application_id),
                "error_type": type(e).__name__,
                "trace_id": trace_id,
            },
        ) from e
