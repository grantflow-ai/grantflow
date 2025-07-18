from asyncio import gather
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from secrets import token_hex
from typing import Any, NotRequired, TypedDict, cast
from uuid import UUID

import msgspec
from jwt import decode, encode
from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationInvitation, OrganizationUser, Project, ProjectAccess
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.backend.src.common_types import APIRequest, TableIdResponse
from services.backend.src.utils.audit import DELETE_PROJECT, log_organization_audit_from_request
from services.backend.src.utils.firebase import get_user_by_email, get_users

logger = get_logger(__name__)


class CreateProjectRequestBody(TypedDict):
    name: str
    description: str | None
    logo_url: NotRequired[str | None]


class UpdateProjectRequestBody(TypedDict):
    name: NotRequired[str]
    description: NotRequired[str | None]
    logo_url: NotRequired[str | None]


class ProjectBaseResponse(TableIdResponse):
    name: str
    description: str | None
    logo_url: str | None
    role: UserRoleEnum


class ProjectListItemResponse(ProjectBaseResponse):
    applications_count: int
    members: list["ProjectMemberInfo"]


class ProjectResponse(ProjectBaseResponse):
    grant_applications: list["BaseApplicationResponse"]
    members: list["ProjectMemberInfo"]


class BaseApplicationResponse(TableIdResponse):
    title: str
    completed_at: str | None


class CreateInvitationRedirectUrlRequestBody(TypedDict):
    email: str
    role: UserRoleEnum
    project_ids: NotRequired[list[str]]


class InvitationRedirectUrlResponse(TypedDict):
    token: str


class UpdateInvitationRoleRequestBody(TypedDict):
    role: UserRoleEnum


class ProjectMemberResponse(TypedDict):
    firebase_uid: str
    email: str
    display_name: str | None
    photo_url: str | None
    role: UserRoleEnum
    joined_at: str


class ProjectMemberInfo(TypedDict):
    firebase_uid: str
    email: str
    display_name: str | None
    photo_url: str | None
    role: UserRoleEnum


class UpdateMemberRoleRequestBody(TypedDict):
    role: UserRoleEnum


@post("/projects", operation_id="CreateProject")
async def handle_create_project(
    request: APIRequest,
    data: CreateProjectRequestBody,
    session_maker: async_sessionmaker[Any],
) -> TableIdResponse:
    logger.info("Creating project by user", uid=request.auth)
    async with session_maker() as session, session.begin():
        try:
            user_org = await session.scalar(
                select(OrganizationUser).where(
                    OrganizationUser.firebase_uid == request.auth,
                    OrganizationUser.deleted_at.is_(None),
                )
            )
            if not user_org:
                raise ValidationException("User is not a member of any organization")

            project_data = {**data, "organization_id": user_org.organization_id}
            project = await session.scalar(insert(Project).values(project_data).returning(Project))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating project", exc_info=e)
            raise DatabaseError("Error creating project", context=str(e)) from e

    return TableIdResponse(
        id=str(project.id),
    )


