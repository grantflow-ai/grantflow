import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, json

from src.api.api_types import APIRequest
from src.api.utils import create_application_draft, verify_workspace_access

logger = logging.getLogger(__name__)


async def handle_create_application_draft(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for generating a Grant Application Draft.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)
    result = await create_application_draft(request=request, application_id=application_id)
    return json(
        result,
        status=HTTPStatus.CREATED,
    )
