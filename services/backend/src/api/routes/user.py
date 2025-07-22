from typing import Any, NotRequired, TypedDict

from litestar import delete, get
from litestar.exceptions import HTTPException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization
from packages.db.src.tables import OrganizationUser as ProjectMember
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.firebase import (
    get_user_deletion_status,
    schedule_user_deletion,
)

logger = get_logger(__name__)


USER_DELETION_GRACE_PERIOD_DAYS = 10


class DeleteUserResponse(TypedDict):
    message: str
    scheduled_deletion_date: str
    grace_period_days: int
    restoration_info: str


class SoleOwnedProject(TypedDict):
    id: str
    name: str


class DeleteUserErrorDetail(TypedDict):
    error: str
    message: str
    projects: NotRequired[list[SoleOwnedProject]]


class GetSoleOwnedProjectsResponse(TypedDict):
    projects: list[SoleOwnedProject]
    count: int


class SoleOwnedOrganization(TypedDict):
    id: str
    name: str


class GetSoleOwnedOrganizationsResponse(TypedDict):
    organizations: list[SoleOwnedOrganization]
    count: int


@delete("/user", operation_id="DeleteUser", status_code=200)
async def delete_user(request: APIRequest, session_maker: async_sessionmaker[Any]) -> DeleteUserResponse:
    """
    Schedule user account for deletion with grace period.
    User will be removed from all projects immediately.
    Account will be permanently deleted after grace period.
    """
    firebase_uid = request.auth
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        existing_deletion = await get_user_deletion_status(firebase_uid)
        if existing_deletion and existing_deletion.get("status") == "scheduled":
            raise HTTPException(
                status_code=400,
                detail="User account is already scheduled for deletion",
            )

        async with session_maker() as session:
            owned_organizations = (
                select(ProjectMember.organization_id)
                .where(ProjectMember.firebase_uid == firebase_uid)
                .where(ProjectMember.role == UserRoleEnum.OWNER)
                .subquery()
            )

            sole_owned_query = (
                select(Organization)
                .join(owned_organizations, Organization.id == owned_organizations.c.organization_id)
                .outerjoin(
                    ProjectMember,
                    (Organization.id == ProjectMember.organization_id)
                    & (ProjectMember.role == UserRoleEnum.OWNER)
                    & (ProjectMember.firebase_uid != firebase_uid),
                )
                .group_by(Organization.id)
                .having(func.count(ProjectMember.firebase_uid) == 0)
            )

            result = await session.execute(sole_owned_query)
            sole_owned_organizations = result.scalars().all()

            if sole_owned_organizations:
                raise HTTPException(
                    status_code=400,
                    detail="You must transfer ownership of organizations before deleting your account",
                    extra={
                        "error": "ownership_transfer_required",
                        "organizations": [{"id": str(o.id), "name": o.name} for o in sole_owned_organizations],
                    },
                )

        async with session_maker() as session, session.begin():
            result = await session.execute(
                text("DELETE FROM organization_users WHERE firebase_uid = :uid"),
                {"uid": firebase_uid},
            )
            organizations_removed = result.rowcount

            await session.execute(
                text("DELETE FROM notifications WHERE firebase_uid = :uid"),
                {"uid": firebase_uid},
            )

            logger.info(
                "Removed user from organizations",
                firebase_uid=firebase_uid,
                organizations_removed=organizations_removed,
            )

        deletion_data = await schedule_user_deletion(firebase_uid, USER_DELETION_GRACE_PERIOD_DAYS)

        logger.info(
            "User deletion scheduled successfully",
            firebase_uid=firebase_uid,
            deletion_date=deletion_data["deletion_date"].isoformat(),
        )

        return {
            "message": "Account scheduled for deletion. You will be removed from all projects immediately.",
            "scheduled_deletion_date": deletion_data["deletion_date"].isoformat() + "Z",
            "grace_period_days": deletion_data["grace_period_days"],
            "restoration_info": f"Contact support within {deletion_data['grace_period_days']} days to restore your account",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            "Error deleting user account",
            firebase_uid=firebase_uid,
            error=str(e),
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete user account",
        ) from e


@get("/user/sole-owned-projects", operation_id="GetSoleOwnedProjects")
async def get_sole_owned_projects(
    request: APIRequest, session_maker: async_sessionmaker[Any]
) -> GetSoleOwnedProjectsResponse:
    """
    Get list of projects where the user is the sole owner.
    These projects must be handled before account deletion.
    """
    firebase_uid = request.auth
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    async with session_maker() as session:
        owned_organizations = (
            select(ProjectMember.organization_id)
            .where(ProjectMember.firebase_uid == firebase_uid)
            .where(ProjectMember.role == UserRoleEnum.OWNER)
            .subquery()
        )

        sole_owned_query = (
            select(Organization)
            .join(owned_organizations, Organization.id == owned_organizations.c.organization_id)
            .outerjoin(
                ProjectMember,
                (Organization.id == ProjectMember.organization_id)
                & (ProjectMember.role == UserRoleEnum.OWNER)
                & (ProjectMember.firebase_uid != firebase_uid),
            )
            .group_by(Organization.id)
            .having(func.count(ProjectMember.firebase_uid) == 0)
        )

        result = await session.execute(sole_owned_query)
        sole_owned_organizations = result.scalars().all()

        return {
            "projects": [{"id": str(o.id), "name": o.name} for o in sole_owned_organizations],
            "count": len(sole_owned_organizations),
        }


@get("/user/sole-owned-organizations", operation_id="GetSoleOwnedOrganizations")
async def get_sole_owned_organizations(
    request: APIRequest, session_maker: async_sessionmaker[Any]
) -> GetSoleOwnedOrganizationsResponse:
    """
    Get list of organizations where the user is the sole owner.
    These organizations must be handled before account deletion.
    """
    firebase_uid = request.auth
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    async with session_maker() as session:
        owned_organizations = (
            select(ProjectMember.organization_id)
            .where(ProjectMember.firebase_uid == firebase_uid)
            .where(ProjectMember.role == UserRoleEnum.OWNER)
            .subquery()
        )

        sole_owned_query = (
            select(Organization)
            .join(owned_organizations, Organization.id == owned_organizations.c.organization_id)
            .outerjoin(
                ProjectMember,
                (Organization.id == ProjectMember.organization_id)
                & (ProjectMember.role == UserRoleEnum.OWNER)
                & (ProjectMember.firebase_uid != firebase_uid),
            )
            .group_by(Organization.id)
            .having(func.count(ProjectMember.firebase_uid) == 0)
        )

        result = await session.execute(sole_owned_query)
        sole_owned_organizations = result.scalars().all()

        return {
            "organizations": [{"id": str(o.id), "name": o.name} for o in sole_owned_organizations],
            "count": len(sole_owned_organizations),
        }
