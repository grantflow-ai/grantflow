from datetime import UTC, datetime
from secrets import token_hex
from typing import Any, NotRequired, TypedDict, cast
from uuid import UUID

from jwt import encode
from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import UserWorkspaceInvitation, Workspace, WorkspaceUser
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from services.backend.src.common_types import APIRequest, TableIdResponse
from services.backend.src.utils.firebase import get_user_by_email
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

logger = get_logger(__name__)


class CreateWorkspaceRequestBody(TypedDict):
    name: str
    description: str | None
    logo_url: NotRequired[str | None]


class UpdateWorkspaceRequestBody(TypedDict):
    name: NotRequired[str]
    description: NotRequired[str | None]
    logo_url: NotRequired[str | None]


class WorkspaceBaseResponse(TableIdResponse):
    name: str
    description: str | None
    logo_url: str | None
    role: UserRoleEnum


class WorkspaceResponse(WorkspaceBaseResponse):
    grant_applications: list["BaseApplicationResponse"]


class BaseApplicationResponse(TableIdResponse):
    title: str
    completed_at: str | None


class CreateInvitationRedirectUrlRequestBody(TypedDict):
    email: str
    role: UserRoleEnum


class InvitationRedirectUrlResponse(TypedDict):
    redirect_url: str


@post("/workspaces", operation_id="CreateWorkspace")
async def handle_create_workspace(
    request: APIRequest, data: CreateWorkspaceRequestBody, session_maker: async_sessionmaker[Any]
) -> TableIdResponse:
    logger.info("Creating workspace by user", uid=request.auth)
    async with session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(insert(Workspace).values(data).returning(Workspace))
            await session.execute(
                insert(WorkspaceUser).values(
                    {
                        "workspace_id": workspace.id,
                        "firebase_uid": request.auth,
                        "role": UserRoleEnum.OWNER.value,
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating workspace", exc_info=e)
            raise DatabaseError("Error creating workspace", context=str(e)) from e

    return TableIdResponse(
        id=str(workspace.id),
    )


@get("/workspaces", operation_id="ListWorkspaces")
async def handle_retrieve_workspaces(
    request: APIRequest, session_maker: async_sessionmaker[Any]
) -> list[WorkspaceBaseResponse]:
    logger.info("Retrieving workspaces for user", uid=request.auth)
    async with session_maker() as session:
        workspaces = list(
            await session.scalars(
                select(Workspace)
                .options(selectinload(Workspace.workspace_users))
                .join(WorkspaceUser)
                .where(WorkspaceUser.firebase_uid == request.auth)
            )
        )

    return [
        WorkspaceBaseResponse(
            id=str(workspace.id),
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=workspace.workspace_users[0].role,
        )
        for workspace in workspaces
    ]


@patch(
    "/workspaces/{workspace_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateWorkspace",
)
async def handle_update_workspace(
    request: APIRequest, data: UpdateWorkspaceRequestBody, workspace_id: UUID, session_maker: async_sessionmaker[Any]
) -> WorkspaceBaseResponse:
    logger.info("Updating workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(
                update(Workspace).where(Workspace.id == workspace_id).values(data).returning(Workspace)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating workspace", exc_info=e)
            raise DatabaseError("Error updating workspace", context=str(e)) from e

    return WorkspaceBaseResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        logo_url=workspace.logo_url,
        role=cast("UserRoleEnum", request.user),
    )


@get(
    "/workspaces/{workspace_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GetWorkspace",
)
async def handle_retrieve_workspace(
    request: APIRequest, workspace_id: UUID, session_maker: async_sessionmaker[Any]
) -> WorkspaceResponse:
    logger.info("Retrieving workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        workspace = await session.scalar(
            select(Workspace).options(selectinload(Workspace.grant_applications)).where(Workspace.id == workspace_id)
        )

    return WorkspaceResponse(
        id=str(workspace.id),
        name=workspace.name,
        description=workspace.description,
        logo_url=workspace.logo_url,
        role=cast("UserRoleEnum", request.user),
        grant_applications=[
            BaseApplicationResponse(
                id=str(grant_application.id),
                title=grant_application.title,
                completed_at=grant_application.completed_at.isoformat() if grant_application.completed_at else None,
            )
            for grant_application in workspace.grant_applications
        ],
    )


@delete("/workspaces/{workspace_id:uuid}", allowed_roles=[UserRoleEnum.OWNER], operation_id="DeleteWorkspace")
async def handle_delete_workspace(workspace_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Deleting workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        try:
            await session.execute(sa_delete(Workspace).where(Workspace.id == workspace_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting workspace", exc_info=e)
            raise DatabaseError("Error deleting workspace", context=str(e)) from e


@post(
    "/workspaces/{workspace_id:uuid}/create-invitation-redirect-url",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="CreateInvitationRedirectUrl",
)
async def handle_create_invitation_redirect_url(
    request: APIRequest,
    workspace_id: UUID,
    data: CreateInvitationRedirectUrlRequestBody,
    session_maker: async_sessionmaker[Any],
) -> InvitationRedirectUrlResponse:
    logger.info("Creating invitation redirect URL", workspace_id=workspace_id, email=data["email"])
    async with session_maker() as session, session.begin():
        try:
            inviter = await session.scalar(
                select(WorkspaceUser)
                .where(WorkspaceUser.workspace_id == workspace_id)
                .where(WorkspaceUser.firebase_uid == request.auth)
            )

            if not inviter:
                raise ValidationException("User is not a member of this workspace")

            if inviter.role != UserRoleEnum.OWNER and data["role"] == UserRoleEnum.OWNER:
                raise ValidationException("Invitee role must be equal to or lower than the inviter's role")

            firebase_user = await get_user_by_email(data["email"])
            if firebase_user:
                existing_member = await session.scalar(
                    select(WorkspaceUser)
                    .where(WorkspaceUser.workspace_id == workspace_id)
                    .where(WorkspaceUser.firebase_uid == firebase_user["uid"])
                )
                if existing_member:
                    raise ValidationException("User is already a member of this workspace")

            invitation = await session.scalar(
                insert(UserWorkspaceInvitation)
                .values(
                    {
                        "workspace_id": workspace_id,
                        "email": data["email"],
                        "role": data["role"],
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(UserWorkspaceInvitation)
            )

            jwt_payload = {
                "invitation_id": str(invitation.id),
                "workspace_id": str(workspace_id),
                "role": data["role"].value,
                "iat": int(datetime.now(UTC).timestamp()),
                "jti": token_hex(16),
            }

            jwt_token = encode(
                payload=jwt_payload,
                key=get_env("JWT_SECRET"),
                algorithm="HS256",
            )

            frontend_base_url = request.app.state.settings.frontend_base_url
            redirect_url = f"{frontend_base_url}/accept-invitation?token={jwt_token}"

            await session.commit()
            return InvitationRedirectUrlResponse(redirect_url=redirect_url)

        except (SQLAlchemyError, ValidationException) as e:
            await session.rollback()
            if isinstance(e, SQLAlchemyError):
                logger.error("Error creating invitation", exc_info=e)
                raise DatabaseError("Error creating invitation", context=str(e)) from e
            raise e
