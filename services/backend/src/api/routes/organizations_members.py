from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationUser, Project, ProjectAccess
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.audit import log_organization_audit_from_request
from services.backend.src.utils.firebase import FirebaseUser, get_users

logger = get_logger(__name__)


ADD_MEMBER = "add_member"
UPDATE_MEMBER_ROLE = "update_member_role"
REMOVE_MEMBER = "remove_member"


class AddMemberRequestBody(TypedDict):
    firebase_uid: str
    role: UserRoleEnum
    has_all_projects_access: NotRequired[bool]


class UpdateMemberRoleRequestBody(TypedDict):
    role: UserRoleEnum
    has_all_projects_access: NotRequired[bool]
    project_ids: NotRequired[list[str]]


class ProjectAccessInfo(TypedDict):
    project_id: str
    project_name: str
    granted_at: str


class OrganizationMemberResponse(TypedDict):
    firebase_uid: str
    role: UserRoleEnum
    has_all_projects_access: bool
    project_access: list[ProjectAccessInfo]
    created_at: str
    updated_at: str

    email: str
    display_name: str | None
    photo_url: NotRequired[str]


class MemberActionResponse(TypedDict):
    message: str
    firebase_uid: str
    role: UserRoleEnum


@get(
    "/organizations/{organization_id:uuid}/members",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="ListOrganizationMembers",
)
async def handle_list_organization_members(
    request: APIRequest,
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[OrganizationMemberResponse]:
    logger.info("Listing organization members", organization_id=organization_id, uid=request.auth)

    async with session_maker() as session:
        organization = await session.scalar(
            select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
        )

        if not organization:
            raise ValidationException("Organization not found")

        members = list(
            await session.scalars(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.deleted_at.is_(None))
                .options(selectinload(OrganizationUser.project_access))
            )
        )

        projects = {
            project.id: project.name
            for project in await session.scalars(
                select(Project).where(Project.organization_id == organization_id).where(Project.deleted_at.is_(None))
            )
        }

    firebase_uids = [member.firebase_uid for member in members]
    users_data: dict[str, FirebaseUser] = await get_users(firebase_uids)

    result = []
    for member in members:
        user_data: FirebaseUser = users_data.get(member.firebase_uid, FirebaseUser(local_id="", uid=""))

        member_response = OrganizationMemberResponse(
            firebase_uid=member.firebase_uid,
            role=member.role,
            has_all_projects_access=member.has_all_projects_access,
            project_access=[
                ProjectAccessInfo(
                    project_id=str(access.project_id),
                    project_name=projects.get(access.project_id, "Unknown Project"),
                    granted_at=access.granted_at.isoformat(),
                )
                for access in member.project_access
            ],
            created_at=member.created_at.isoformat(),
            updated_at=member.updated_at.isoformat(),
            email=user_data.get("email") or "",
            display_name=user_data.get("displayName"),
        )

        if photo_url := user_data.get("photoURL"):
            member_response["photo_url"] = photo_url

        result.append(member_response)

    return result


@post(
    "/organizations/{organization_id:uuid}/members",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="AddOrganizationMember",
)
async def handle_add_organization_member(
    request: APIRequest,
    organization_id: UUID,
    data: AddMemberRequestBody,
    session_maker: async_sessionmaker[Any],
) -> MemberActionResponse:
    logger.info("Adding organization member", organization_id=organization_id, uid=request.auth)

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )

            if not organization:
                raise ValidationException("Organization not found")

            existing_member = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == data["firebase_uid"])
                .where(OrganizationUser.deleted_at.is_(None))
            )

            if existing_member:
                raise ValidationException("User is already a member of this organization")

            member_data = {
                "organization_id": organization_id,
                "firebase_uid": data["firebase_uid"],
                "role": data["role"],
                "has_all_projects_access": data.get("has_all_projects_access", True),
            }

            await session.execute(insert(OrganizationUser).values(member_data))

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=organization_id,
                action=ADD_MEMBER,
                details={
                    "target_firebase_uid": data["firebase_uid"],
                    "role": data["role"].value,
                    "has_all_projects_access": data.get("has_all_projects_access", True),
                },
                target_user_firebase_uid=data["firebase_uid"],
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error adding organization member", exc_info=e)
            raise DatabaseError("Error adding organization member", context=str(e)) from e

    return MemberActionResponse(
        message="Member added successfully",
        firebase_uid=data["firebase_uid"],
        role=data["role"],
    )


