from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import FundingOrganization
from src.exceptions import DatabaseError
from src.utils.logger import get_logger

logger = get_logger(__name__)


class CreateOrganizationRequestBody(TypedDict):
    """The request body for creating a funding organization."""

    full_name: str
    abbreviation: str | None


class UpdateOrganizationRequestBody(TypedDict):
    """The request body for updating a funding organization."""

    full_name: NotRequired[str]
    abbreviation: NotRequired[str | None]


class FundingOrganizationResponse(TypedDict):
    """The response schema for a funding organization."""

    id: str
    """The ID of the funding organization."""
    full_name: str
    """The full name of the funding organization."""
    abbreviation: str | None


@post("/organizations", operation_id="CreateOrganization")
async def handle_create_organization(
    data: CreateOrganizationRequestBody, session_maker: async_sessionmaker[Any]
) -> FundingOrganizationResponse:
    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(insert(FundingOrganization).values(data).returning(FundingOrganization))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating funding organization", exc_info=e)
            raise DatabaseError("Error creating funding organization", context=str(e)) from e

    return FundingOrganizationResponse(
        id=organization.id,
        full_name=organization.full_name,
        abbreviation=organization.abbreviation,
    )


@get("/organizations", operation_id="ListOrganizations")
async def handle_retrieve_organizations(session_maker: async_sessionmaker[Any]) -> list[FundingOrganizationResponse]:
    async with session_maker() as session:
        return [
            FundingOrganizationResponse(
                id=organization.id, full_name=organization.full_name, abbreviation=organization.abbreviation
            )
            for organization in await session.scalars(
                select(FundingOrganization).order_by(FundingOrganization.full_name.asc())
            )
        ]


@patch("/organizations/{organization_id:uuid}", operation_id="UpdateOrganization")
async def handle_update_organization(
    data: UpdateOrganizationRequestBody, organization_id: UUID, session_maker: async_sessionmaker[Any]
) -> FundingOrganizationResponse:
    if not data:
        raise ValidationException("Request body is empty")

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                update(FundingOrganization)
                .values(data)
                .returning(FundingOrganization)
                .where(FundingOrganization.id == organization_id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating funding organization", exc_info=e)
            raise DatabaseError("Error updating funding organization", context=str(e)) from e

    return FundingOrganizationResponse(
        id=organization.id,
        full_name=organization.full_name,
        abbreviation=organization.abbreviation,
    )


@delete("/organizations/{organization_id:uuid}", operation_id="DeleteOrganization")
async def handle_delete_organization(organization_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                sa_delete(FundingOrganization)
                .returning(FundingOrganization)
                .where(FundingOrganization.id == organization_id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting funding organization", exc_info=e)
            raise DatabaseError("Error deleting funding organization", context=str(e)) from e
