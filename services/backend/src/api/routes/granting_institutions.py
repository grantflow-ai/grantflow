from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.tables import GrantingInstitution, GrantingInstitutionSource
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import func, insert, select, update
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
    source_count: int
    created_at: str
    updated_at: str


@post("/granting-institutions", requires_backoffice_admin=True, operation_id="CreateGrantingInstitution")
async def handle_create_organization(
    data: CreateOrganizationRequestBody, session_maker: async_sessionmaker[Any]
) -> GrantingInstitutionResponse:
    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(insert(GrantingInstitution).values(data).returning(GrantingInstitution))
        except SQLAlchemyError as e:
            logger.error("Error creating granting institution", exc_info=e)
            raise DatabaseError("Error creating granting institution", context=str(e)) from e

    return GrantingInstitutionResponse(
        id=organization.id,
        full_name=organization.full_name,
        abbreviation=organization.abbreviation,
        source_count=0,
        created_at=organization.created_at.isoformat(),
        updated_at=organization.updated_at.isoformat(),
    )


@get("/granting-institutions", requires_backoffice_admin=True, operation_id="ListGrantingInstitutions")
async def handle_retrieve_organizations(
    session_maker: async_sessionmaker[Any],
) -> list[GrantingInstitutionResponse]:
    async with session_maker() as session:
        source_count_subquery = (
            select(
                GrantingInstitutionSource.granting_institution_id,
                func.count(GrantingInstitutionSource.rag_source_id).label("source_count"),
            )
            .group_by(GrantingInstitutionSource.granting_institution_id)
            .subquery()
        )

        result = await session.execute(
            select(
                GrantingInstitution,
                func.coalesce(source_count_subquery.c.source_count, 0).label("source_count"),
            )
            .outerjoin(
                source_count_subquery,
                GrantingInstitution.id == source_count_subquery.c.granting_institution_id,
            )
            .where(GrantingInstitution.deleted_at.is_(None))
            .order_by(GrantingInstitution.full_name.asc())
        )

        return [
            GrantingInstitutionResponse(
                id=str(row[0].id),
                full_name=row[0].full_name,
                abbreviation=row[0].abbreviation,
                source_count=int(row[1]),
                created_at=row[0].created_at.isoformat(),
                updated_at=row[0].updated_at.isoformat(),
            )
            for row in result.all()
        ]


@get(
    "/granting-institutions/{organization_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="GetGrantingInstitution",
)
async def handle_get_organization(
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> GrantingInstitutionResponse:
    async with session_maker() as session:
        result = await session.execute(
            select(
                GrantingInstitution,
                func.count(GrantingInstitutionSource.rag_source_id).label("source_count"),
            )
            .outerjoin(
                GrantingInstitutionSource,
                GrantingInstitution.id == GrantingInstitutionSource.granting_institution_id,
            )
            .where(
                GrantingInstitution.id == organization_id,
                GrantingInstitution.deleted_at.is_(None),
            )
            .group_by(GrantingInstitution.id)
        )

        row = result.one_or_none()
        if not row:
            raise ValidationException("Granting institution not found")

        organization, source_count = row

        return GrantingInstitutionResponse(
            id=str(organization.id),
            full_name=organization.full_name,
            abbreviation=organization.abbreviation,
            source_count=int(source_count),
            created_at=organization.created_at.isoformat(),
            updated_at=organization.updated_at.isoformat(),
        )


@patch(
    "/granting-institutions/{organization_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="UpdateGrantingInstitution",
)
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
        except SQLAlchemyError as e:
            logger.error("Error updating granting institution", exc_info=e)
            raise DatabaseError("Error updating granting institution", context=str(e)) from e

        source_count = await session.scalar(
            select(func.count(GrantingInstitutionSource.rag_source_id)).where(
                GrantingInstitutionSource.granting_institution_id == organization_id
            )
        )

    return GrantingInstitutionResponse(
        id=str(organization.id),
        full_name=organization.full_name,
        abbreviation=organization.abbreviation,
        source_count=source_count or 0,
        created_at=organization.created_at.isoformat(),
        updated_at=organization.updated_at.isoformat(),
    )


@delete(
    "/granting-institutions/{organization_id:uuid}",
    requires_backoffice_admin=True,
    operation_id="DeleteGrantingInstitution",
)
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

        except SQLAlchemyError as e:
            logger.error("Error deleting granting institution", exc_info=e)
            raise DatabaseError("Error deleting granting institution", context=str(e)) from e