@patch(
    "/organizations/{organization_id:uuid}/members/{firebase_uid:str}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateMemberRole",
)
async def handle_update_member_role(
    request: APIRequest,
    organization_id: UUID,
    firebase_uid: str,
    data: UpdateMemberRoleRequestBody,
    session_maker: async_sessionmaker[Any],
) -> MemberActionResponse:
    logger.info("Updating member role", organization_id=organization_id, target_uid=firebase_uid, uid=request.auth)

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )

            if not organization:
                raise ValidationException("Organization not found")

            member = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == firebase_uid)
                .where(OrganizationUser.deleted_at.is_(None))
            )

            if not member:
                raise ValidationException("Member not found")

            if firebase_uid == request.auth:
                raise ValidationException("Cannot update your own role")

            current_user_role = await session.scalar(
                select(OrganizationUser.role)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == request.auth)
                .where(OrganizationUser.deleted_at.is_(None))
            )

            if current_user_role == UserRoleEnum.ADMIN and data["role"] == UserRoleEnum.OWNER:
                raise ValidationException("Admin cannot promote user to Owner")

            old_role = member.role
            old_access = member.has_all_projects_access

            update_data: dict[str, Any] = {"role": data["role"]}

            if data["role"] in [UserRoleEnum.OWNER, UserRoleEnum.ADMIN]:
                update_data["has_all_projects_access"] = True

                await session.execute(
                    sa_delete(ProjectAccess)
                    .where(ProjectAccess.organization_id == organization_id)
                    .where(ProjectAccess.firebase_uid == firebase_uid)
                )
            elif data["role"] == UserRoleEnum.COLLABORATOR:
                has_all_access = data.get("has_all_projects_access", True)
                update_data["has_all_projects_access"] = has_all_access

                if not has_all_access:
                    await session.execute(
                        sa_delete(ProjectAccess)
                        .where(ProjectAccess.organization_id == organization_id)
                        .where(ProjectAccess.firebase_uid == firebase_uid)
                    )

                    if project_ids := data.get("project_ids"):
                        valid_projects = await session.scalars(
                            select(Project.id)
                            .where(Project.organization_id == organization_id)
                            .where(Project.id.in_(project_ids))
                            .where(Project.deleted_at.is_(None))
                        )
                        valid_project_ids = {str(pid) for pid in valid_projects}

                        for project_id in project_ids:
                            if project_id in valid_project_ids:
                                await session.execute(
                                    insert(ProjectAccess).values(
                                        {
                                            "firebase_uid": firebase_uid,
                                            "organization_id": organization_id,
                                            "project_id": project_id,
                                        }
                                    )
                                )
                else:
                    await session.execute(
                        sa_delete(ProjectAccess)
                        .where(ProjectAccess.organization_id == organization_id)
                        .where(ProjectAccess.firebase_uid == firebase_uid)
                    )

            await session.execute(
                update(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == firebase_uid)
                .values(update_data)
            )

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=organization_id,
                action=UPDATE_MEMBER_ROLE,
                details={
                    "target_firebase_uid": firebase_uid,
                    "old_role": old_role.value,
                    "new_role": data["role"].value,
                    "old_has_all_projects_access": old_access,
                    "new_has_all_projects_access": data.get("has_all_projects_access", old_access),
                },
                target_user_firebase_uid=firebase_uid,
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating member role", exc_info=e)
            raise DatabaseError("Error updating member role", context=str(e)) from e

    return MemberActionResponse(
        message="Member role updated successfully",
        firebase_uid=firebase_uid,
        role=data["role"],
    )


@delete(
    "/organizations/{organization_id:uuid}/members/{firebase_uid:str}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="RemoveMember",
)
async def handle_remove_member(
    request: APIRequest,
    organization_id: UUID,
    firebase_uid: str,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info(
        "Removing organization member", organization_id=organization_id, target_uid=firebase_uid, uid=request.auth
    )

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )

            if not organization:
                raise ValidationException("Organization not found")

            member = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == firebase_uid)
                .where(OrganizationUser.deleted_at.is_(None))
            )

            if not member:
                raise ValidationException("Member not found")

            if firebase_uid == request.auth:
                raise ValidationException("Cannot remove yourself from the organization")

            if member.role == UserRoleEnum.OWNER:
                raise ValidationException("Cannot remove organization owner")

            await session.execute(
                sa_delete(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == firebase_uid)
            )

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=organization_id,
                action=REMOVE_MEMBER,
                details={
                    "target_firebase_uid": firebase_uid,
                    "removed_role": member.role.value,
                },
                target_user_firebase_uid=firebase_uid,
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error removing organization member", exc_info=e)
            raise DatabaseError("Error removing organization member", context=str(e)) from e
