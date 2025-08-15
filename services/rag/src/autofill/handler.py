from typing import Any

from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.dto import AutofillRequestDTO, AutofillResponseDTO

from .research_deep_dive_handler import handle_research_deep_dive
from .research_plan_handler import handle_research_plan


async def handle_autofill_request(
    request: AutofillRequestDTO, session_maker: async_sessionmaker[Any], logger: Any
) -> AutofillResponseDTO:
    autofill_type = request["autofill_type"]

    if autofill_type == "research_plan":
        return await handle_research_plan(request, session_maker, logger)
    if autofill_type == "research_deep_dive":
        return await handle_research_deep_dive(request, session_maker, logger)

    error_response: AutofillResponseDTO = {
        "success": False,
        "data": {},
        "error": f"Unknown autofill type: {autofill_type}",
    }
    if field_name := request.get("field_name"):
        error_response["field_name"] = field_name
    return error_response
