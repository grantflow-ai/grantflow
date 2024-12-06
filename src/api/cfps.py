import logging
from http import HTTPStatus

from sanic import HTTPResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.api_types import APIRequest, CfpResponse
from src.constants import CONTENT_TYPE_JSON
from src.db.tables import GrantCfp
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)


async def handle_retrieve_cfps(request: APIRequest) -> HTTPResponse:
    """Route handler for retrieving CFPS for a user.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    logger.info("Retrieving CFPS")

    async with request.ctx.session_maker() as session, session.begin():
        cfps = list(await session.scalars(select(GrantCfp).options(selectinload(GrantCfp.funding_organization))))

    return HTTPResponse(
        status=HTTPStatus.OK,
        body=serialize(
            [
                CfpResponse(
                    id=cfp.id,
                    allow_clinical_trials=cfp.allow_clinical_trials,
                    allow_resubmissions=cfp.allow_resubmissions,
                    category=cfp.category,
                    code=cfp.code,
                    description=cfp.description,
                    title=cfp.title,
                    url=cfp.url,
                    funding_organization_id=cfp.funding_organization_id,
                    funding_organization_name=cfp.funding_organization.name,
                )
                for cfp in cfps
            ]
        ),
        content_type=CONTENT_TYPE_JSON,
    )