@get("/projects", operation_id="ListProjects")
async def handle_retrieve_projects(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
) -> list[ProjectListItemResponse]:
    store = request.app.stores.get("firebase_user_cache")
    logger.info("Retrieving projects for user", uid=request.auth)

    async with session_maker() as session:
        projects = list(
            await session.scalars(
                select(Project)
                .join(Organization, Project.organization_id == Organization.id)
                .join(OrganizationUser, Organization.id == OrganizationUser.organization_id)
                .where(
                    OrganizationUser.firebase_uid == request.auth,
                    OrganizationUser.deleted_at.is_(None),
                    Project.deleted_at.is_(None),
                )
                .options(
                    selectinload(Project.project_access),
                    selectinload(Project.grant_applications),
                )
            )
        )

    org_ids = list({project.organization_id for project in projects})

    async with session_maker() as session:
        org_users = list(
            await session.scalars(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id.in_(org_ids))
                .where(OrganizationUser.deleted_at.is_(None))
            )
        )

    org_users_map: dict[UUID, list[OrganizationUser]] = {}
    for org_user in org_users:
        if org_user.organization_id not in org_users_map:
            org_users_map[org_user.organization_id] = []
        org_users_map[org_user.organization_id].append(org_user)

    all_member_uids = list({ou.firebase_uid for ou in org_users})

    cached_data = await gather(*[store.get(uid) for uid in all_member_uids])

    firebase_users: dict[str, dict[str, Any]] = {}
    for uid, data in zip(all_member_uids, cached_data, strict=False):
        if data:
            firebase_users[uid] = msgspec.json.decode(data)

    if missing_uids := list(set(all_member_uids) - set(firebase_users.keys())):
        fetched_users = await get_users(missing_uids)

        for uid, user_data in fetched_users.items():
            await store.set(uid, msgspec.json.encode(user_data), expires_in=3600)

        firebase_users.update(fetched_users)

    return [
        ProjectListItemResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            logo_url=project.logo_url,
            role=next(
                (ou.role for ou in org_users_map.get(project.organization_id, []) if ou.firebase_uid == request.auth),
                UserRoleEnum.COLLABORATOR,
            ),
            applications_count=len(project.grant_applications),
            members=[
                ProjectMemberInfo(
                    firebase_uid=ou.firebase_uid,
                    email=firebase_users[ou.firebase_uid]["email"],
                    display_name=firebase_users.get(ou.firebase_uid, {}).get("displayName"),
                    photo_url=firebase_users.get(ou.firebase_uid, {}).get("photoURL"),
                    role=ou.role,
                )
                for ou in org_users_map.get(project.organization_id, [])
                if (
                    ou.has_all_projects_access
                    or any(pa.firebase_uid == ou.firebase_uid for pa in project.project_access)
                )
            ],
        )
        for project in projects
    ]


@patch(
    "/projects/{project_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateProject",
)
async def handle_update_project(
    request: APIRequest,
    data: UpdateProjectRequestBody,
    project_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> ProjectBaseResponse:
    logger.info("Updating project", project_id=project_id)
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                update(Project)
                .where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
                .values(data)
                .returning(Project)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating project", exc_info=e)
            raise DatabaseError("Error updating project", context=str(e)) from e

    return ProjectBaseResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        logo_url=project.logo_url,
        role=cast("UserRoleEnum", request.user),
    )


@get(
    "/projects/{project_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="GetProject",
)
async def handle_retrieve_project(
    request: APIRequest, project_id: UUID, session_maker: async_sessionmaker[Any]
) -> ProjectResponse:
    store = request.app.stores.get("firebase_user_cache")
    logger.info("Retrieving project", project_id=project_id)

    async with session_maker() as session:
        project = await session.scalar(
            select(Project)
            .options(
                selectinload(Project.grant_applications),
                selectinload(Project.project_access),
            )
            .where(
                Project.id == project_id,
                Project.deleted_at.is_(None),
            )
        )

        if not project:
            raise ValidationException("Project not found")

        organization_users = list(
            await session.scalars(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == project.organization_id)
                .where(OrganizationUser.deleted_at.is_(None))
                .where(
                    OrganizationUser.has_all_projects_access
                    | (
                        OrganizationUser.firebase_uid.in_(
                            select(ProjectAccess.firebase_uid).where(ProjectAccess.project_id == project.id)
                        )
                    )
                )
            )
        )
    member_uids = [ou.firebase_uid for ou in organization_users]

    cached_data = await gather(*[store.get(uid) for uid in member_uids])

    firebase_users: dict[str, dict[str, Any]] = {}
    for uid, data in zip(member_uids, cached_data, strict=False):
        if data:
            firebase_users[uid] = msgspec.json.decode(data)

    if missing_uids := list(set(member_uids) - set(firebase_users.keys())):
        fetched_users = await get_users(missing_uids)

        for uid, user_data in fetched_users.items():
            await store.set(uid, msgspec.json.encode(user_data), expires_in=3600)

        firebase_users.update(fetched_users)

    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        logo_url=project.logo_url,
        role=cast("UserRoleEnum", request.user),
        grant_applications=[
            BaseApplicationResponse(
                id=str(grant_application.id),
                title=grant_application.title,
                completed_at=grant_application.completed_at.isoformat() if grant_application.completed_at else None,
            )
            for grant_application in project.grant_applications
        ],
        members=[
            ProjectMemberInfo(
                firebase_uid=ou.firebase_uid,
                email=firebase_users[ou.firebase_uid]["email"],
                display_name=firebase_users.get(ou.firebase_uid, {}).get("displayName"),
                photo_url=firebase_users.get(ou.firebase_uid, {}).get("photoURL"),
                role=ou.role,
            )
            for ou in organization_users
        ],
    )


