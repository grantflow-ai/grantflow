import asyncio
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, TypedDict
from uuid import UUID

from litestar import delete, get, post
from litestar.exceptions import NotFoundException
from litestar.handlers import HTTPRouteHandler
from litestar.types import Method, OperationIDCreator
from litestar.types.internal_types import PathParameterDefinition
from packages.db.src.constants import RAG_FILE, RAG_URL
from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.query_helpers import select_active_by_id
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Project,
    RagFile,
    RagGenerationJob,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.constants import SUPPORTED_FILE_EXTENSIONS, NotificationEvents
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from packages.shared_utils.src.gcs import (
    construct_object_uri,
    create_signed_download_url,
    create_signed_upload_url,
    delete_blob,
    get_bucket,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_url_crawling_task
from packages.shared_utils.src.url_utils import normalize_url
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound, OperationalError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import aliased, with_polymorphic

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest
from services.backend.src.utils.audit import DELETE_SOURCE, log_organization_audit_from_request

if TYPE_CHECKING:
    from packages.shared_utils.src.shared_types import EntityType

logger = get_logger(__name__)


class RagFileResponse(TypedDict):
    id: str
    filename: str
    size: int
    mime_type: str
    created_at: str
    indexing_status: SourceIndexingStatusEnum


class RagUrlResponse(TypedDict):
    id: str
    url: str
    title: str | None
    description: str | None
    created_at: str
    indexing_status: SourceIndexingStatusEnum


class UploadUrlResponse(TypedDict):
    url: str
    source_id: str


class DownloadUrlResponse(TypedDict):
    url: str


class UrlCrawlingRequest(TypedDict):
    url: str


class UrlCrawlingResponse(TypedDict):
    source_id: str


async def _get_application_id_from_template(
    session_maker: async_sessionmaker[Any],
    template_id: UUID,
) -> UUID:
    async with session_maker() as session:
        result: UUID | None = await session.scalar(
            select(GrantTemplate.grant_application_id).where(
                GrantTemplate.id == template_id,
                GrantTemplate.deleted_at.is_(None),
            )
        )
        if not result:
            raise NotFoundException("Grant template not found")
        return result


async def _determine_entity_info(
    session_maker: async_sessionmaker[Any],
    application_id: UUID | None = None,
    template_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    organization_id: UUID | None = None,
) -> tuple["EntityType", UUID, "EntityType", UUID]:
    if (application_id or template_id) and not organization_id:
        raise BackendError("organization_id required for grant application sources")

    if template_id:
        # the parent_id value for grant_template is the grant application id ~keep
        if not application_id:
            application_id = await _get_application_id_from_template(session_maker, template_id)

        return "grant_template", application_id, "grant_template", template_id

    if application_id:
        return "grant_application", application_id, "grant_application", application_id

    if granting_institution_id:
        return "granting_institution", granting_institution_id, "granting_institution", granting_institution_id

    raise BackendError("Missing parent_id")


def _create_operation_id_creator(key: str) -> OperationIDCreator:
    def _create_operation_id(_: HTTPRouteHandler, __: Method, paths: list[str | PathParameterDefinition]) -> str:
        if "grant_templates" in paths:
            return key.format(value="GrantTemplate")
        if "applications" in paths:
            return key.format(value="GrantApplication")
        return key.format(value="GrantingInstitution")

    return _create_operation_id


async def handle_create_rag_source(
    session_maker: async_sessionmaker[Any],
    url: str | None = None,
    blob_name: str | None = None,
    mime_type: str | None = None,
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    template_id: UUID | None = None,
) -> UUID:
    parent_type, parent_id, entity_type, entity_id = await _determine_entity_info(
        session_maker=session_maker,
        application_id=application_id,
        template_id=template_id,
        granting_institution_id=granting_institution_id,
        organization_id=organization_id,
    )

    async with session_maker() as session, session.begin():
        try:
            if url:
                normalized_url = normalize_url(url)
                rag_url_alias = aliased(RagUrl)

                parent_constraint = None
                if application_id:
                    parent_constraint = select(GrantApplicationSource.rag_source_id).where(
                        GrantApplicationSource.grant_application_id == application_id
                    )
                elif template_id:
                    parent_constraint = select(GrantTemplateSource.rag_source_id).where(
                        GrantTemplateSource.grant_template_id == template_id
                    )
                elif granting_institution_id:
                    parent_constraint = select(GrantingInstitutionSource.rag_source_id).where(
                        GrantingInstitutionSource.granting_institution_id == granting_institution_id
                    )

                query = (
                    select(RagSource)
                    .join(rag_url_alias, RagSource.id == rag_url_alias.id)
                    .where(rag_url_alias.url == normalized_url)
                )
                query = query.where(RagSource.deleted_at.is_(None))

                if parent_constraint is not None:
                    query = query.where(RagSource.id.in_(parent_constraint))

                if rag_source := await session.scalar(query):
                    if rag_source.indexing_status != SourceIndexingStatusEnum.FAILED:
                        return UUID(str(rag_source.id))

                    rag_source.soft_delete()

            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    [
                        {
                            "indexing_status": SourceIndexingStatusEnum.PENDING_UPLOAD,
                            "text_content": "",
                            "source_type": RAG_URL if url else RAG_FILE,  # Set polymorphic identity ~keep
                        }
                    ]
                )
                .returning(RagSource.id)
            )

            if url:
                await session.execute(
                    insert(RagUrl)
                    .values(
                        [
                            {
                                "id": source_id,
                                "url": normalize_url(url),
                            }
                        ]
                    )
                    .returning(RagUrl.id)
                )
            else:
                if not blob_name:
                    raise BackendError("Missing blob_name for file source")

                await session.execute(
                    insert(RagFile).values(
                        [
                            {
                                "id": source_id,
                                "filename": blob_name,
                                "mime_type": mime_type,
                                "size": 0,
                                "bucket_name": "",
                                "object_path": construct_object_uri(
                                    entity_type=entity_type,
                                    entity_id=entity_id,
                                    source_id=source_id,
                                    blob_name=blob_name,
                                ),
                            }
                        ]
                    )
                )

            await _create_junction_table_entry(session, parent_type, entity_id, source_id)

            return UUID(str(source_id))

        except SQLAlchemyError as e:
            logger.exception(
                "Error creating rag source",
                url=url,
                blob_name=blob_name,
                parent_type=parent_type,
                parent_id=parent_id,
                entity_id=entity_id,
                error_type=type(e).__name__,
            )
            raise DatabaseError("Error creating rag source", context=str(e)) from e


