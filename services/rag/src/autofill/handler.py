from typing import Any

from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import ResearchDeepDiveAutofillRequest, ResearchPlanAutofillRequest
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.autofill.research_deep_dive_handler import generate_research_deep_dive_content
from services.rag.src.autofill.research_plan_handler import generate_research_plan_content
from services.rag.src.utils.checks import verify_rag_sources_indexed

logger = get_logger(__name__)


async def handle_autofill_request(
    request: ResearchPlanAutofillRequest | ResearchDeepDiveAutofillRequest,
    application: GrantApplication,
    session_maker: async_sessionmaker[Any],
) -> list[ResearchObjective] | ResearchDeepDive:
    trace_id = request.trace_id

    await verify_rag_sources_indexed(
        parent_id=application.id,
        session_maker=session_maker,
        entity_type=GrantApplication,
        trace_id=trace_id,
    )

    if isinstance(request, ResearchPlanAutofillRequest):
        return await generate_research_plan_content(application=application, trace_id=trace_id)
    return await generate_research_deep_dive_content(application=application, trace_id=trace_id)