@delete(
    "/projects/{project_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER],
    operation_id="DeleteProject",
)
async def handle_delete_project(request: APIRequest, project_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Deleting project", project_id=project_id)
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                select(Project).where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if not project:
                raise ValidationException("Project not found")

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=project.organization_id,
                action=DELETE_PROJECT,
                details={"project_id": str(project_id), "project_name": project.name},
            )

            project.soft_delete()
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting project", exc_info=e)
            raise DatabaseError("Error deleting project", context=str(e)) from e


@post(
    "/projects/{project_id:uuid}/create-invitation-redirect-url",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="CreateInvitationRedirectUrl",
)
async def handle_create_invitation_redirect_url(
    request: APIRequest,
    project_id: UUID,
    data: CreateInvitationRedirectUrlRequestBody,
    session_maker: async_sessionmaker[Any],
) -> InvitationRedirectUrlResponse:
    logger.info(
        "Creating invitation redirect URL",
        project_id=project_id,
        email=data["email"],
    )
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                select(Project).where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if not project:
                raise ValidationException("Project not found")

            inviter = await session.scalar(
                select(OrganizationUser).where(
                    OrganizationUser.organization_id == project.organization_id,
                    OrganizationUser.firebase_uid == request.auth,
                    OrganizationUser.deleted_at.is_(None),
                )
            )

            if not inviter:
                raise ValidationException("User is not a member of this organization")

            if inviter.role != UserRoleEnum.OWNER and data["role"] == UserRoleEnum.OWNER:
                raise ValidationException("Invitee role must be equal to or lower than the inviter's role")

            firebase_user = await get_user_by_email(data["email"])
            if firebase_user:
                existing_member = await session.scalar(
                    select(OrganizationUser)
                    .where(OrganizationUser.organization_id == project.organization_id)
                    .where(OrganizationUser.firebase_uid == firebase_user["uid"])
                )
                if existing_member:
                    raise ValidationException("User is already a member of this organization")

            invitation = await session.scalar(
                insert(OrganizationInvitation)
                .values(
                    {
                        "organization_id": project.organization_id,
                        "email": data["email"],
                        "role": data["role"],
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(OrganizationInvitation)
            )

            jwt_payload = {
                "invitation_id": str(invitation.id),
                "project_id": str(project_id),
                "role": data["role"].value,
                "project_ids": data.get("project_ids", []),
                "iat": int(datetime.now(UTC).timestamp()),
                "exp": int((datetime.now(UTC) + timedelta(days=7)).timestamp()),
                "jti": token_hex(16),
            }

            jwt_token = encode(
                payload=jwt_payload,
                key=get_env("JWT_SECRET"),
                algorithm="HS256",
            )

            await session.commit()
            return InvitationRedirectUrlResponse(token=jwt_token)

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error creating invitation", exc_info=e)
                raise DatabaseError("Error creating invitation", context=str(e)) from e
            raise e


@delete(
    "/projects/{project_id:uuid}/invitations/{invitation_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="DeleteInvitation",
)
async def handle_delete_invitation(
    request: APIRequest,
    project_id: UUID,
    invitation_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Deleting invitation", project_id=project_id, invitation_id=invitation_id)
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                select(Project).where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if not project:
                raise ValidationException("Project not found")

            await session.scalar(
                select(OrganizationUser).where(
                    OrganizationUser.organization_id == project.organization_id,
                    OrganizationUser.firebase_uid == request.auth,
                    OrganizationUser.deleted_at.is_(None),
                )
            )

            invitation = await session.scalar(
                select(OrganizationInvitation).where(
                    OrganizationInvitation.id == invitation_id,
                    OrganizationInvitation.organization_id == project.organization_id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
            )

            if not invitation:
                raise ValidationException("Invitation not found")

            invitation.soft_delete()
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting invitation", exc_info=e)
            raise DatabaseError("Error deleting invitation", context=str(e)) from e


@patch(
    "/projects/{project_id:uuid}/invitations/{invitation_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateInvitationRole",
)
async def handle_update_invitation_role(
    request: APIRequest,
    project_id: UUID,
    invitation_id: UUID,
    data: UpdateInvitationRoleRequestBody,
    session_maker: async_sessionmaker[Any],
) -> InvitationRedirectUrlResponse:
    logger.info(
        "Updating invitation role",
        project_id=project_id,
        invitation_id=invitation_id,
    )
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                select(Project).where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if not project:
                raise ValidationException("Project not found")

            invitation = await session.scalar(
                select(OrganizationInvitation).where(
                    OrganizationInvitation.id == invitation_id,
                    OrganizationInvitation.organization_id == project.organization_id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
            )
            if not invitation:
                raise ValidationException("Invitation not found")

            inviter = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == project.organization_id)
                .where(OrganizationUser.firebase_uid == request.auth)
            )
            if invitation.accepted_at is not None:
                raise ValidationException("Cannot update role of an accepted invitation")

            if inviter.role != UserRoleEnum.OWNER and data["role"] == UserRoleEnum.OWNER:
                raise ValidationException("Invitee role must be equal to or lower than the inviter's role")

            invitation = await session.scalar(
                update(OrganizationInvitation)
                .where(OrganizationInvitation.id == invitation_id)
                .where(OrganizationInvitation.organization_id == project.organization_id)
                .values(role=data["role"])
                .returning(OrganizationInvitation)
            )

            jwt_payload = {
                "invitation_id": str(invitation.id),
                "project_id": str(project_id),
                "role": data["role"].value,
                "iat": int(datetime.now(UTC).timestamp()),
                "exp": int((datetime.now(UTC) + timedelta(days=7)).timestamp()),
                "jti": token_hex(16),
            }

            jwt_token = encode(
                payload=jwt_payload,
                key=get_env("JWT_SECRET"),
                algorithm="HS256",
            )

            await session.commit()
            return InvitationRedirectUrlResponse(token=jwt_token)

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error updating invitation role", exc_info=e)
                raise DatabaseError("Error updating invitation role", context=str(e)) from e
            raise e


class AcceptInvitationRequestBody(TypedDict):
    token: NotRequired[str]


@post(
    "/projects/invitations/{invitation_id:uuid}/accept",
    operation_id="AcceptInvitation",
    status_code=HTTPStatus.OK,
)
async def handle_accept_invitation(
    request: APIRequest,
    invitation_id: UUID,
    data: AcceptInvitationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> InvitationRedirectUrlResponse:
    logger.info("Accepting invitation", invitation_id=invitation_id)
    async with session_maker() as session, session.begin():
        try:
            invitation = await session.scalar(
                select(OrganizationInvitation).where(
                    OrganizationInvitation.id == invitation_id,
                    OrganizationInvitation.deleted_at.is_(None),
                )
            )

            if not invitation:
                raise ValidationException("Invitation not found")

            if invitation.accepted_at is not None:
                raise ValidationException("Invitation has already been accepted")

            firebase_user = await get_user_by_email(invitation.email)
            if not firebase_user:
                raise ValidationException("User not found in Firebase")

            if firebase_user["uid"] != request.auth:
                raise ValidationException("Authenticated user does not match invitation email")

            await session.scalar(
                insert(OrganizationUser)
                .values(
                    {
                        "organization_id": invitation.organization_id,
                        "firebase_uid": request.auth,
                        "role": invitation.role,
                        "has_all_projects_access": False,
                    }
                )
                .returning(OrganizationUser)
            )

            project_ids = []
            if "token" in data:
                with suppress(Exception):
                    token_payload = decode(data["token"], get_env("JWT_SECRET"), algorithms=["HS256"])
                    project_ids = token_payload.get("project_ids", [])

            if project_ids:
                for project_id_str in project_ids:
                    with suppress(ValueError):
                        project_id_uuid = UUID(project_id_str)

                        existing_access = await session.scalar(
                            select(ProjectAccess)
                            .where(ProjectAccess.firebase_uid == request.auth)
                            .where(ProjectAccess.organization_id == invitation.organization_id)
                            .where(ProjectAccess.project_id == project_id_uuid)
                        )

                        if not existing_access:
                            await session.execute(
                                insert(ProjectAccess).values(
                                    {
                                        "firebase_uid": request.auth,
                                        "organization_id": invitation.organization_id,
                                        "project_id": project_id_uuid,
                                    }
                                )
                            )
            else:
                await session.execute(
                    update(OrganizationUser)
                    .where(OrganizationUser.firebase_uid == request.auth)
                    .where(OrganizationUser.organization_id == invitation.organization_id)
                    .values(has_all_projects_access=True)
                )

            await session.execute(
                update(OrganizationInvitation)
                .where(OrganizationInvitation.id == invitation_id)
                .values(accepted_at=datetime.now(UTC))
            )

            jwt_payload = {
                "invitation_id": str(invitation.id),
                "organization_id": str(invitation.organization_id),
                "role": invitation.role.value,
                "iat": int(datetime.now(UTC).timestamp()),
                "exp": int((datetime.now(UTC) + timedelta(days=7)).timestamp()),
                "jti": token_hex(16),
            }

            jwt_token = encode(
                payload=jwt_payload,
                key=get_env("JWT_SECRET"),
                algorithm="HS256",
            )

            await session.commit()
            return InvitationRedirectUrlResponse(token=jwt_token)

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error accepting invitation", exc_info=e)
                raise DatabaseError("Error accepting invitation", context=str(e)) from e
            raise e


@get(
    "/projects/{project_id:uuid}/members",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="ListProjectMembers",
)
async def handle_list_project_members(
    project_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[ProjectMemberResponse]:
    logger.info("Listing project members", project_id=project_id)
    async with session_maker() as session:
        project = await session.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.deleted_at.is_(None),
            )
        )
        if not project:
            return []

        project_users = list(
            await session.scalars(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == project.organization_id)
                .where(OrganizationUser.deleted_at.is_(None))
                .where(
                    OrganizationUser.has_all_projects_access
                    | (
                        OrganizationUser.firebase_uid.in_(
                            select(ProjectAccess.firebase_uid).where(ProjectAccess.project_id == project_id)
                        )
                    )
                )
                .order_by(OrganizationUser.role)
            )
        )

        if not project_users:
            return []

        uids = [pu.firebase_uid for pu in project_users]
        firebase_users = await get_users(uids)

        members: list[ProjectMemberResponse] = []
        for project_user in project_users:
            firebase_user = firebase_users.get(project_user.firebase_uid, {})

            member: ProjectMemberResponse = {
                "firebase_uid": project_user.firebase_uid,
                "email": firebase_user.get("email", ""),
                "display_name": firebase_user.get("displayName"),
                "photo_url": firebase_user.get("photoURL"),
                "role": project_user.role,
                "joined_at": datetime.now(UTC).isoformat(),  # TODO: Add created_at to OrganizationUser table
            }
            members.append(member)

        return members


@patch(
    "/projects/{project_id:uuid}/members/{firebase_uid:str}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateProjectMemberRole",
)
async def handle_update_member_role(
    request: APIRequest,
    project_id: UUID,
    firebase_uid: str,
    data: UpdateMemberRoleRequestBody,
    session_maker: async_sessionmaker[Any],
) -> ProjectMemberResponse:
    logger.info(
        "Updating member role",
        project_id=project_id,
        firebase_uid=firebase_uid,
        new_role=data["role"],
    )
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                select(Project).where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if not project:
                raise ValidationException("Project not found")

            requester = await session.scalar(
                select(OrganizationUser).where(
                    OrganizationUser.organization_id == project.organization_id,
                    OrganizationUser.firebase_uid == request.auth,
                    OrganizationUser.deleted_at.is_(None),
                )
            )

            if not requester:
                raise ValidationException("Requester is not a member of this organization")

            target_member = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == project.organization_id)
                .where(OrganizationUser.firebase_uid == firebase_uid)
            )

            if not target_member:
                raise ValidationException("Member not found in project")

            if target_member.role == UserRoleEnum.OWNER:
                raise ValidationException("Cannot modify OWNER role")

            if requester.role != UserRoleEnum.OWNER and data["role"] == UserRoleEnum.ADMIN:
                raise ValidationException("Only OWNER can promote members to ADMIN")

            if requester.role != UserRoleEnum.OWNER and target_member.role == UserRoleEnum.ADMIN:
                raise ValidationException("Only OWNER can modify ADMIN roles")

            target_member.role = data["role"]
            await session.commit()

            firebase_user = await get_users([firebase_uid])
            user_data = firebase_user.get(firebase_uid, {})

            return ProjectMemberResponse(
                firebase_uid=firebase_uid,
                email=user_data.get("email", ""),
                display_name=user_data.get("displayName"),
                photo_url=user_data.get("photoURL"),
                role=data["role"],
                joined_at=datetime.now(UTC).isoformat(),
            )

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error updating member role", exc_info=e)
                raise DatabaseError("Error updating member role", context=str(e)) from e
            raise e


