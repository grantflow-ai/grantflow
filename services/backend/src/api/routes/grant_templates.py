from datetime import date
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import GrantType, SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.json_objects import GrantLongFormSection
from packages.db.src.tables import GrantTemplate, GrantTemplateSource, PredefinedGrantTemplate, RagSource
from packages.shared_utils.src.exceptions import BackendError, DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import count

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest
from services.rag.src.grant_template.predefined import apply_predefined_template

logger = get_logger(__name__)


class UpdateGrantTemplateRequestBody(TypedDict):
    grant_sections: NotRequired[list[GrantLongFormSection]]
    submission_date: NotRequired[date]
    grant_type: NotRequired[GrantType]


class ApplyPredefinedTemplateRequestBody(TypedDict):
    predefined_template_id: UUID


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
            .join(RagSource, GrantTemplateSource.rag_source_id == RagSource.id)
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

            update_values: dict[str, Any] = dict(data)

            if "grant_type" in update_values and update_values["grant_type"] is not None:
                update_values["grant_type"] = GrantType(update_values["grant_type"])

            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id, GrantTemplate.deleted_at.is_(None))
                .values(**update_values)
            )
        except ValidationException:
            raise
        except SQLAlchemyError as e:
            logger.error("Error updating grant template", exc_info=e)
            raise DatabaseError("Error updating grant template", context=str(e)) from e


@post(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant-template/{grant_template_id:uuid}/predefined",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="ApplyPredefinedGrantTemplate",
)
async def handle_apply_predefined_grant_template(
    *,
    grant_template_id: UUID,
    data: ApplyPredefinedTemplateRequestBody,
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

            if grant_template.grant_sections:
                raise ValidationException(
                    "Grant template already contains sections; clear them before applying a predefined template"
                )

            predefined = await session.scalar(
                select(PredefinedGrantTemplate).where(
                    PredefinedGrantTemplate.id == data["predefined_template_id"],
                    PredefinedGrantTemplate.deleted_at.is_(None),
                )
            )

            if not predefined:
                raise ValidationException("Predefined template not found")

            await apply_predefined_template(
                session=session,
                grant_template=grant_template,
                predefined_template=predefined,
            )

        except ValidationException:
            raise
        except SQLAlchemyError as exc:
            logger.error("Error applying predefined grant template", exc_info=exc)
            raise DatabaseError("Error applying predefined grant template", context=str(exc)) from exc
