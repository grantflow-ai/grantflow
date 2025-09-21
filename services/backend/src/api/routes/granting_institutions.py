from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.tables import GrantingInstitution
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class CreateOrganizationRequestBody(TypedDict):
    full_name: str
    abbreviation: str | None


class UpdateOrganizationRequestBody(TypedDict):
    full_name: NotRequired[str]
    abbreviation: NotRequired[str | None]


class GrantingInstitutionResponse(TypedDict):
    id: str
    full_name: str
    abbreviation: str | None


@post("/granting-institutions", operation_id="CreateGrantingInstitution")
async def handle_create_organization(
    data: CreateOrganizationRequestBody, session_maker: async_sessionmaker[Any]
) -> GrantingInstitutionResponse:
    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(insert(GrantingInstitution).values(data).returning(GrantingInstitution))
            await session.commit()
        except SQLAlchemyError as e:
            logger.error("Error creating granting institution", exc_info=e)
            raise DatabaseError("Error creating granting institution", context=str(e)) from e

    return GrantingInstitutionResponse(
        id=organization.id,
        full_name=organization.full_name,
        abbreviation=organization.abbreviation,
    )


@get("/granting-institutions", operation_id="ListGrantingInstitutions")
async def handle_retrieve_organizations(
    session_maker: async_sessionmaker[Any],
) -> list[GrantingInstitutionResponse]:
    async with session_maker() as session:
        return [
            GrantingInstitutionResponse(
                id=organization.id,
                full_name=organization.full_name,
                abbreviation=organization.abbreviation,
            )
            for organization in await session.scalars(
                select(GrantingInstitution)
                .where(GrantingInstitution.deleted_at.is_(None))
                .order_by(GrantingInstitution.full_name.asc())
            )
        ]


@patch("/granting-institutions/{organization_id:uuid}", operation_id="UpdateGrantingInstitution")
async def handle_update_organization(
    data: UpdateOrganizationRequestBody,
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> GrantingInstitutionResponse:
    if not data:
        raise ValidationException("Request body is empty")

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                update(GrantingInstitution)
                .values(data)
                .returning(GrantingInstitution)
                .where(GrantingInstitution.id == organization_id, GrantingInstitution.deleted_at.is_(None))
            )
            await session.commit()
        except SQLAlchemyError as e:
            logger.error("Error updating granting institution", exc_info=e)
            raise DatabaseError("Error updating granting institution", context=str(e)) from e

    return GrantingInstitutionResponse(
        id=organization.id,
        full_name=organization.full_name,
        abbreviation=organization.abbreviation,
    )


@delete("/granting-institutions/{organization_id:uuid}", operation_id="DeleteGrantingInstitution")
async def handle_delete_organization(organization_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    async with session_maker() as session, session.begin():
        try:
            institution = await session.scalar(
                select(GrantingInstitution).where(
                    GrantingInstitution.id == organization_id,
                    GrantingInstitution.deleted_at.is_(None),
                )
            )
            if not institution:
                raise ValidationException("Granting institution not found")

            institution.soft_delete()
            await session.commit()

            # Successfully soft deleted granting institution
        except SQLAlchemyError as e:
            logger.error("Error deleting granting institution", exc_info=e)
            raise DatabaseError("Error deleting granting institution", context=str(e)) from e
