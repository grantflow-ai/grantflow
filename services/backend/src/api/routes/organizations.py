from typing import Any, NotRequired, TypedDict
from uuid import UUID

from google.cloud import firestore
from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationUser
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest, TableIdResponse
from services.backend.src.utils.firebase import schedule_organization_deletion

logger = get_logger(__name__)


class CreateOrganizationRequestBody(TypedDict):
    name: str
    description: NotRequired[str | None]
    logo_url: NotRequired[str | None]
    contact_email: NotRequired[str | None]
    contact_person_name: NotRequired[str | None]
    institutional_affiliation: NotRequired[str | None]


class UpdateOrganizationRequestBody(TypedDict):
    name: NotRequired[str]
    description: NotRequired[str | None]
    logo_url: NotRequired[str | None]
    contact_email: NotRequired[str | None]
    contact_person_name: NotRequired[str | None]
    institutional_affiliation: NotRequired[str | None]


class OrganizationResponse(TypedDict):
    id: str
    name: str
    description: str | None
    logo_url: str | None
    contact_email: str | None
    contact_person_name: str | None
    institutional_affiliation: str | None
    role: UserRoleEnum
    created_at: str
    updated_at: str


class OrganizationListItemResponse(TypedDict):
    id: str
    name: str
    description: str | None
    logo_url: str | None
    role: UserRoleEnum
    projects_count: int
    members_count: int


class DeleteOrganizationResponse(TypedDict):
    message: str
    scheduled_deletion_date: str
    grace_period_days: int
    restoration_info: str



ORGANIZATION_DELETION_GRACE_PERIOD_DAYS = 30


