import asyncio
from typing import Any, Literal, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import NotFoundException, ValidationException
from litestar.params import Parameter
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
    GrantApplicationSource,
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
from packages.shared_utils.src.pubsub import publish_autofill_task, publish_rag_task
from sqlalchemy import func, insert, or_, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.functions import count

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest
from services.backend.src.utils.audit import DELETE_APPLICATION, log_organization_audit_from_request

logger = get_logger(__name__)


class CreateApplicationRequestBody(TypedDict):
    title: str
    description: NotRequired[str]


class UpdateApplicationRequestBody(TypedDict):
    form_inputs: NotRequired[ResearchDeepDive]
    research_objectives: NotRequired[list[ResearchObjective]]
    status: NotRequired[ApplicationStatusEnum]
    text: NotRequired[str]
    title: NotRequired[str]
    description: NotRequired[str]


class AutofillRequestBody(TypedDict):
    autofill_type: Literal["research_plan", "research_deep_dive"]
    field_name: NotRequired[str]
    context: NotRequired[dict[str, Any]]


class DuplicateApplicationRequestBody(TypedDict):
    title: str


class AutofillResponse(TypedDict):
    message_id: str
    application_id: str
    autofill_type: str
    field_name: NotRequired[str]


class GrantingInstitutionResponse(TypedDict):
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
    granting_institution_id: NotRequired[str]
    granting_institution: NotRequired[GrantingInstitutionResponse]
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
    description: NotRequired[str]
    status: ApplicationStatusEnum
    completed_at: NotRequired[str]
    form_inputs: NotRequired[ResearchDeepDive]
    research_objectives: NotRequired[list[ResearchObjective]]
    text: NotRequired[str]
    grant_template: NotRequired[GrantTemplateResponse]
    rag_sources: list[SourceResponse]
    rag_job_id: NotRequired[str]
    parent_id: NotRequired[str]
    deadline: NotRequired[str]
    created_at: str
    updated_at: str


class ApplicationListItemResponse(TypedDict):
    id: str
    project_id: str
    title: str
    description: NotRequired[str]
    status: ApplicationStatusEnum
    completed_at: NotRequired[str]
    parent_id: NotRequired[str]
    deadline: NotRequired[str]
    created_at: str
    updated_at: str
    submission_date: NotRequired[str]


class PaginationMetadata(TypedDict):
    total: int
    limit: int
    offset: int
    has_more: bool


class ApplicationListResponse(TypedDict):
    applications: list[ApplicationListItemResponse]
    pagination: PaginationMetadata


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
    organization_id: UUID, project_id: UUID, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> ApplicationResponse:
    logger.info(
        "Retrieving application",
        organization_id=organization_id,
        project_id=project_id,
        application_id=application_id,
    )
    async with session_maker() as session:
        try:
            grant_application = await retrieve_application(application_id=application_id, session=session)
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

        if grant_application.description:
            response["description"] = grant_application.description

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

        if grant_application.parent_id:
            response["parent_id"] = str(grant_application.parent_id)

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

            if template.granting_institution_id:
                template_response["granting_institution_id"] = str(template.granting_institution_id)

            if template.submission_date:
                template_response["submission_date"] = template.submission_date.isoformat()

                response["deadline"] = template.submission_date.isoformat()

            if template.rag_job_id:
                template_response["rag_job_id"] = str(template.rag_job_id)

            if template.granting_institution:
                org = template.granting_institution
                granting_institution_response: GrantingInstitutionResponse = {
                    "id": str(org.id),
                    "full_name": org.full_name,
                    "created_at": org.created_at.isoformat(),
                    "updated_at": org.updated_at.isoformat(),
                }
                if org.abbreviation:
                    granting_institution_response["abbreviation"] = org.abbreviation
                template_response["granting_institution"] = granting_institution_response

            if hasattr(template, "rag_sources") and template.rag_sources:
                for template_rag_source in template.rag_sources:
                    source_response = _build_source_response(template_rag_source.rag_source)
                    template_response["rag_sources"].append(source_response)

            response["grant_template"] = template_response

        if grant_application.rag_sources:
            for app_rag_source in grant_application.rag_sources:
                source_response = _build_source_response(app_rag_source.rag_source)
                response["rag_sources"].append(source_response)

    return response