async def _create_junction_table_entry(
    session: AsyncSession,
    parent_type: str,
    entity_id: UUID,
    source_id: UUID,
) -> None:
    try:
        if parent_type == "grant_application":
            await session.execute(
                insert(GrantApplicationSource).values(
                    {
                        "rag_source_id": source_id,
                        "grant_application_id": entity_id,
                    }
                )
            )
        elif parent_type == "grant_template":
            await session.execute(
                insert(GrantTemplateSource).values(
                    {
                        "rag_source_id": source_id,
                        "grant_template_id": entity_id,
                    }
                )
            )
        else:
            await session.execute(
                insert(GrantingInstitutionSource).values(
                    {
                        "rag_source_id": source_id,
                        "granting_institution_id": entity_id,
                    }
                )
            )
    except SQLAlchemyError as e:
        logger.exception(
            "Critical error creating junction table entry",
            parent_type=parent_type,
            entity_id=entity_id,
            source_id=source_id,
            error_type=type(e).__name__,
        )
        raise


@get(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant_templates/{template_id:uuid}/sources",
        "/granting-institutions/{granting_institution_id:uuid}/sources",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    requires_backoffice_admin=True,
    operation_id=_create_operation_id_creator("Retrieve{value}RagSources"),
)
async def handle_retrieve_rag_sources(
    *,
    session_maker: async_sessionmaker[Any],
    organization_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    application_id: UUID | None = None,
    template_id: UUID | None = None,
) -> list[RagFileResponse | RagUrlResponse]:
    async with session_maker() as session:
        rag_poly = with_polymorphic(RagSource, [RagFile, RagUrl])

        if template_id:
            stmt = (
                select(rag_poly)
                .join(
                    GrantTemplateSource,
                    GrantTemplateSource.rag_source_id == rag_poly.id,
                )
                .where(
                    GrantTemplateSource.grant_template_id == template_id,
                    GrantTemplateSource.deleted_at.is_(None),
                    rag_poly.deleted_at.is_(None),
                )
            )
        elif application_id:
            stmt = (
                select(rag_poly)
                .join(
                    GrantApplicationSource,
                    GrantApplicationSource.rag_source_id == rag_poly.id,
                )
                .where(
                    GrantApplicationSource.grant_application_id == application_id,
                    GrantApplicationSource.deleted_at.is_(None),
                    rag_poly.deleted_at.is_(None),
                )
            )
        else:
            institution_id = granting_institution_id if granting_institution_id else organization_id
            stmt = (
                select(rag_poly)
                .join(
                    GrantingInstitutionSource,
                    GrantingInstitutionSource.rag_source_id == rag_poly.id,
                )
                .where(
                    GrantingInstitutionSource.granting_institution_id == institution_id,
                    GrantingInstitutionSource.deleted_at.is_(None),
                    rag_poly.deleted_at.is_(None),
                )
            )

        results = await session.scalars(stmt)
        ret: list[RagFileResponse | RagUrlResponse] = []

        for result in results:
            if isinstance(result, RagFile):
                ret.append(
                    RagFileResponse(
                        id=str(result.id),
                        filename=result.filename,
                        size=result.size,
                        mime_type=result.mime_type,
                        indexing_status=result.indexing_status,
                        created_at=result.created_at.isoformat(),
                    )
                )
            elif isinstance(result, RagUrl):
                ret.append(
                    RagUrlResponse(
                        id=str(result.id),
                        title=result.title,
                        url=result.url,
                        description=result.description,
                        indexing_status=result.indexing_status,
                        created_at=result.created_at.isoformat(),
                    )
                )

        return ret


