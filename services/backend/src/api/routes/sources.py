from typing import TYPE_CHECKING, Any, TypedDict
from uuid import UUID

from litestar import delete, get, post
from litestar.exceptions import NotFoundException
from litestar.handlers import HTTPRouteHandler
from litestar.types import Method, OperationIDCreator
from litestar.types.internal_types import PathParameterDefinition
from packages.db.src.constants import RAG_FILE, RAG_URL
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Project,
    RagFile,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.constants import SUPPORTED_FILE_EXTENSIONS
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from packages.shared_utils.src.gcs import (
    EntityType,
    construct_object_uri,
    create_signed_upload_url,
    delete_blob,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_url_crawling_task
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import aliased, with_polymorphic

from services.backend.src.api.middleware import get_trace_id
from services.backend.src.common_types import APIRequest
from services.backend.src.utils.audit import DELETE_SOURCE, log_organization_audit_from_request

if TYPE_CHECKING:
    from packages.shared_utils.src.shared_types import ParentType

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


class UrlCrawlingRequest(TypedDict):
    url: str


class UrlCrawlingResponse(TypedDict):
    source_id: str


def determine_entity_info(
    application_id: UUID | None = None,
    template_id: UUID | None = None,
    granting_institution_id: UUID | None = None,
    organization_id: UUID | None = None,
) -> tuple["ParentType", UUID, EntityType, UUID]:
    """Determine parent type, parent ID, entity type, and entity ID from parameters."""
    if application_id:
        if not organization_id:
            raise BackendError("organization_id required for grant application sources")
        return "grant_application", application_id, "organization", organization_id
    if granting_institution_id:
        return "granting_institution", granting_institution_id, "granting_institution", granting_institution_id
    if template_id:
        if not organization_id:
            raise BackendError("organization_id required for grant template sources")
        return "grant_template", template_id, "organization", organization_id
    raise BackendError("Missing parent_id")


def _create_operation_id_creator(key: str) -> OperationIDCreator:
    def _create_operation_id(_: HTTPRouteHandler, __: Method, paths: list[str | PathParameterDefinition]) -> str:
        if "applications" in paths:
            return key.format(value="GrantApplication")
        if "grant_templates" in paths:
            return key.format(value="GrantTemplate")
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
    parent_type, parent_id, entity_type, entity_id = determine_entity_info(
        application_id=application_id,
        template_id=template_id,
        granting_institution_id=granting_institution_id,
        organization_id=organization_id,
    )

    async with session_maker() as session, session.begin():
        try:
            rag_url_alias = aliased(RagUrl)
            rag_source = await session.scalar(
                select(RagSource)
                .join(rag_url_alias)
                .where(
                    rag_url_alias.url == url,
                    RagSource.deleted_at.is_(None),
                )
            )
            if rag_source:
                if rag_source.indexing_status != SourceIndexingStatusEnum.FAILED:
                    return UUID(str(rag_source.id))

                rag_source.soft_delete()

            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    [
                        {
                            "indexing_status": SourceIndexingStatusEnum.CREATED,
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
                                "url": url,
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

            if parent_type == "grant_application":
                await session.execute(
                    insert(GrantApplicationSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_application_id": parent_id,
                        }
                    )
                )
            elif parent_type == "granting_institution":
                await session.execute(
                    insert(GrantingInstitutionSource).values(
                        {
                            "rag_source_id": source_id,
                            "granting_institution_id": parent_id,
                        }
                    )
                )
            else:
                await session.execute(
                    insert(GrantTemplateSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_template_id": parent_id,
                        }
                    )
                )
            logger.info(
                "Created new rag source",
                source_id=source_id,
                parent_type=parent_type,
                parent_id=parent_id,
            )
            return UUID(str(source_id))
        except SQLAlchemyError as e:
            logger.exception(
                "Error creating rag source",
                url=url,
                parent_type=parent_type,
                parent_id=parent_id,
            )
            await session.rollback()
            raise DatabaseError("Error creating rag source", context=str(e)) from e


@get(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/grant_templates/{template_id:uuid}/sources",
        "/granting-institutions/{granting_institution_id:uuid}/sources",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
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

        if application_id:
            stmt = (
                select(rag_poly)
                .join(
                    GrantApplicationSource,
                    GrantApplicationSource.rag_source_id == rag_poly.id,
                )
                .where(GrantApplicationSource.grant_application_id == application_id)
            )
        elif template_id:
            stmt = (
                select(rag_poly)
                .join(
                    GrantTemplateSource,
                    GrantTemplateSource.rag_source_id == rag_poly.id,
                )
                .where(GrantTemplateSource.grant_template_id == template_id)
            )
        else:
            institution_id = granting_institution_id if granting_institution_id else organization_id
            stmt = (
                select(rag_poly)
                .join(
                    GrantingInstitutionSource,
                    GrantingInstitutionSource.rag_source_id == rag_poly.id,
                )
                .where(GrantingInstitutionSource.granting_institution_id == institution_id)
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
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/grant_templates/{template_id:uuid}/sources/{source_id:uuid}",
        "/granting-institutions/{granting_institution_id:uuid}/sources/{source_id:uuid}",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
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

        if application_id:
            statement = (
                select(rag_poly)
                .join(GrantApplicationSource)
                .where(
                    GrantApplicationSource.grant_application_id == application_id,
                    rag_poly.id == source_id,
                )
            )
        elif template_id:
            statement = (
                select(rag_poly)
                .join(GrantTemplateSource)
                .where(
                    GrantTemplateSource.grant_template_id == template_id,
                    rag_poly.id == source_id,
                )
            )
        else:
            institution_id = granting_institution_id if granting_institution_id else organization_id
            statement = (
                select(rag_poly)
                .join(GrantingInstitutionSource)
                .where(
                    GrantingInstitutionSource.granting_institution_id == institution_id,
                    rag_poly.id == source_id,
                )
            )

        try:
            result = await session.execute(statement)
            source = result.scalar_one()

            if application_id:
                audit_org_id = await session.scalar(
                    select(Project.organization_id)
                    .join(GrantApplication)
                    .where(
                        GrantApplication.id == application_id,
                        GrantApplication.deleted_at.is_(None),
                        Project.deleted_at.is_(None),
                    )
                )
            elif template_id:
                audit_org_id = await session.scalar(
                    select(Project.organization_id)
                    .join(GrantApplication)
                    .join(GrantTemplate)
                    .where(
                        GrantTemplate.id == template_id,
                        GrantTemplate.deleted_at.is_(None),
                        GrantApplication.deleted_at.is_(None),
                        Project.deleted_at.is_(None),
                    )
                )
            else:
                audit_org_id = granting_institution_id if granting_institution_id else organization_id

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
                    logger.info(
                        "Deleted file from GCS",
                        source_id=source_id,
                        object_path=source.object_path,
                    )
                except Exception as e:
                    logger.warning(
                        "Failed to delete file from GCS, continuing with database deletion",
                        source_id=source_id,
                        object_path=source.object_path,
                        error=str(e),
                    )

            source.soft_delete()
            await session.commit()

            logger.info("Successfully soft deleted RAG source", source_id=source_id)

        except NoResultFound as e:
            raise NotFoundException from e
        except SQLAlchemyError as e:
            logger.error("Error deleting RAG source", source_id=source_id, exc_info=e)
            await session.rollback()
            raise DatabaseError("Error deleting RAG source", context=str(e)) from e


@post(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources/upload-url",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/grant_templates/{template_id:uuid}/sources/upload-url",
        "/granting-institutions/{granting_institution_id:uuid}/sources/upload-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
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

    _, _, entity_type, entity_id = determine_entity_info(
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


@post(
    [
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/applications/{application_id:uuid}/sources/crawl-url",
        "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/grant_templates/{template_id:uuid}/sources/crawl-url",
        "/granting-institutions/{granting_institution_id:uuid}/sources/crawl-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
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

    logger.debug(
        "Starting URL crawl request",
        url=url,
        trace_id=trace_id,
        application_id=str(application_id) if application_id else None,
        organization_id=str(organization_id) if organization_id else None,
        granting_institution_id=str(granting_institution_id) if granting_institution_id else None,
        template_id=str(template_id) if template_id else None,
    )

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

    _, _, entity_type, entity_id = determine_entity_info(
        application_id=application_id,
        template_id=template_id,
        granting_institution_id=granting_institution_id,
        organization_id=organization_id,
    )

    message_id = await publish_url_crawling_task(
        logger=logger,
        url=url,
        source_id=source_id,
        entity_type=entity_type,
        entity_id=entity_id,
        trace_id=trace_id,
    )

    logger.info(
        "Published URL crawling task",
        url=url,
        message_id=message_id,
        trace_id=trace_id,
    )

    return UrlCrawlingResponse(
        source_id=str(source_id),
    )
