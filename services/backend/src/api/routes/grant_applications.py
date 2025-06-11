from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, patch, post
from litestar.exceptions import NotFoundException, ValidationException
from packages.db.src.enums import ApplicationStatusEnum, SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.json_objects import ResearchObjective
from packages.db.src.tables import GrantApplication, GrantApplicationRagSource, GrantTemplate, RagSource
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import count

logger = get_logger(__name__)


class CreateApplicationRequestBody(TypedDict):
    title: str


class CreateApplicationResponse(TypedDict):
    id: str
    template_id: str


class UpdateApplicationRequestBody(TypedDict):
    form_inputs: NotRequired[dict[str, str]]
    research_objectives: NotRequired[list[ResearchObjective]]
    status: NotRequired[ApplicationStatusEnum]
    title: NotRequired[str]


@post(
    "/workspaces/{workspace_id:uuid}/applications",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateApplication",
)
async def handle_create_application(
    workspace_id: UUID, data: CreateApplicationRequestBody, session_maker: async_sessionmaker[Any]
) -> CreateApplicationResponse:
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

            template = await session.scalar(
                insert(GrantTemplate)
                .values(
                    {
                        "grant_application_id": application.id,
                        "grant_sections": [],
                    }
                )
                .returning(GrantTemplate)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application and template", exc_info=e)
            raise DatabaseError("Error creating application and template", context=str(e)) from e

    return CreateApplicationResponse(id=str(application.id), template_id=str(template.id))


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


@post(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GenerateApplication",
)
async def handle_generate_application(application_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Generating application", application_id=application_id)

    try:
        application = await retrieve_application(application_id=application_id, session_maker=session_maker)
    except ValidationError as e:
        raise NotFoundException("Application not found") from e

    if (
        not application.title
        or not application.grant_template
        or not application.grant_template.grant_sections
        or not application.research_objectives
    ):
        raise ValidationException("Insufficient data to generate application.")

    async with session_maker() as session:
        rag_sources_count = await session.scalar(
            select(count())
            .select_from(GrantApplicationRagSource)
            .join(RagSource)
            .where(
                GrantApplicationRagSource.grant_application_id == application.id,
                RagSource.indexing_status.in_((SourceIndexingStatusEnum.INDEXING, SourceIndexingStatusEnum.FINISHED)),
            )
        )

        if rag_sources_count == 0:
            raise ValidationException("No rag sources found for application, cannot generate")

    try:
        await publish_rag_task(logger=logger, parent_type="grant_application", parent_id=application.id)
    except BackendError as e:
        logger.error("Error initiating application generation", exc_info=e)
        raise
    except SQLAlchemyError as e:
        logger.error("Error initiating application generation", exc_info=e)
        raise DatabaseError("Error initiating application generation", context=str(e)) from e