@post(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="CreateApplication",
)
async def handle_create_application(
    organization_id: UUID,
    project_id: UUID,
    data: CreateApplicationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> ApplicationResponse:
    logger.info("Creating application", organization_id=organization_id, project_id=project_id, title=data["title"])

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                insert(GrantApplication)
                .values(
                    {
                        "project_id": project_id,
                        "title": data["title"],
                        "description": data.get("description") or None,
                        "status": ApplicationStatusEnum.WORKING_DRAFT,
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
            raise DatabaseError("Error creating application and template", context=str(e)) from e

    return await _handle_retrieve_application(
        organization_id=organization_id,
        project_id=project_id,
        application_id=application.id,
        session_maker=session_maker,
    )


@patch(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="UpdateApplication",
)
async def handle_update_application(
    organization_id: UUID,
    project_id: UUID,
    application_id: UUID,
    data: UpdateApplicationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> ApplicationResponse:
    logger.info(
        "Updating application", organization_id=organization_id, project_id=project_id, application_id=application_id
    )

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                select(GrantApplication)
                .where(GrantApplication.id == application_id)
                .where(GrantApplication.project_id == project_id)
                .where(GrantApplication.deleted_at.is_(None))
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

    return await _handle_retrieve_application(
        organization_id=organization_id,
        project_id=project_id,
        application_id=application_id,
        session_maker=session_maker,
    )


@delete(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="DeleteApplication",
)
async def handle_delete_application(
    request: APIRequest,
    organization_id: UUID,
    project_id: UUID,
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Deleting application", organization_id=organization_id, application_id=application_id)

    async with session_maker() as session, session.begin():
        try:
            application = await session.scalar(
                select(GrantApplication)
                .where(
                    GrantApplication.id == application_id,
                    GrantApplication.project_id == project_id,
                    GrantApplication.deleted_at.is_(None),
                )
                .options(selectinload(GrantApplication.project))
            )
            if not application:
                raise ValidationException("Application not found")

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=application.project.organization_id,
                action=DELETE_APPLICATION,
                details={
                    "application_id": str(application_id),
                    "application_title": application.title,
                    "project_id": str(application.project_id),
                },
            )

            template_result = await session.execute(
                select(GrantTemplate.id).where(
                    GrantTemplate.grant_application_id == application_id,
                    GrantTemplate.deleted_at.is_(None),
                )
            )
            template_ids = template_result.scalars().all()

            if template_ids:
                logger.debug(
                    "Grant templates will be soft deleted due to CASCADE",
                    application_id=str(application_id),
                    template_ids=[str(t_id) for t_id in template_ids],
                )

            application.soft_delete()
            await session.commit()

            if template_ids:
                logger.debug(
                    "Application and associated templates soft deleted successfully",
                    application_id=str(application_id),
                    deleted_template_ids=[str(t_id) for t_id in template_ids],
                )
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e


@post(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="GenerateApplication",
)
async def handle_generate_application(
    organization_id: UUID, application_id: UUID, session_maker: async_sessionmaker[Any], request: APIRequest
) -> None:
    trace_id = get_trace_id(request)
    logger.info(
        "Generating application", organization_id=organization_id, application_id=application_id, trace_id=trace_id
    )
    async with session_maker() as session:
        try:
            application = await retrieve_application(application_id=application_id, session=session)
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
            .select_from(GrantApplicationSource)
            .join(RagSource)
            .where(
                GrantApplicationSource.grant_application_id == application.id,
                RagSource.indexing_status.in_(
                    (
                        SourceIndexingStatusEnum.INDEXING,
                        SourceIndexingStatusEnum.FINISHED,
                    )
                ),
            )
        )

        if rag_sources_count == 0:
            raise ValidationException("No rag sources found for application, cannot generate")

        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == application.id)
            .values(status=ApplicationStatusEnum.GENERATING)
        )
        await session.commit()

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
            raise DatabaseError("Error initiating application generation", context=str(e)) from e


@get(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="RetrieveApplication",
)
async def handle_retrieve_application(
    organization_id: UUID, project_id: UUID, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> ApplicationResponse:
    return await _handle_retrieve_application(organization_id, project_id, application_id, session_maker)


@get(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="ListApplications",
)
async def handle_list_applications(
    organization_id: UUID,
    project_id: UUID,
    session_maker: async_sessionmaker[Any],
    search: str | None = Parameter(
        default=None,
        description="Search query for filtering applications by title or description",
    ),
    status: ApplicationStatusEnum | None = None,
    sort: str = Parameter(
        default="updated_at",
        description="Sort field (title, created_at, updated_at, completed_at)",
        pattern="^(title|created_at|updated_at|completed_at)$",
    ),
    order: str = Parameter(
        default="desc",
        description="Sort order (asc, desc)",
        pattern="^(asc|desc)$",
    ),
    limit: int = Parameter(
        default=50,
        description="Number of items to return",
        ge=1,
        le=100,
    ),
    offset: int = Parameter(
        default=0,
        description="Number of items to skip",
        ge=0,
    ),
) -> ApplicationListResponse:
    logger.info(
        "Listing applications",
        organization_id=organization_id,
        project_id=project_id,
        search=search,
        status=status,
        sort=sort,
        order=order,
        limit=limit,
        offset=offset,
    )

    async with session_maker() as session:
        query = (
            select(GrantApplication, GrantTemplate.submission_date)
            .where(
                GrantApplication.project_id == project_id,
                GrantApplication.deleted_at.is_(None),
            )
            .outerjoin(GrantTemplate, GrantTemplate.grant_application_id == GrantApplication.id)
        )

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    GrantApplication.title.ilike(search_pattern),
                    GrantApplication.text.ilike(search_pattern),
                )
            )

        if status:
            query = query.where(GrantApplication.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total_count = await session.scalar(count_query)
        total_count = total_count or 0

        sort_column = getattr(GrantApplication, sort)
        query = query.order_by(sort_column.desc()) if order == "desc" else query.order_by(sort_column.asc())
        query = query.limit(limit).offset(offset)

        results = await session.execute(query)
        rows = results.all()

        application_items: list[ApplicationListItemResponse] = []
        for row in rows:
            app = row[0]
            submission_date = row[1]

            item: ApplicationListItemResponse = {
                "id": str(app.id),
                "project_id": str(app.project_id),
                "title": app.title,
                "status": app.status,
                "created_at": app.created_at.isoformat(),
                "updated_at": app.updated_at.isoformat(),
            }
            if app.description:
                item["description"] = app.description
            if submission_date:
                item["submission_date"] = submission_date.isoformat()

                item["deadline"] = submission_date.isoformat()
            if app.completed_at:
                item["completed_at"] = app.completed_at.isoformat()
            if app.parent_id:
                item["parent_id"] = str(app.parent_id)
            application_items.append(item)

        return ApplicationListResponse(
            applications=application_items,
            pagination=PaginationMetadata(
                total=total_count,
                limit=limit,
                offset=offset,
                has_more=(offset + limit) < total_count,
            ),
        )


@post(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/autofill",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="TriggerAutofill",
)
async def handle_trigger_autofill(
    request: APIRequest,
    organization_id: UUID,
    project_id: UUID,
    application_id: UUID,
    data: AutofillRequestBody,
    session_maker: async_sessionmaker[Any],
) -> AutofillResponse:
    """Trigger autofill for a grant application"""
    trace_id = get_trace_id(request)

    logger.info(
        "Triggering autofill",
        organization_id=organization_id,
        project_id=project_id,
        application_id=application_id,
        autofill_type=data["autofill_type"],
        field_name=data.get("field_name"),
        trace_id=trace_id,
    )

    async with session_maker() as session:
        application = await retrieve_application(
            session=session,
            application_id=application_id,
        )

        if application.project_id != project_id:
            raise NotFoundException("Application not found")

    message_id = await publish_autofill_task(
        logger=logger,
        parent_id=application_id,
        autofill_type=data["autofill_type"],
        field_name=data.get("field_name"),
        context=data.get("context"),
        trace_id=trace_id,
    )

    logger.info(
        "Autofill task published",
        message_id=message_id,
        application_id=application_id,
        autofill_type=data["autofill_type"],
        trace_id=trace_id,
    )

    response: AutofillResponse = {
        "message_id": message_id,
        "application_id": str(application_id),
        "autofill_type": data["autofill_type"],
    }

    if field_name := data.get("field_name"):
        response["field_name"] = field_name

    return response


@post(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/duplicate",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="DuplicateApplication",
)
async def handle_duplicate_application(
    organization_id: UUID,
    project_id: UUID,
    application_id: UUID,
    data: DuplicateApplicationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> ApplicationResponse:
    """Duplicate an existing grant application with forking model"""
    logger.info(
        "Duplicating application",
        organization_id=organization_id,
        project_id=project_id,
        application_id=application_id,
        new_title=data["title"],
    )

    new_app_id = None

    async with session_maker() as session, session.begin():
        try:
            original_app = await session.scalar(
                select(GrantApplication).where(
                    GrantApplication.id == application_id,
                    GrantApplication.project_id == project_id,
                    GrantApplication.deleted_at.is_(None),
                )
            )

            if not original_app:
                raise NotFoundException("Application not found")

            template = await session.scalar(
                select(GrantTemplate).where(
                    GrantTemplate.grant_application_id == application_id,
                    GrantTemplate.deleted_at.is_(None),
                )
            )

            new_app = await session.scalar(
                insert(GrantApplication)
                .values(
                    {
                        "project_id": project_id,
                        "title": data["title"],
                        "description": original_app.description,
                        "status": ApplicationStatusEnum.WORKING_DRAFT,
                        "form_inputs": original_app.form_inputs,
                        "research_objectives": original_app.research_objectives,
                        "text": original_app.text,
                        "parent_id": application_id,
                    }
                )
                .returning(GrantApplication)
            )

            new_app_id = new_app.id

            if template:
                new_template = await session.scalar(
                    insert(GrantTemplate)
                    .values(
                        {
                            "grant_application_id": new_app.id,
                            "grant_sections": template.grant_sections,
                            "granting_institution_id": template.granting_institution_id,
                            "submission_date": template.submission_date,
                        }
                    )
                    .returning(GrantTemplate)
                )
                logger.info(
                    "Grant template duplicated",
                    original_template_id=str(template.id),
                    new_template_id=str(new_template.id),
                    new_app_id=str(new_app.id),
                )

            rag_sources = await session.execute(
                select(GrantApplicationSource).where(
                    GrantApplicationSource.grant_application_id == application_id,
                    GrantApplicationSource.deleted_at.is_(None),
                )
            )
            for rag_source in rag_sources.scalars():
                await session.execute(
                    insert(GrantApplicationSource).values(
                        {
                            "grant_application_id": new_app.id,
                            "rag_source_id": rag_source.rag_source_id,
                        }
                    )
                )

            await session.commit()

            # Ensure all data is flushed to the database
            await session.flush()

            logger.info(
                "Application duplicated successfully",
                original_id=str(application_id),
                new_id=str(new_app.id),
                parent_id=str(application_id),
            )

        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error duplicating application", exc_info=e)
            raise DatabaseError("Error duplicating application", context=str(e)) from e

    # Small delay to ensure committed data is visible across sessions
    # This addresses a race condition in tests and potentially in production
    await asyncio.sleep(0.1)

    return await _handle_retrieve_application(
        organization_id=organization_id,
        project_id=project_id,
        application_id=new_app_id,
        session_maker=session_maker,
    )
