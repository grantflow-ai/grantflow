from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from secrets import token_hex
from typing import Any, NotRequired, TypedDict, cast
from uuid import UUID

from jwt import encode
from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import UserProjectInvitation, Project, ProjectUser
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.backend.src.common_types import APIRequest, TableIdResponse
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


class ProjectResponse(ProjectBaseResponse):
    grant_applications: list["BaseApplicationResponse"]


class BaseApplicationResponse(TableIdResponse):
    title: str
    completed_at: str | None


class CreateInvitationRedirectUrlRequestBody(TypedDict):
    email: str
    role: UserRoleEnum


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
            project = await session.scalar(
                insert(Project).values(data).returning(Project)
            )
            await session.execute(
                insert(ProjectUser).values(
                    {
                        "project_id": project.id,
                        "firebase_uid": request.auth,
                        "role": UserRoleEnum.OWNER.value,
                    }
                )
            )
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
    request: APIRequest, session_maker: async_sessionmaker[Any]
) -> list[ProjectListItemResponse]:
    logger.info("Retrieving projects for user", uid=request.auth)
    async with session_maker() as session:
        projects = list(
            await session.scalars(
                select(Project)
                .options(
                    selectinload(Project.project_users),
                    selectinload(Project.grant_applications),
                )
                .join(ProjectUser)
                .where(ProjectUser.firebase_uid == request.auth)
            )
        )

    return [
        ProjectListItemResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            logo_url=project.logo_url,
            role=project.project_users[0].role,
            applications_count=len(project.grant_applications),
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
                .where(Project.id == project_id)
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
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GetProject",
)
async def handle_retrieve_project(
    request: APIRequest, project_id: UUID, session_maker: async_sessionmaker[Any]
) -> ProjectResponse:
    logger.info("Retrieving project", project_id=project_id)
    async with session_maker() as session, session.begin():
        project = await session.scalar(
            select(Project)
            .options(selectinload(Project.grant_applications))
            .where(Project.id == project_id)
        )

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
                completed_at=grant_application.completed_at.isoformat()
                if grant_application.completed_at
                else None,
            )
            for grant_application in project.grant_applications
        ],
    )


