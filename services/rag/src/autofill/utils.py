from typing import Any

from packages.shared_utils.src.logger import get_logger

from services.rag.src.dto import AutofillRequestDTO, AutofillResponseDTO

logger = get_logger(__name__)


async def create_error_response(
    request: AutofillRequestDTO, error: Exception, application_id: str, autofill_type: str
) -> AutofillResponseDTO:
    logger.exception("Autofill generation failed", request_id=application_id, autofill_type=autofill_type)

    response: AutofillResponseDTO = {"success": False, "data": {}, "error": str(error)}
    if field_name := request.get("field_name"):
        response["field_name"] = field_name
    return response


async def create_success_response(request: AutofillRequestDTO, result: dict[str, Any]) -> AutofillResponseDTO:
    response: AutofillResponseDTO = {
        "success": True,
        "data": result,
    }
    if field_name := request.get("field_name"):
        response["field_name"] = field_name
    return response
