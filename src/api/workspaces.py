from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, NotFound, empty, json
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationBaseResponse,
    CfpResponse,
    CreateWorkspaceRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceBaseResponse,
    WorkspaceFullResponse,
    WorkspaceIdResponse,
)
from src.db.tables import Application, GrantCfp, UserRoleEnum, Workspace, WorkspaceUser
from src.exceptions import DatabaseError
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)


async def handle_create_workspace(request: APIRequest) -> HTTPResponse:
    """Route handler for creating a Workspace.

    Args:
        request: The sanic request object

    Raises:
        DatabaseError: If there was an issue creating the workspace in the database.

    Returns:
        The response object.
    """
    logger.info("Creating workspace by user", uid=request.ctx.firebase_uid)
    request_body = deserialize(request.body, CreateWorkspaceRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(insert(Workspace).values(request_body).returning(Workspace))
            await session.execute(
                insert(WorkspaceUser).values(
                    {
                        "workspace_id": workspace.id,
                        "firebase_uid": request.ctx.firebase_uid,
                        "role": UserRoleEnum.OWNER.value,
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating workspace", exc_info=e)
            raise DatabaseError("Error creating workspace") from e

    return json(
        WorkspaceIdResponse(
            id=str(workspace.id),
        ),
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_workspaces(request: APIRequest) -> HTTPResponse:
    """Route handler for retrieving Workspaces the user can access.

    Args:
        request: The request object

    Returns:
        The response object.
    """
    logger.info("Retrieving workspaces for user", uid=request.ctx.firebase_uid)

    async with request.ctx.session_maker() as session:
        workspaces = (
            await session.scalars(
                select(Workspace)
                .options(selectinload(Workspace.users))
                .join(WorkspaceUser)
                .where(WorkspaceUser.firebase_uid == request.ctx.firebase_uid)
            )
        ).all()

    return json(
        [
            WorkspaceBaseResponse(
                id=str(workspace.id),
                name=workspace.name,
                description=workspace.description,
                logo_url=workspace.logo_url,
                role=workspace.users[0].role,
            )
            for workspace in workspaces
        ]
    )


async def handle_update_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for updating a Workspace.

    Args:
        request: The sanic request object
        workspace_id: The ID of the workspace to update

    Raises:
        DatabaseError: If there was an issue updating the workspace in the database.

    Returns:
        The response object.
    """
    user_role = await verify_workspace_access(
        request=request, workspace_id=workspace_id, allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN]
    )

    logger.info("Updating workspace", workspace_id=workspace_id)
    request_body = deserialize(request.body, UpdateWorkspaceRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(
                update(Workspace).where(Workspace.id == workspace_id).values(request_body).returning(Workspace)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating workspace", exc_info=e)
            raise DatabaseError("Error updating workspace") from e

    return json(
        WorkspaceBaseResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=user_role,
        )
    )


async def handle_retrieve_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for retrieving a Workspace.

    Args:
        request: The sanic request object
        workspace_id: The ID of the workspace to update

    Raises:
        NotFound: If the workspace was not found.

    Returns:
        The response object.
    """
    user_role = await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Retrieving workspace", workspace_id=workspace_id)
    async with request.ctx.session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(
                select(Workspace)
                .options(
                    selectinload(Workspace.applications)
                    .selectinload(Application.cfp)
                    .selectinload(GrantCfp.funding_organization)
                )
                .where(Workspace.id == workspace_id)
            )
        except SQLAlchemyError as e:
            logger.error("Error retrieving workspace", exc_info=e)
            raise NotFound from e

    return json(
        WorkspaceFullResponse(
            id=str(workspace.id),
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=user_role,
            applications=[
                ApplicationBaseResponse(
                    id=str(application.id),
                    title=application.title,
                    cfp=CfpResponse(
                        id=str(application.cfp.id),
                        allow_clinical_trials=application.cfp.allow_clinical_trials,
                        allow_resubmissions=application.cfp.allow_resubmissions,
                        category=application.cfp.category,
                        code=application.cfp.code,
                        description=application.cfp.description,
                        title=application.cfp.title,
                        url=application.cfp.url,
                        funding_organization_id=str(application.cfp.funding_organization_id),
                        funding_organization_name=application.cfp.funding_organization.name,
                    ),
                )
                for application in workspace.applications
            ],
        )
    )


async def handle_delete_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for deleting a Workspace.

    Args:
        request: The request object
        workspace_id: The ID of the workspace to delete

    Raises:
        DatabaseError: If there was an issue deleting the workspace in the database.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id, allowed_roles=[UserRoleEnum.OWNER])

    logger.info("Deleting workspace", workspace_id=workspace_id)
    async with request.ctx.session_maker() as session, session.begin():
        try:
            await session.execute(delete(Workspace).where(Workspace.id == workspace_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting workspace", exc_info=e)
            raise DatabaseError("Error deleting workspace") from e

    return empty()
