from datetime import date
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import ApplicationStatusEnum, UserRoleEnum
from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from services.backend.src.common_types import TableIdResponse
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class CreateApplicationRequestBody(TypedDict):
    title: str


class UpdateApplicationRequestBody(TypedDict):
    form_inputs: NotRequired[dict[str, str]]
    research_objectives: NotRequired[list[ResearchObjective]]
    status: NotRequired[ApplicationStatusEnum]
    title: NotRequired[str]


class UpdateGrantTemplateRequestBody(TypedDict):
    grant_sections: NotRequired[list[GrantLongFormSection]]
    submission_date: NotRequired[date]


@post(
    "/workspaces/{workspace_id:uuid}/applications",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateApplication",
)
async def handle_create_application(
    workspace_id: UUID, data: CreateApplicationRequestBody, session_maker: async_sessionmaker[Any]
) -> TableIdResponse:
    logger.info("Creating application", workspace_id=workspace_id, title=data["title"])

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                insert(GrantApplication)
                .values(
                    {
                        "workspace_id": workspace_id,
                        "title": data["title"],
                        "status": ApplicationStatusEnum.DRAFT,
                    }
                )
                .returning(GrantApplication)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application", exc_info=e)
            raise DatabaseError("Error creating application", context=str(e)) from e

    return TableIdResponse(id=str(application.id))


@patch(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateApplication",
)
async def handle_update_application(
    workspace_id: UUID,
    application_id: UUID,
    data: UpdateApplicationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Updating application", workspace_id=workspace_id, application_id=application_id)

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                select(GrantApplication)
                .where(GrantApplication.id == application_id)
                .where(GrantApplication.workspace_id == workspace_id)
            )

            if not application:
                raise ValidationException("Application not found")

            await session.execute(update(GrantApplication).where(GrantApplication.id == application_id).values(**data))
            await session.commit()
        except ValidationException:
            await session.rollback()
            raise
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating application", exc_info=e)
            raise DatabaseError("Error updating application", context=str(e)) from e


@patch(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/grant-template",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateGrantTemplate",
)
async def handle_update_grant_template(
    workspace_id: UUID,
    application_id: UUID,
    data: UpdateGrantTemplateRequestBody,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Updating grant template", workspace_id=workspace_id, application_id=application_id, data=data)

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                select(GrantApplication)
                .where(GrantApplication.id == application_id)
                .where(GrantApplication.workspace_id == workspace_id)
            )

            if not application:
                raise ValidationException("Application not found")

            grant_template = await session.scalar(
                select(GrantTemplate).where(GrantTemplate.grant_application_id == application_id)
            )

            if not grant_template:
                raise ValidationException("Grant template not found")

            await session.execute(update(GrantTemplate).where(GrantTemplate.id == grant_template.id).values(**data))
            await session.commit()
        except ValidationException:
            await session.rollback()
            raise
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating grant template", exc_info=e)
            raise DatabaseError("Error updating grant template", context=str(e)) from e


@delete(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="DeleteApplication",
)
async def handle_delete_application(application_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Deleting application", application_id=application_id)

    async with session_maker() as session, session.begin():
        try:
            await session.execute(sa_delete(GrantApplication).where(GrantApplication.id == application_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e
