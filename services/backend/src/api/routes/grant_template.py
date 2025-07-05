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

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest

logger = get_logger(__name__)


class UpdateGrantTemplateRequestBody(TypedDict):
    grant_sections: NotRequired[list[GrantLongFormSection]]
    submission_date: NotRequired[date]


@post(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateGrantTemplate",
)
async def handle_generate_grant_template(
    grant_template_id: UUID,
    session_maker: async_sessionmaker[Any],
    request: APIRequest,
) -> None:
    trace_id = get_trace_id(request)

    logger.info(
        "Creating grant template",
        grant_template_id=grant_template_id,
        trace_id=trace_id,
        operation="grant_template_generation_start",
    )

    logger.debug(
        "Starting grant template generation validation",
        grant_template_id=str(grant_template_id),
        trace_id=trace_id,
    )

    async with session_maker() as session:
        grant_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.id == grant_template_id)
        )

        if not grant_template:
            logger.debug(
                "Grant template validation failed - template not found",
                grant_template_id=str(grant_template_id),
            )
            raise ValidationException("Grant template not found")

        logger.debug(
            "Grant template found, checking RAG sources",
            grant_template_id=str(grant_template_id),
            grant_application_id=str(grant_template.grant_application_id),
        )

        rag_sources_count = await session.scalar(
            select(count())
            .select_from(GrantTemplateRagSource)
            .join(RagSource)
            .where(
                GrantTemplateRagSource.grant_template_id == grant_template_id,
                RagSource.indexing_status.in_(
                    (
                        SourceIndexingStatusEnum.INDEXING,
                        SourceIndexingStatusEnum.FINISHED,
                    )
                ),
            )
        )

        if rag_sources_count == 0:
            logger.debug(
                "Grant template generation validation failed - no RAG sources",
                grant_template_id=str(grant_template_id),
                rag_sources_count=rag_sources_count,
            )
            raise ValidationException(
                "No rag sources found for grant template, cannot generate"
            )

        logger.debug(
            "Validation passed, publishing RAG task to PubSub",
            grant_template_id=str(grant_template_id),
            rag_sources_count=rag_sources_count,
        )

        try:
            await publish_rag_task(
                logger=logger,
                parent_type="grant_template",
                parent_id=grant_template.id,
                trace_id=trace_id,
            )

            logger.debug(
                "Successfully published grant template generation task",
                grant_template_id=str(grant_template_id),
            )
        except BackendError as e:
            logger.error("Error initiating grant template generation", exc_info=e)
            raise
        except SQLAlchemyError as e:
            logger.error("Error initiating grant template generation", exc_info=e)
            raise DatabaseError(
                "Error initiating grant template generation", context=str(e)
            ) from e


@patch(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateGrantTemplate",
)
async def handle_update_grant_template(
    grant_template_id: UUID,
    data: UpdateGrantTemplateRequestBody,
    session_maker: async_sessionmaker[Any],
    request: APIRequest,
) -> None:
    trace_id = get_trace_id(request)

    logger.info(
        "Updating grant template",
        grant_template_id=grant_template_id,
        data=data,
        trace_id=trace_id,
    )

    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(
                select(GrantTemplate).where(GrantTemplate.id == grant_template_id)
            )

            if not grant_template:
                raise ValidationException("Grant template not found")

            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id)
                .values(**data)
            )
            await session.commit()
        except ValidationException:
            await session.rollback()
            raise
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating grant template", exc_info=e)
            raise DatabaseError("Error updating grant template", context=str(e)) from e