@delete(
    "/projects/{project_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER],
    operation_id="DeleteProject",
)
async def handle_delete_project(
    project_id: UUID, session_maker: async_sessionmaker[Any]
) -> None:
    logger.info("Deleting project", project_id=project_id)
    async with session_maker() as session, session.begin():
        try:
            await session.execute(sa_delete(Project).where(Project.id == project_id))
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
            inviter = await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == request.auth)
            )

            if not inviter:
                raise ValidationException("User is not a member of this project")

            if (
                inviter.role != UserRoleEnum.OWNER
                and data["role"] == UserRoleEnum.OWNER
            ):
                raise ValidationException(
                    "Invitee role must be equal to or lower than the inviter's role"
                )

            firebase_user = await get_user_by_email(data["email"])
            if firebase_user:
                existing_member = await session.scalar(
                    select(ProjectUser)
                    .where(ProjectUser.project_id == project_id)
                    .where(ProjectUser.firebase_uid == firebase_user["uid"])
                )
                if existing_member:
                    raise ValidationException(
                        "User is already a member of this project"
                    )

            invitation = await session.scalar(
                insert(UserProjectInvitation)
                .values(
                    {
                        "project_id": project_id,
                        "email": data["email"],
                        "role": data["role"],
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(UserProjectInvitation)
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
    logger.info(
        "Deleting invitation", project_id=project_id, invitation_id=invitation_id
    )
    async with session_maker() as session, session.begin():
        try:
            await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == request.auth)
            )

            invitation = await session.scalar(
                select(UserProjectInvitation)
                .where(UserProjectInvitation.id == invitation_id)
                .where(UserProjectInvitation.project_id == project_id)
            )

            if not invitation:
                raise ValidationException("Invitation not found")

            await session.execute(
                sa_delete(UserProjectInvitation)
                .where(UserProjectInvitation.id == invitation_id)
                .where(UserProjectInvitation.project_id == project_id)
            )
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
            invitation = await session.scalar(
                select(UserProjectInvitation)
                .where(UserProjectInvitation.id == invitation_id)
                .where(UserProjectInvitation.project_id == project_id)
            )
            if not invitation:
                raise ValidationException("Invitation not found")

            inviter = await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == request.auth)
            )
            if invitation.accepted_at is not None:
                raise ValidationException(
                    "Cannot update role of an accepted invitation"
                )

            if (
                inviter.role != UserRoleEnum.OWNER
                and data["role"] == UserRoleEnum.OWNER
            ):
                raise ValidationException(
                    "Invitee role must be equal to or lower than the inviter's role"
                )

            invitation = await session.scalar(
                update(UserProjectInvitation)
                .where(UserProjectInvitation.id == invitation_id)
                .where(UserProjectInvitation.project_id == project_id)
                .values(role=data["role"])
                .returning(UserProjectInvitation)
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
                raise DatabaseError(
                    "Error updating invitation role", context=str(e)
                ) from e
            raise e


@post(
    "/projects/invitations/{invitation_id:uuid}/accept",
    operation_id="AcceptInvitation",
    status_code=HTTPStatus.OK,
)
async def handle_accept_invitation(
    request: APIRequest,
    invitation_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> InvitationRedirectUrlResponse:
    logger.info("Accepting invitation", invitation_id=invitation_id)
    async with session_maker() as session, session.begin():
        try:
            invitation = await session.scalar(
                select(UserProjectInvitation).where(
                    UserProjectInvitation.id == invitation_id
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
                raise ValidationException(
                    "Authenticated user does not match invitation email"
                )

            await session.scalar(
                insert(ProjectUser)
                .values(
                    {
                        "project_id": invitation.project_id,
                        "firebase_uid": request.auth,
                        "role": invitation.role,
                    }
                )
                .returning(ProjectUser)
            )

            await session.execute(
                update(UserProjectInvitation)
                .where(UserProjectInvitation.id == invitation_id)
                .values(accepted_at=datetime.now(UTC))
            )

            jwt_payload = {
                "invitation_id": str(invitation.id),
                "project_id": str(invitation.project_id),
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
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="ListProjectMembers",
)
async def handle_list_project_members(
    request: APIRequest,
    project_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[ProjectMemberResponse]:
    logger.info("Listing project members", project_id=project_id)
    async with session_maker() as session:
        
        project_users = list(
            await session.scalars(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .order_by(ProjectUser.role)
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
                "joined_at": datetime.now(
                    UTC
                ).isoformat(),  # TODO: Add created_at to ProjectUser table
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
            
            requester = await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == request.auth)
            )

            if not requester:
                raise ValidationException("Requester is not a member of this project")

            
            target_member = await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == firebase_uid)
            )

            if not target_member:
                raise ValidationException("Member not found in project")

            
            if target_member.role == UserRoleEnum.OWNER:
                raise ValidationException("Cannot modify OWNER role")

            if (
                requester.role != UserRoleEnum.OWNER
                and data["role"] == UserRoleEnum.ADMIN
            ):
                raise ValidationException("Only OWNER can promote members to ADMIN")

            if (
                requester.role != UserRoleEnum.OWNER
                and target_member.role == UserRoleEnum.ADMIN
            ):
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
            
            requester = await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == request.auth)
            )

            if not requester:
                raise ValidationException("Requester is not a member of this project")

            
            target_member = await session.scalar(
                select(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == firebase_uid)
            )

            if not target_member:
                raise ValidationException("Member not found in project")

            
            if target_member.role == UserRoleEnum.OWNER:
                raise ValidationException("Cannot remove OWNER from project")

            if (
                requester.role != UserRoleEnum.OWNER
                and target_member.role == UserRoleEnum.ADMIN
            ):
                raise ValidationException("Only OWNER can remove ADMIN members")

            
            await session.execute(
                sa_delete(ProjectUser)
                .where(ProjectUser.project_id == project_id)
                .where(ProjectUser.firebase_uid == firebase_uid)
            )
            await session.commit()

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error removing project member", exc_info=e)
                raise DatabaseError(
                    "Error removing project member", context=str(e)
                ) from e
            raise e
