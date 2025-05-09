from asyncio import gather
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import post
from packages.db.src.constants import RAG_URL
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganizationRagSource,
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.gcs import construct_object_uri, upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app
from packages.shared_utils.src.shared_types import ParentType
from services.crawler.src.extraction import crawl_url
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class CrawlingRequest(TypedDict):
    parent_id: UUID
    parent_type: ParentType
    workspace_id: NotRequired[UUID]
    url: str


@post("/")
async def handle_url_crawling(
    data: CrawlingRequest,
    session_maker: async_sessionmaker[Any],
) -> None:
    async with session_maker() as session, session.begin():
        try:
            parent_type, parent_id = data["parent_type"], data["parent_id"]
            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    [
                        {
                            "indexing_status": FileIndexingStatusEnum.INDEXING,
                            "text_content": "",
                            "source_type": RAG_URL,  # Set polymorphic identity ~keep
                        }
                    ]
                )
                .returning(RagSource.id)
            )

            await session.execute(
                insert(RagUrl)
                .values(
                    [
                        {
                            "id": source_id,
                            "url": data["url"],
                        }
                    ]
                )
                .returning(RagUrl.id)
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
            logger.info("Created new file record", source_id=source_id, parent_type=parent_type, parent_id=parent_id)
        except SQLAlchemyError as e:
            logger.error("Error creating file record", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error creating file record", context=str(e)) from e

    if files := await crawl_url(
        url=data["url"],
        source_id=str(source_id),
        session_maker=session_maker,
    ):
        # we are uploading the files to GCS to have them indexed:
        await gather(
            *[
                upload_blob(
                    blob_path=construct_object_uri(
                        application_id=str(parent_id) if parent_type == "grant_application" else None,
                        blob_name=file["filename"],
                        organization_id=str(parent_id) if parent_type == "funding_organization" else None,
                        template_id=str(parent_id) if parent_type == "grant_template" else None,
                        workspace_id=str(data["workspace_id"]) if data.get("workspace_id") else None,
                    ),
                    content=file["content"],
                )
                for file in files
            ]
        )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_url_crawling,
    ],
)
