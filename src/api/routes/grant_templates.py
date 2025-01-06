from typing import cast

from sanic import BadRequest, InternalServerError
from sanic.response import JSONResponse

from src.api_types import APIRequest, CreateGrantTemplateRequestBody
from src.dto import FileDTO
from src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from src.utils.extraction import extract_file_content, extract_webpage_content
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)


async def handle_create_grant_format(request: APIRequest) -> JSONResponse:
    """Route handler for creating a grant format.

    Args:
        request: The request object.

    Raises:
        BadRequest: If there are validation failures.
        InternalServerError: If there was an issue creating the grant format.

    Returns:
        The response object.
    """
    data = cast(str | None, (request.form or {}).get("data"))  # type: ignore[call-overload]
    if not data:
        raise BadRequest("Grant format creation requires a multipart request")

    request_body = deserialize(data, CreateGrantTemplateRequestBody)

    funding_organization_id = request_body.get("funding_organization_id")
    funding_organization_name = request_body.get("funding_organization_name")

    if not funding_organization_id and not funding_organization_name:
        raise BadRequest("Funding organization ID or name is required")

    cfp_url = request_body.get("cfp_url")
    uploaded_files: list[FileDTO] = [
        FileDTO.from_file(filename=filename, file=files_list)
        for filename, files_list in dict(request.files or {}).items()
        if files_list
    ]

    if not uploaded_files and not cfp_url:
        raise BadRequest("Either one file or a CFP URL is required")

    try:
        if cfp_url:
            cfp_content = await extract_webpage_content(url=cfp_url)
        else:
            file = uploaded_files[0]
            output, _ = await extract_file_content(
                content=file.content,
                mime_type=file.mime_type,
            )
            cfp_content = output if isinstance(output, str) else output["content"]

        logger.info("Creating grant template", cfp_content=cfp_content)
    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Error creating grant template", exc_info=e)
        raise InternalServerError(str(e)) from e