@delete(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources/{source_id:uuid}",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant_templates/{template_id:uuid}/sources/{source_id:uuid}",
        "/granting-institutions/{granting_institution_id:uuid}/sources/{source_id:uuid}",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    requires_backoffice_admin=True,
    operation_id=_create_operation_id_creator("Delete{value}RagSource"),
)
async def handle_delete_rag_source(
    *,
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
    organization_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    source_id: UUID,
    application_id: UUID | None = None,
    template_id: UUID | None = None,
) -> None:
    async with session_maker() as session, session.begin():
        rag_poly = with_polymorphic(RagSource, [RagFile, RagUrl])

        if template_id:
            lock_statement = (
                select(RagSource)
                .join(GrantTemplateSource, GrantTemplateSource.rag_source_id == RagSource.id)
                .where(
                    GrantTemplateSource.grant_template_id == template_id,
                    RagSource.id == source_id,
                )
                .with_for_update(nowait=True)
            )
        elif application_id:
            lock_statement = (
                select(RagSource)
                .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagSource.id)
                .where(
                    GrantApplicationSource.grant_application_id == application_id,
                    RagSource.id == source_id,
                )
                .with_for_update(nowait=True)
            )
        else:
            institution_id = granting_institution_id if granting_institution_id else organization_id
            lock_statement = (
                select(RagSource)
                .join(GrantingInstitutionSource, GrantingInstitutionSource.rag_source_id == RagSource.id)
                .where(
                    GrantingInstitutionSource.granting_institution_id == institution_id,
                    RagSource.id == source_id,
                )
                .with_for_update(nowait=True)
            )

        try:
            base_source = await session.scalar(lock_statement)
            if base_source is None:
                raise NotFoundException("RAG source not found")

            source = await session.scalar(select(rag_poly).where(rag_poly.id == base_source.id))
            if source is None:
                raise NotFoundException("RAG source not found")

            # Idempotency: if already deleted, return success without error
            if source.deleted_at is not None:
                logger.info(
                    "Source already deleted, returning success",
                    source_id=source_id,
                    deleted_at=source.deleted_at,
                )
                return

            if template_id:
                audit_org_id = await session.scalar(
                    select(Project.organization_id)
                    .join(GrantApplication, GrantApplication.project_id == Project.id)
                    .join(GrantTemplate, GrantTemplate.grant_application_id == GrantApplication.id)
                    .where(
                        GrantTemplate.id == template_id,
                        GrantTemplate.deleted_at.is_(None),
                        GrantApplication.deleted_at.is_(None),
                        Project.deleted_at.is_(None),
                    )
                )
            elif application_id:
                audit_org_id = await session.scalar(
                    select(Project.organization_id)
                    .join(GrantApplication, GrantApplication.project_id == Project.id)
                    .where(
                        GrantApplication.id == application_id,
                        GrantApplication.deleted_at.is_(None),
                        Project.deleted_at.is_(None),
                    )
                )
            else:
                audit_org_id = None

            if audit_org_id:
                await log_organization_audit_from_request(
                    session=session,
                    request=request,
                    organization_id=audit_org_id,
                    action=DELETE_SOURCE,
                    details={
                        "source_id": str(source_id),
                        "source_type": source.source_type,
                        "application_id": str(application_id) if application_id else None,
                        "template_id": str(template_id) if template_id else None,
                        "organization_id": str(organization_id) if organization_id else None,
                        "granting_institution_id": str(granting_institution_id) if granting_institution_id else None,
                    },
                )

            if isinstance(source, RagFile):
                try:
                    await delete_blob(source.object_path)
                except Exception as e:
                    logger.warning(
                        "Failed to delete file from GCS, continuing with database deletion",
                        source_id=source_id,
                        object_path=source.object_path,
                        error=str(e),
                    )

            if template_id:
                template = await session.scalar(
                    select(GrantTemplate).where(
                        GrantTemplate.id == template_id,
                        GrantTemplate.deleted_at.is_(None),
                    )
                )
                if template:
                    rag_jobs = await session.scalars(
                        select(RagGenerationJob).where(
                            RagGenerationJob.grant_template_id == template_id,
                            RagGenerationJob.status.in_(
                                [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]
                            ),
                        )
                    )
                    for job in rag_jobs:
                        await _cancel_job_if_active(
                            session=session,
                            job_id=job.id,
                            reason="Template source deleted",
                        )

            elif application_id:
                application = await session.scalar(
                    select(GrantApplication).where(
                        GrantApplication.id == application_id,
                        GrantApplication.deleted_at.is_(None),
                    )
                )
                if application:
                    rag_jobs = await session.scalars(
                        select(RagGenerationJob).where(
                            RagGenerationJob.grant_application_id == application_id,
                            RagGenerationJob.status.in_(
                                [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]
                            ),
                        )
                    )
                    for job in rag_jobs:
                        await _cancel_job_if_active(
                            session=session,
                            job_id=job.id,
                            reason="Application source deleted",
                        )

            source.soft_delete()

        except NoResultFound as e:
            raise NotFoundException from e
        except OperationalError as e:
            # Handle NOWAIT lock timeout - row is locked by another transaction
            if "could not obtain lock" in str(e).lower() or "lock_timeout" in str(e).lower():
                logger.warning(
                    "Source is locked by another transaction, returning conflict",
                    source_id=source_id,
                    error=str(e),
                )
                raise DatabaseError(
                    "Source is currently being modified by another request", context={"source_id": str(source_id)}
                ) from e
            # Re-raise other operational errors
            logger.error("Operational error deleting RAG source", source_id=source_id, exc_info=e)
            raise DatabaseError("Error deleting RAG source", context=str(e)) from e
        except SQLAlchemyError as e:
            logger.error("Error deleting RAG source", source_id=source_id, exc_info=e)
            raise DatabaseError("Error deleting RAG source", context=str(e)) from e