@delete(
    "/projects/{project_id:uuid}/members/{firebase_uid:str}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="RemoveProjectMember",
)
async def handle_remove_project_member(
    request: APIRequest,
    project_id: UUID,
    firebase_uid: str,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info(
        "Removing project member",
        project_id=project_id,
        firebase_uid=firebase_uid,
    )
    async with session_maker() as session, session.begin():
        try:
            project = await session.scalar(
                select(Project).where(
                    Project.id == project_id,
                    Project.deleted_at.is_(None),
                )
            )
            if not project:
                raise ValidationException("Project not found")

            requester = await session.scalar(
                select(OrganizationUser).where(
                    OrganizationUser.organization_id == project.organization_id,
                    OrganizationUser.firebase_uid == request.auth,
                    OrganizationUser.deleted_at.is_(None),
                )
            )

            if not requester:
                raise ValidationException("Requester is not a member of this organization")

            target_member = await session.scalar(
                select(OrganizationUser).where(
                    OrganizationUser.organization_id == project.organization_id,
                    OrganizationUser.firebase_uid == firebase_uid,
                    OrganizationUser.deleted_at.is_(None),
                )
            )

            if not target_member:
                raise ValidationException("Member not found in organization")

            if target_member.role == UserRoleEnum.OWNER:
                raise ValidationException("Cannot remove OWNER from organization")

            if requester.role != UserRoleEnum.OWNER and target_member.role == UserRoleEnum.ADMIN:
                raise ValidationException("Only OWNER can remove ADMIN members")

            await session.execute(
                sa_delete(OrganizationUser)
                .where(OrganizationUser.organization_id == project.organization_id)
                .where(OrganizationUser.firebase_uid == firebase_uid)
            )
            await session.commit()

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error removing project member", exc_info=e)
                raise DatabaseError("Error removing project member", context=str(e)) from e
            raise e
