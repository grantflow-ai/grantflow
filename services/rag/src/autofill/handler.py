from typing import Any

from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.pubsub import AutofillRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from packages.db.src.query_helpers import select_active

from services.rag.src.autofill.research_deep_dive_handler import generate_research_deep_dive_content
from services.rag.src.autofill.research_plan_handler import generate_research_plan_content
from services.rag.src.utils.checks import verify_rag_sources_indexed


async def handle_autofill_request(
    request: AutofillRequest, session_maker: async_sessionmaker[Any]
) -> list[ResearchObjective] | ResearchDeepDive:
    trace_id = request.get("trace_id", "")

    await verify_rag_sources_indexed(
        parent_id=request["application_id"],
        session_maker=session_maker,
        entity_type=GrantApplication,
        trace_id=trace_id,
    )

    async with session_maker() as session:
        application = await session.scalar(
            select_active(GrantApplication).where(GrantApplication.id == request["application_id"])
        )

    if request["autofill_type"] == "research_plan":
        return await generate_research_plan_content(application=application, trace_id=trace_id)
    return await generate_research_deep_dive_content(application=application, trace_id=trace_id)