@post(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources/upload-url",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant_templates/{template_id:uuid}/sources/upload-url",
        "/granting-institutions/{granting_institution_id:uuid}/sources/upload-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    requires_backoffice_admin=True,
    operation_id=_create_operation_id_creator("Create{value}RagSourceUploadUrl"),
)
async def handle_create_upload_url(
    session_maker: async_sessionmaker[Any],
    blob_name: str,
    request: APIRequest,
    organization_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    application_id: UUID | None = None,
    template_id: UUID | None = None,
    project_id: UUID | None = None,
) -> UploadUrlResponse:
    file_extension = blob_name.split(".")[-1].lower()
    mime_type = SUPPORTED_FILE_EXTENSIONS.get(file_extension)

    if not mime_type:
        raise ValidationError(
            f"Unsupported file extension: {file_extension}",
            context={
                "supported_extensions": list(SUPPORTED_FILE_EXTENSIONS.keys()),
            },
        )

    if not project_id and not organization_id and not granting_institution_id:
        raise ValidationError("Either project_id, organization_id, or granting_institution_id must be provided")

    source_id = await handle_create_rag_source(
        application_id=application_id,
        blob_name=blob_name,
        mime_type=mime_type,
        organization_id=organization_id,
        granting_institution_id=granting_institution_id,
        session_maker=session_maker,
        template_id=template_id,
    )

    await asyncio.sleep(0.2)

    _, _, entity_type, entity_id = await _determine_entity_info(
        session_maker=session_maker,
        application_id=application_id,
        template_id=template_id,
        granting_institution_id=granting_institution_id,
        organization_id=organization_id,
    )

    trace_id = get_trace_id(request)

    url = await create_signed_upload_url(
        entity_type=entity_type,
        entity_id=entity_id,
        source_id=source_id,
        blob_name=blob_name,
        trace_id=trace_id,
        content_type=mime_type,
    )

    return UploadUrlResponse(url=url, source_id=str(source_id))


