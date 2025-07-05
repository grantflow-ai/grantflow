from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import NotFoundException, ValidationException
from packages.db.src.enums import (
    ApplicationStatusEnum,
    SourceIndexingStatusEnum,
    UserRoleEnum,
)
from packages.db.src.json_objects import (
    GrantElement,
    GrantLongFormSection,
    ResearchDeepDive,
    ResearchObjective,
)
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    RagFile,
    RagSource,
    RagUrl,
)
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import (
    BackendError,
    DatabaseError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.sql.functions import count

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest

logger = get_logger(__name__)


class CreateApplicationRequestBody(TypedDict):
    title: str


class UpdateApplicationRequestBody(TypedDict):
    form_inputs: NotRequired[dict[str, str]]
    research_objectives: NotRequired[list[ResearchObjective]]
    status: NotRequired[ApplicationStatusEnum]
    title: NotRequired[str]


class FundingOrganizationResponse(TypedDict):
    id: str
    full_name: str
    abbreviation: NotRequired[str]
    created_at: str
    updated_at: str


class SourceResponse(TypedDict):
    sourceId: str
    filename: NotRequired[str]
    url: NotRequired[str]
    status: SourceIndexingStatusEnum


class GrantTemplateResponse(TypedDict):
    id: str
    grant_application_id: str
    funding_organization_id: NotRequired[str]
    funding_organization: NotRequired[FundingOrganizationResponse]
    grant_sections: list[GrantLongFormSection | GrantElement]
    submission_date: NotRequired[str]
    rag_sources: list[SourceResponse]
    rag_job_id: NotRequired[str]
    created_at: str
    updated_at: str


class ApplicationResponse(TypedDict):
    id: str
    project_id: str
    title: str
    status: ApplicationStatusEnum
    completed_at: NotRequired[str]
    form_inputs: NotRequired[ResearchDeepDive]
    research_objectives: NotRequired[list[ResearchObjective]]
    text: NotRequired[str]
    grant_template: NotRequired[GrantTemplateResponse]
    rag_sources: list[SourceResponse]
    rag_job_id: NotRequired[str]
    created_at: str
    updated_at: str


def _build_source_response(rag_source: RagSource) -> SourceResponse:
    source_response: SourceResponse = {
        "sourceId": str(rag_source.id),
        "status": rag_source.indexing_status,
    }

    logger.debug(
        "Building source response",
        source_type=type(rag_source).__name__,
        source_id=str(rag_source.id),
        is_url=isinstance(rag_source, RagUrl),
        is_file=isinstance(rag_source, RagFile),
    )

    if isinstance(rag_source, RagUrl):
        source_response["url"] = rag_source.url
    elif isinstance(rag_source, RagFile):
        source_response["filename"] = rag_source.filename

    return source_response


async def _handle_retrieve_application(
    project_id: UUID, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> ApplicationResponse:
    logger.info(
        "Retrieving application",
        project_id=project_id,
        application_id=application_id,
    )
    async with session_maker() as session:
        try:
            grant_application = await retrieve_application(
                application_id=application_id, session=session
            )
        except ValidationError as e:
            raise NotFoundException("Application not found") from e

        if grant_application.project_id != project_id:
            raise NotFoundException("Application not found")

        response: ApplicationResponse = {
            "id": str(grant_application.id),
            "project_id": str(grant_application.project_id),
            "title": grant_application.title,
            "status": grant_application.status,
            "rag_sources": [],
            "created_at": grant_application.created_at.isoformat(),
            "updated_at": grant_application.updated_at.isoformat(),
        }

        if grant_application.completed_at:
            response["completed_at"] = grant_application.completed_at.isoformat()

        if grant_application.form_inputs:
            response["form_inputs"] = grant_application.form_inputs

        if grant_application.research_objectives:
            response["research_objectives"] = grant_application.research_objectives

        if grant_application.text:
            response["text"] = grant_application.text

        if grant_application.rag_job_id:
            response["rag_job_id"] = str(grant_application.rag_job_id)

        if grant_application.grant_template:
            template = grant_application.grant_template
            template_response: GrantTemplateResponse = {
                "id": str(template.id),
                "grant_application_id": str(template.grant_application_id),
                "grant_sections": template.grant_sections,
                "rag_sources": [],
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat(),
            }

            if template.funding_organization_id:
                template_response["funding_organization_id"] = str(
                    template.funding_organization_id
                )

            if template.submission_date:
                template_response["submission_date"] = (
                    template.submission_date.isoformat()
                )

            if template.rag_job_id:
                template_response["rag_job_id"] = str(template.rag_job_id)

            if template.funding_organization:
                org = template.funding_organization
                funding_org_response: FundingOrganizationResponse = {
                    "id": str(org.id),
                    "full_name": org.full_name,
                    "created_at": org.created_at.isoformat(),
                    "updated_at": org.updated_at.isoformat(),
                }
                if org.abbreviation:
                    funding_org_response["abbreviation"] = org.abbreviation
                template_response["funding_organization"] = funding_org_response

            if hasattr(template, "rag_sources") and template.rag_sources:
                for template_rag_source in template.rag_sources:
                    source_response = _build_source_response(
                        template_rag_source.rag_source
                    )
                    template_response["rag_sources"].append(source_response)

            response["grant_template"] = template_response

        if grant_application.rag_sources:
            for app_rag_source in grant_application.rag_sources:
                source_response = _build_source_response(app_rag_source.rag_source)
                response["rag_sources"].append(source_response)

    return response


@post(
    "/projects/{project_id:uuid}/applications",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateApplication",
)
async def handle_create_application(
    project_id: UUID,
    data: CreateApplicationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> ApplicationResponse:
    logger.info("Creating application", project_id=project_id, title=data["title"])

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                insert(GrantApplication)
                .values(
                    {
                        "project_id": project_id,
                        "title": data["title"],
                        "status": ApplicationStatusEnum.DRAFT,
                    }
                )
                .returning(GrantApplication)
            )

            await session.scalar(
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
            raise DatabaseError(
                "Error creating application and template", context=str(e)
            ) from e

    return await _handle_retrieve_application(
        project_id=project_id,
        application_id=application.id,
        session_maker=session_maker,
    )


@patch(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateApplication",
)
async def handle_update_application(
    project_id: UUID,
    application_id: UUID,
    data: UpdateApplicationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> ApplicationResponse:
    logger.info(
        "Updating application", project_id=project_id, application_id=application_id
    )

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                select(GrantApplication)
                .where(GrantApplication.id == application_id)
                .where(GrantApplication.project_id == project_id)
            )

            if not application:
                raise ValidationException("Application not found")

            await session.execute(
                update(GrantApplication)
                .where(GrantApplication.id == application_id)
                .values(**data)
            )
            await session.commit()
        except ValidationException:
            await session.rollback()
            raise
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating application", exc_info=e)
            raise DatabaseError("Error updating application", context=str(e)) from e

    return await _handle_retrieve_application(
        project_id=project_id,
        application_id=application_id,
        session_maker=session_maker,
    )


@delete(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="DeleteApplication",
)
async def handle_delete_application(
    application_id: UUID, session_maker: async_sessionmaker[Any]
) -> None:
    logger.info("Deleting application", application_id=application_id)

    async with session_maker() as session, session.begin():
        try:
            template_result = await session.execute(
                select(GrantTemplate.id).where(
                    GrantTemplate.grant_application_id == application_id
                )
            )
            template_ids = template_result.scalars().all()

            if template_ids:
                logger.debug(
                    "Grant templates will be deleted due to CASCADE",
                    application_id=str(application_id),
                    template_ids=[str(t_id) for t_id in template_ids],
                )

            await session.execute(
                sa_delete(GrantApplication).where(GrantApplication.id == application_id)
            )
            await session.commit()

            if template_ids:
                logger.debug(
                    "Application and associated templates deleted successfully",
                    application_id=str(application_id),
                    deleted_template_ids=[str(t_id) for t_id in template_ids],
                )
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e


@post(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GenerateApplication",
)
async def handle_generate_application(
    application_id: UUID, session_maker: async_sessionmaker[Any], request: APIRequest
) -> None:
    trace_id = get_trace_id(request)
    logger.info(
        "Generating application", application_id=application_id, trace_id=trace_id
    )
    async with session_maker() as session:
        try:
            application = await retrieve_application(
                application_id=application_id, session=session
            )
        except ValidationError as e:
            raise NotFoundException("Application not found") from e

        if (
            not application.title
            or not application.grant_template
            or not application.grant_template.grant_sections
            or not application.research_objectives
        ):
            raise ValidationException("Insufficient data to generate application.")

        rag_sources_count = await session.scalar(
            select(count())
            .select_from(GrantApplicationRagSource)
            .join(RagSource)
            .where(
                GrantApplicationRagSource.grant_application_id == application.id,
                RagSource.indexing_status.in_(
                    (
                        SourceIndexingStatusEnum.INDEXING,
                        SourceIndexingStatusEnum.FINISHED,
                    )
                ),
            )
        )

        if rag_sources_count == 0:
            raise ValidationException(
                "No rag sources found for application, cannot generate"
            )

        try:
            await publish_rag_task(
                logger=logger,
                parent_type="grant_application",
                parent_id=application.id,
                trace_id=trace_id,
            )
        except BackendError as e:
            logger.error("Error initiating application generation", exc_info=e)
            raise
        except SQLAlchemyError as e:
            logger.error("Error initiating application generation", exc_info=e)
            raise DatabaseError(
                "Error initiating application generation", context=str(e)
            ) from e


@get(
    "/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="RetrieveApplication",
)
async def handle_retrieve_application(
    project_id: UUID, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> ApplicationResponse:
    return await _handle_retrieve_application(project_id, application_id, session_maker)
