from datetime import date
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.json_objects import GrantLongFormSection
from packages.db.src.tables import GrantTemplate, GrantTemplateRagSource, RagSource
from packages.shared_utils.src.exceptions import BackendError, DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import count

logger = get_logger(__name__)


class UpdateGrantTemplateRequestBody(TypedDict):
    grant_sections: NotRequired[list[GrantLongFormSection]]
    submission_date: NotRequired[date]


@post(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateGrantTemplate",
)
async def handle_generate_grant_template(
    grant_template_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Creating grant template", grant_template_id=grant_template_id)

    async with session_maker() as session:
        grant_template = await session.scalar(select(GrantTemplate).where(GrantTemplate.id == grant_template_id))

        if not grant_template:
            raise ValidationException("Grant template not found")

        rag_sources_count = await session.scalar(
            select(count())
            .select_from(GrantTemplateRagSource)
            .join(RagSource)
            .where(
                GrantTemplateRagSource.grant_template_id == grant_template_id,
                RagSource.indexing_status.in_((SourceIndexingStatusEnum.INDEXING, SourceIndexingStatusEnum.FINISHED)),
            )
        )

        if rag_sources_count == 0:
            raise ValidationException("No rag sources found for grant template, cannot generate")

        try:
            await publish_rag_task(logger=logger, parent_type="grant_template", parent_id=grant_template.id)
        except BackendError as e:
            logger.error("Error initiating grant template generation", exc_info=e)
            raise
        except SQLAlchemyError as e:
            logger.error("Error initiating grant template generation", exc_info=e)
            raise DatabaseError("Error initiating grant template generation", context=str(e)) from e


@patch(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateGrantTemplate",
)
async def handle_update_grant_template(
    grant_template_id: UUID,
    data: UpdateGrantTemplateRequestBody,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Updating grant template", grant_template_id=grant_template_id, data=data)

    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(select(GrantTemplate).where(GrantTemplate.id == grant_template_id))

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
