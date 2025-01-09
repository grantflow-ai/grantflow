from http import HTTPStatus
from uuid import UUID

from sanic import BadRequest, empty, json
from sanic.response import HTTPResponse, JSONResponse
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import SQLAlchemyError

from src.api_types import APIRequest, CreateOrganizationRequestBody
from src.db.tables import FundingOrganization
from src.exceptions import DatabaseError
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)


async def handle_create_organization(request: APIRequest) -> JSONResponse:
    """Route handler for creating a Funding Organization.

    Args:
        request: The request object.

    Raises:
        DatabaseError: If there was an issue creating the funding organization in the database.

    Returns:
        The response object.
    """
    request_body = deserialize(request.body, CreateOrganizationRequestBody)

    async with request.ctx.session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                insert(FundingOrganization).values(request_body).returning(FundingOrganization)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating funding organization", exc_info=e)
            raise DatabaseError("Error creating funding organization", context=str(e)) from e

    return json(
        organization,
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_organizations(request: APIRequest) -> JSONResponse:
    """Route handler for retrieving all Funding Organizations.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    async with request.ctx.session_maker() as session:
        organizations = list(
            await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc()))
        )

    return json(organizations)


async def handle_update_organization(request: APIRequest, organization_id: UUID) -> JSONResponse:
    """Route handler for updating a Funding Organization.

    Args:
        request: The request object.
        organization_id: The organization ID.

    Raises:
        DatabaseError: If there was an issue updating the funding organization in the database.
        BadRequest: If the request is not a multipart request.

    Returns:
        The response object.
    """
    request_body = deserialize(request.body, CreateOrganizationRequestBody)
    if not request_body:
        raise BadRequest("Request body is empty")

    async with request.ctx.session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                update(FundingOrganization)
                .values(request_body)
                .returning(FundingOrganization)
                .where(FundingOrganization.id == organization_id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating funding organization", exc_info=e)
            raise DatabaseError("Error updating funding organization", context=str(e)) from e

    return json(
        organization,
        status=HTTPStatus.CREATED,
    )


async def handle_delete_organization(request: APIRequest, organization_id: UUID) -> HTTPResponse:
    """Route handler for deleting a Funding Organization.

    Args:
        request: The request object.
        organization_id: The organization ID.

    Raises:
        DatabaseError: If there was an issue deleting the funding organization from the database.

    Returns:
        The response object.
    """
    async with request.ctx.session_maker() as session, session.begin():
        try:
            await session.execute(
                delete(FundingOrganization)
                .returning(FundingOrganization)
                .where(FundingOrganization.id == organization_id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting funding organization", exc_info=e)
            raise DatabaseError("Error deleting funding organization", context=str(e)) from e

    return empty()
