from typing import TYPE_CHECKING, Any, TypedDict, cast
from uuid import UUID

from litestar import delete, get, post
from litestar.exceptions import NotFoundException
from litestar.handlers import HTTPRouteHandler
from litestar.types import Method, OperationIDCreator
from litestar.types.internal_types import PathParameterDefinition
from packages.db.src.enums import SourceIndexingStatusEnum, UserRoleEnum
from packages.db.src.tables import (
    FundingOrganizationRagSource,
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    RagFile,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.exceptions import DatabaseError, ValidationError
from packages.shared_utils.src.gcs import create_signed_upload_url, construct_object_uri
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_url_crawling_task
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import with_polymorphic

from packages.db.src.constants import RAG_URL, RAG_FILE
from packages.shared_utils.src.exceptions import BackendError

if TYPE_CHECKING:
    from packages.shared_utils.src.shared_types import ParentType

logger = get_logger(__name__)

SUPPORTED_FILE_EXTENSIONS = {
    "csv": "text/csv",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "latex": "text/latex",
    "md": "text/markdown",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rst": "text/rst",
    "rtf": "text/rtf",
    "txt": "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


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
    source_id: UUID


class UrlCrawlingRequest(TypedDict):
    url: str


class UrlCrawlingResponse(TypedDict):
    source_id: UUID


def _create_operation_id_creator(key: str) -> OperationIDCreator:
    def _create_operation_id(
        _: HTTPRouteHandler, __: Method, paths: list[str | PathParameterDefinition]
    ) -> str:
        if "applications" in paths:
            return key.format(value="GrantApplication")
        if "grant_templates" in paths:
            return key.format(value="GrantTemplate")
        return key.format(value="FundingOrganization")

    return _create_operation_id


async def handle_create_rag_source(
    session_maker: async_sessionmaker[Any],
    workspace_id: UUID,
    url: str | None = None,
    blob_name: str | None = None,
    mime_type: str | None = None,
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    template_id: UUID | None = None,
) -> UUID:
    parent_type: ParentType
    parent_id: UUID

    if application_id:
        parent_type = "grant_application"
        parent_id = application_id
    elif organization_id:
        parent_type = "funding_organization"
        parent_id = organization_id
    elif template_id:
        parent_type = "grant_template"
        parent_id = template_id
    else:
        raise BackendError("Missing parent_id")

    async with session_maker() as session, session.begin():
        try:
            rag_source = await session.scalar(
                select(RagSource).join(RagUrl).where(RagUrl.url == url)
            )
            if rag_source:
                if rag_source.indexing_status != SourceIndexingStatusEnum.FAILED:
                    return cast(UUID, rag_source.id)

                await session.execute(
                    sa_delete(RagSource).where(RagSource.id == rag_source.id)
                )

            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    [
                        {
                            "indexing_status": SourceIndexingStatusEnum.CREATED,
                            "text_content": "",
                            "source_type": RAG_URL
                            if url
                            else RAG_FILE,  # Set polymorphic identity ~keep
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
                                    workspace_id=workspace_id,
                                    parent_id=parent_id,
                                    source_id=source_id,
                                    blob_name=blob_name,
                                ),
                            }
                        ]
                    )
                )

            if parent_type == "grant_application":
                await session.execute(
                    insert(GrantApplicationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_application_id": parent_id,
                        }
                    )
                )
            elif parent_type == "funding_organization":
                await session.execute(
                    insert(FundingOrganizationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "funding_organization_id": parent_id,
                        }
                    )
                )
            else:
                await session.execute(
                    insert(GrantTemplateRagSource).values(
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
            return cast(UUID, source_id)
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
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources",
        "/workspaces/{workspace_id:uuid}/grant_templates/{template_id:uuid}/sources",
        "/organizations/{organization_id:uuid}/sources",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Retrieve{value}RagSources"),
)
async def handle_retrieve_rag_sources(
    session_maker: async_sessionmaker[Any],
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    template_id: UUID | None = None,
) -> list[RagFileResponse | RagUrlResponse]:
    async with session_maker() as session:
        rag_poly = with_polymorphic(RagSource, [RagFile, RagUrl])

        if application_id:
            stmt = (
                select(rag_poly)
                .join(
                    GrantApplicationRagSource,
                    GrantApplicationRagSource.rag_source_id == rag_poly.id,
                )
                .where(GrantApplicationRagSource.grant_application_id == application_id)
            )
        elif template_id:
            stmt = (
                select(rag_poly)
                .join(
                    GrantTemplateRagSource,
                    GrantTemplateRagSource.rag_source_id == rag_poly.id,
                )
                .where(GrantTemplateRagSource.grant_template_id == template_id)
            )
        else:
            stmt = (
                select(rag_poly)
                .join(
                    FundingOrganizationRagSource,
                    FundingOrganizationRagSource.rag_source_id == rag_poly.id,
                )
                .where(
                    FundingOrganizationRagSource.funding_organization_id
                    == organization_id
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
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources/{source_id:uuid}",
        "/workspaces/{workspace_id:uuid}/grant_templates/{template_id:uuid}/sources/{source_id:uuid}",
        "/organizations/{organization_id:uuid}/sources/{source_id:uuid}",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Delete{value}RagSource"),
)
async def handle_delete_rag_source(
    session_maker: async_sessionmaker[Any],
    source_id: UUID,
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    template_id: UUID | None = None,
) -> None:
    async with session_maker() as session, session.begin():
        if application_id:
            statement = (
                select(RagSource)
                .join(GrantApplicationRagSource)
                .where(GrantApplicationRagSource.grant_application_id == application_id)
            )
        elif template_id:
            statement = (
                select(RagSource)
                .join(GrantTemplateRagSource)
                .where(GrantTemplateRagSource.grant_template_id == template_id)
            )
        else:
            statement = (
                select(RagSource)
                .join(FundingOrganizationRagSource)
                .where(
                    FundingOrganizationRagSource.funding_organization_id
                    == organization_id
                )
            )

        try:
            result = await session.execute(statement)
            result.scalar_one()
            await session.execute(sa_delete(RagSource).where(RagSource.id == source_id))
            await session.commit()
        except NoResultFound as e:
            raise NotFoundException from e
        except SQLAlchemyError as e:
            logger.error("Error deleting organization file", exc_info=e)
            await session.rollback()
            raise DatabaseError(
                "Error deleting organization file", context=str(e)
            ) from e


@post(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources/upload-url",
        "/workspaces/{workspace_id:uuid}/grant_templates/{template_id:uuid}/sources/upload-url",
        "/organizations/{organization_id:uuid}/sources/upload-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Create{value}RagSourceUploadUrl"),
)
async def handle_create_upload_url(
    session_maker: async_sessionmaker[Any],
    blob_name: str,
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    template_id: UUID | None = None,
    workspace_id: UUID | None = None,
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

    if organization_id:
        # For organization endpoints, we use organization_id as workspace_id
        effective_workspace_id = organization_id
    elif workspace_id:
        effective_workspace_id = workspace_id
    else:
        raise ValidationError("Either workspace_id or organization_id must be provided")

    source_id = await handle_create_rag_source(
        application_id=application_id,
        blob_name=blob_name,
        mime_type=mime_type,
        organization_id=organization_id,
        session_maker=session_maker,
        template_id=template_id,
        workspace_id=effective_workspace_id,
    )

    if application_id:
        parent_id = application_id
    elif organization_id:
        parent_id = organization_id
    elif template_id:
        parent_id = template_id
    else:
        raise ValidationError(
            "One of application_id, organization_id, or template_id must be provided"
        )

    url = await create_signed_upload_url(
        workspace_id=effective_workspace_id,
        parent_id=parent_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    return UploadUrlResponse(url=url, source_id=source_id)


@post(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources/crawl-url",
        "/workspaces/{workspace_id:uuid}/grant_templates/{template_id:uuid}/sources/crawl-url",
        "/organizations/{organization_id:uuid}/sources/crawl-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Crawl{value}Url"),
)
async def handle_crawl_url(
    session_maker: async_sessionmaker[Any],
    data: UrlCrawlingRequest,
    application_id: UUID | None = None,
    organization_id: UUID | None = None,
    template_id: UUID | None = None,
    workspace_id: UUID | None = None,
) -> UrlCrawlingResponse:
    url = data["url"]

    if organization_id:
        # For organization endpoints, we use organization_id as workspace_id
        effective_workspace_id = organization_id
    elif workspace_id:
        effective_workspace_id = workspace_id
    else:
        raise ValidationError("Either workspace_id or organization_id must be provided")

    source_id = await handle_create_rag_source(
        session_maker=session_maker,
        workspace_id=effective_workspace_id,
        url=url,
        application_id=application_id,
        organization_id=organization_id,
        template_id=template_id,
    )

    if application_id:
        parent_id = application_id
    elif organization_id:
        parent_id = organization_id
    elif template_id:
        parent_id = template_id
    else:
        raise ValidationError(
            "One of application_id, organization_id, or template_id must be provided"
        )

    message_id = await publish_url_crawling_task(
        logger=logger,
        url=url,
        source_id=source_id,
        workspace_id=effective_workspace_id,
        parent_id=parent_id,
    )

    logger.info("Published URL crawling task", url=url, message_id=message_id)

    return UrlCrawlingResponse(
        source_id=source_id,
    )