@post("/organizations", operation_id="CreateOrganization")
async def handle_create_organization(
    request: APIRequest,
    data: CreateOrganizationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> TableIdResponse:
    logger.info("Creating organization", uid=request.auth)
    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(insert(Organization).values(data).returning(Organization))

            
            await session.execute(
                insert(OrganizationUser).values(
                    {
                        "organization_id": organization.id,
                        "firebase_uid": request.auth,
                        "role": UserRoleEnum.OWNER,
                        "has_all_projects_access": True,
                    }
                )
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating organization", exc_info=e)
            raise DatabaseError("Error creating organization", context=str(e)) from e

    return TableIdResponse(id=str(organization.id))


@get("/organizations", operation_id="ListOrganizations")
async def handle_list_organizations(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> list[OrganizationListItemResponse]:
    logger.info("Listing organizations for user", uid=request.auth)

    async with session_maker() as session:
        
        organizations = list(
            await session.scalars(
                select(Organization)
                .join(OrganizationUser)
                .where(OrganizationUser.firebase_uid == request.auth)
                .where(Organization.deleted_at.is_(None))  
            )
        )

    return [
        OrganizationListItemResponse(
            id=str(org.id),
            name=org.name,
            description=org.description,
            logo_url=org.logo_url,
            role=next(
                (ou.role for ou in org.organization_users if ou.firebase_uid == request.auth),
                UserRoleEnum.COLLABORATOR,
            ),
            projects_count=len([p for p in org.projects if not p.deleted_at]),
            members_count=len([ou for ou in org.organization_users if not ou.deleted_at]),
        )
        for org in organizations
    ]


@get("/organizations/{organization_id:uuid}", operation_id="GetOrganization")
async def handle_get_organization(
    request: APIRequest,
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> OrganizationResponse:
    logger.info("Getting organization", organization_id=organization_id, uid=request.auth)

    async with session_maker() as session:
        organization = await session.scalar(
            select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
        )

        if not organization:
            raise ValidationException("Organization not found")

        
        user_org = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization_id)
            .where(OrganizationUser.firebase_uid == request.auth)
        )

        if not user_org:
            raise ValidationException("You are not a member of this organization")

    return OrganizationResponse(
        id=str(organization.id),
        name=organization.name,
        description=organization.description,
        logo_url=organization.logo_url,
        contact_email=organization.contact_email,
        contact_person_name=organization.contact_person_name,
        institutional_affiliation=organization.institutional_affiliation,
        role=user_org.role,
        created_at=organization.created_at.isoformat(),
        updated_at=organization.updated_at.isoformat(),
    )


@patch(
    "/organizations/{organization_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateOrganization",
)
async def handle_update_organization(
    request: APIRequest,
    organization_id: UUID,
    data: UpdateOrganizationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> OrganizationResponse:
    logger.info("Updating organization", organization_id=organization_id, uid=request.auth)

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                update(Organization)
                .where(Organization.id == organization_id)
                .where(Organization.deleted_at.is_(None))
                .values(data)
                .returning(Organization)
            )

            if not organization:
                raise ValidationException("Organization not found")

            
            user_org = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == request.auth)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating organization", exc_info=e)
            raise DatabaseError("Error updating organization", context=str(e)) from e

    return OrganizationResponse(
        id=str(organization.id),
        name=organization.name,
        description=organization.description,
        logo_url=organization.logo_url,
        contact_email=organization.contact_email,
        contact_person_name=organization.contact_person_name,
        institutional_affiliation=organization.institutional_affiliation,
        role=user_org.role,
        created_at=organization.created_at.isoformat(),
        updated_at=organization.updated_at.isoformat(),
    )


@delete(
    "/organizations/{organization_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER],
    operation_id="DeleteOrganization",
)
async def handle_delete_organization(
    request: APIRequest,
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> DeleteOrganizationResponse:
    logger.info("Deleting organization", organization_id=organization_id, uid=request.auth)

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )

            if not organization:
                raise ValidationException("Organization not found")

            
            organization.soft_delete()

            
            await session.execute(
                sa_delete(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.role != UserRoleEnum.OWNER)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting organization", exc_info=e)
            raise DatabaseError("Error deleting organization", context=str(e)) from e

    
    try:
        deletion_data = await schedule_organization_deletion(
            str(organization_id), ORGANIZATION_DELETION_GRACE_PERIOD_DAYS
        )

        logger.info(
            "Organization deletion scheduled",
            organization_id=organization_id,
            deletion_date=deletion_data["scheduled_hard_delete_at"].isoformat(),
        )

        return DeleteOrganizationResponse(
            message="Organization scheduled for deletion. All members except owners have been removed.",
            scheduled_deletion_date=deletion_data["scheduled_hard_delete_at"].isoformat() + "Z",
            grace_period_days=deletion_data["grace_period_days"],
            restoration_info=f"Contact support within {deletion_data['grace_period_days']} days to restore your organization",
        )
    except Exception as e:
        logger.error("Error scheduling organization deletion", exc_info=e)
        raise DatabaseError("Error scheduling organization deletion", context=str(e)) from e


@post(
    "/organizations/{organization_id:uuid}/restore",
    allowed_roles=[UserRoleEnum.OWNER],
    operation_id="RestoreOrganization",
)
async def handle_restore_organization(
    request: APIRequest,
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> OrganizationResponse:
    logger.info("Restoring organization", organization_id=organization_id, uid=request.auth)

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(select(Organization).where(Organization.id == organization_id))

            if not organization:
                raise ValidationException("Organization not found")

            if not organization.deleted_at:
                raise ValidationException("Organization is not deleted")

            
            organization.restore()

            
            user_org = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == request.auth)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error restoring organization", exc_info=e)
            raise DatabaseError("Error restoring organization", context=str(e)) from e

    
    try:
        db = firestore.AsyncClient()
        await (
            db.collection("organization-deletion-requests")
            .document(str(organization_id))
            .update(
                {
                    "status": "cancelled",
                    "cancelled_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                }
            )
        )

        logger.info("Organization deletion cancelled", organization_id=organization_id)
    except Exception as e:
        logger.warning("Failed to cancel organization deletion in Firestore", exc_info=e)

    return OrganizationResponse(
        id=str(organization.id),
        name=organization.name,
        description=organization.description,
        logo_url=organization.logo_url,
        contact_email=organization.contact_email,
        contact_person_name=organization.contact_person_name,
        institutional_affiliation=organization.institutional_affiliation,
        role=user_org.role,
        created_at=organization.created_at.isoformat(),
        updated_at=organization.updated_at.isoformat(),
    )
