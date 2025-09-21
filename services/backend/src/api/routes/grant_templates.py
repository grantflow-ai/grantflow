from datetime import date
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.json_objects import GrantLongFormSection
from packages.db.src.tables import GrantTemplate, GrantTemplateSource, RagSource
from packages.shared_utils.src.exceptions import BackendError, DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import count

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest
from services.rag.src.enums import GrantTemplateStageEnum

logger = get_logger(__name__)


class UpdateGrantTemplateRequestBody(TypedDict):
    grant_sections: NotRequired[list[GrantLongFormSection]]
    submission_date: NotRequired[date]


@post(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="CreateGrantTemplate",
)
async def handle_generate_grant_template(
    *,
    grant_template_id: UUID,
    session_maker: async_sessionmaker[Any],
    request: APIRequest,
) -> None:
    trace_id = get_trace_id(request)



    async with session_maker() as session:
        grant_template = await session.scalar(
            select(GrantTemplate).where(
                GrantTemplate.id == grant_template_id,
                GrantTemplate.deleted_at.is_(None),
            )
        )

        if not grant_template:
            raise ValidationException("Grant template not found")

        if grant_template.grant_sections:
            return


        rag_sources_count = await session.scalar(
            select(count())
            .select_from(GrantTemplateSource)
            .join(RagSource)
            .where(
                GrantTemplateSource.grant_template_id == grant_template_id,
                GrantTemplateSource.deleted_at.is_(None),
                RagSource.deleted_at.is_(None),
                RagSource.indexing_status.in_(
                    (
                        SourceIndexingStatusEnum.CREATED,
                        SourceIndexingStatusEnum.INDEXING,
                        SourceIndexingStatusEnum.FINISHED,
                    )
                ),
            )
        )

        if rag_sources_count == 0:
            raise ValidationException("No rag sources found for grant template, cannot generate")


        try:
            await publish_rag_task(
                parent_type="grant_template",
                parent_id=grant_template.id,
                stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
                trace_id=trace_id,
            )

        except BackendError as e:
            logger.error("Error initiating grant template generation", exc_info=e)
            raise
        except SQLAlchemyError as e:
            logger.error("Error initiating grant template generation", exc_info=e)
            raise DatabaseError("Error initiating grant template generation", context=str(e)) from e


@patch(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="UpdateGrantTemplate",
)
async def handle_update_grant_template(
    *,
    grant_template_id: UUID,
    data: UpdateGrantTemplateRequestBody,
    session_maker: async_sessionmaker[Any],
    request: APIRequest,
) -> None:
    get_trace_id(request)


    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(
                select(GrantTemplate).where(
                    GrantTemplate.id == grant_template_id,
                    GrantTemplate.deleted_at.is_(None),
                )
            )

            if not grant_template:
                raise ValidationException("Grant template not found")

            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id, GrantTemplate.deleted_at.is_(None))
                .values(**data)
            )
            await session.commit()
        except ValidationException:
            raise
        except SQLAlchemyError as e:
            logger.error("Error updating grant template", exc_info=e)
            raise DatabaseError("Error updating grant template", context=str(e)) from e