@get(
    "/sources/{source_id:uuid}/download-url",
    operation_id=_create_operation_id_creator("Create{value}RagSourceDownloadUrl"),
)
async def handle_create_download_url(
    request: APIRequest,
    source_id: UUID,
    session_maker: async_sessionmaker[AsyncSession],
) -> DownloadUrlResponse:
    trace_id = get_trace_id(request)

    async with session_maker() as session:
        rag_file = await session.scalar(select_active_by_id(RagFile, source_id))

        if not rag_file:
            raise NotFoundException(f"RAG file with source_id {source_id} not found")

        url = await create_signed_download_url(
            bucket_name=get_bucket().name,
            object_path=rag_file.object_path,
            filename=rag_file.filename,
            trace_id=trace_id,
        )

        return DownloadUrlResponse(url=url)


@post(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources/crawl-url",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/grant_templates/{template_id:uuid}/sources/crawl-url",
        "/granting-institutions/{granting_institution_id:uuid}/sources/crawl-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    requires_backoffice_admin=True,
    operation_id=_create_operation_id_creator("Crawl{value}Url"),
)
async def handle_crawl_url(
    session_maker: async_sessionmaker[Any],
    data: UrlCrawlingRequest,
    request: APIRequest,
    organization_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    application_id: UUID | None = None,
    template_id: UUID | None = None,
    project_id: UUID | None = None,
) -> UrlCrawlingResponse:
    trace_id = get_trace_id(request)
    url = data["url"]

    if not project_id and not organization_id and not granting_institution_id:
        raise ValidationError("Either project_id, organization_id, or granting_institution_id must be provided")

    source_id = await handle_create_rag_source(
        session_maker=session_maker,
        url=url,
        application_id=application_id,
        organization_id=organization_id,
        granting_institution_id=granting_institution_id,
        template_id=template_id,
    )

    await asyncio.sleep(0.2)

    _, _, entity_type, entity_id = await _determine_entity_info(
        session_maker=session_maker,
        application_id=application_id,
        template_id=template_id,
        granting_institution_id=granting_institution_id,
        organization_id=organization_id,
    )

    await publish_url_crawling_task(
        url=url,
        source_id=source_id,
        entity_type=entity_type,
        entity_id=entity_id,
        trace_id=trace_id,
    )

    return UrlCrawlingResponse(
        source_id=str(source_id),
    )


async def _cancel_job_if_active(
    session: AsyncSession,
    job_id: UUID,
    reason: str,
) -> None:
    job = await session.get(RagGenerationJob, job_id)
    if job and job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]:
        job.status = RagGenerationStatusEnum.CANCELLED
        job.failed_at = datetime.now(UTC)
        job.error_message = reason

        notification = GenerationNotification(
            rag_job_id=job_id,
            event=NotificationEvents.JOB_CANCELLED,
            message=f"Job cancelled: {reason}",
            notification_type="warning",
        )
        session.add(notification)
