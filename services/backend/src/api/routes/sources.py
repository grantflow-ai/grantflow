from typing import TYPE_CHECKING, Any, TypedDict, cast
from uuid import UUID

from litestar import delete, get, post
from litestar.exceptions import NotFoundException
from litestar.handlers import HTTPRouteHandler
from litestar.types import Method, OperationIDCreator
from litestar.types.internal_types import PathParameterDefinition
from packages.db.src.enums import FileIndexingStatusEnum, UserRoleEnum
from packages.db.src.tables import (
    FundingOrganizationRagSource,
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    RagSource,
)
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.gcs import create_signed_upload_url
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

if TYPE_CHECKING:
    from packages.db.src.tables import (
        RagFile,
        RagUrl,
    )


logger = get_logger(__name__)


class RagFileResponse(TypedDict):
    id: str
    filename: str
    size: int
    mime_type: str
    created_at: str
    indexing_status: FileIndexingStatusEnum


class RagUrlResponse(TypedDict):
    id: str
    url: str
    title: str | None
    description: str | None
    created_at: str
    indexing_status: FileIndexingStatusEnum


class UploadUrlResponse(TypedDict):
    url: str


def _create_operation_id_creator(key: str) -> OperationIDCreator:
    def _create_operation_id(_: HTTPRouteHandler, __: Method, paths: list[str | PathParameterDefinition]) -> str:
        if "applications" in paths:
            return key.format(value="GrantApplication")
        if "templates" in paths:
            return key.format(value="GrantTemplate")
        return key.format(value="FundingOrganization")

    return _create_operation_id


@get(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources",
        "/workspaces/{workspace_id:uuid}/templates/{template_id:uuid}/sources",
        "/organizations/{organization_id:uuid}/sources",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Retrieve{value}RagSources"),
)
async def handle_retrieve_rag_sources(
    application_id: UUID | None,
    organization_id: UUID | None,
    session_maker: async_sessionmaker[Any],
    template_id: UUID | None,
) -> list[RagFileResponse | RagUrlResponse]:
    async with session_maker() as session:
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
                .where(FundingOrganizationRagSource.funding_organization_id == organization_id)
            )

        results = await session.scalars(statement)
        ret: list[RagFileResponse | RagUrlResponse] = []

        for result in results:
            if hasattr(result, "filename"):
                rag_file = cast("RagFile", result)
                ret.append(
                    RagFileResponse(
                        id=str(rag_file.id),
                        filename=rag_file.filename,
                        size=rag_file.size,
                        mime_type=rag_file.mime_type,
                        indexing_status=rag_file.indexing_status,
                        created_at=rag_file.created_at.isoformat(),
                    )
                )
            else:
                rag_url = cast("RagUrl", result)
                ret.append(
                    RagUrlResponse(
                        id=str(rag_url.id),
                        title=rag_url.title,
                        url=rag_url.url,
                        description=rag_url.description,
                        indexing_status=rag_url.indexing_status,
                        created_at=rag_url.created_at.isoformat(),
                    )
                )

        return ret


@delete(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources/{source_id:uuid}",
        "/workspaces/{workspace_id:uuid}/templates/{template_id:uuid}/sources/{source_id:uuid}",
        "/organizations/{organization_id:uuid}/sources/{source_id:uuid}",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Delete{value}RagSource"),
)
async def handle_delete_rag_source(
    application_id: UUID | None,
    organization_id: UUID | None,
    session_maker: async_sessionmaker[Any],
    source_id: UUID,
    template_id: UUID | None,
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
                .where(FundingOrganizationRagSource.funding_organization_id == organization_id)
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
            raise DatabaseError("Error deleting organization file", context=str(e)) from e


@post(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/sources/upload-url",
        "/workspaces/{workspace_id:uuid}/templates/{template_id:uuid}/sources/upload-url",
        "/organizations/{organization_id:uuid}/sources/upload-url",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id=_create_operation_id_creator("Create{value}RagSourceUploadUrl"),
)
async def handle_create_upload_url(
    application_id: UUID | None,
    organization_id: UUID | None,
    template_id: UUID | None,
    workspace_id: UUID | None,
    blob_name: str,  # this is a query parameter ~keep
) -> UploadUrlResponse:
    url = await create_signed_upload_url(
        workspace_id=str(workspace_id) if workspace_id else None,
        application_id=str(application_id) if application_id else None,
        organization_id=str(organization_id) if organization_id else None,
        template_id=str(template_id) if template_id else None,
        blob_name=blob_name,
    )
    return UploadUrlResponse(url=url)
