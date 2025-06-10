import base64
from asyncio import gather
from typing import Any

from litestar import post
from packages.db.src.constants import RAG_URL
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganizationRagSource,
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    RagSource,
    RagUrl,
    TextVector,
)
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.gcs import construct_object_uri, upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import CrawlingRequest, PubSubEvent, SourceProcessingResult, publish_notification
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from services.crawler.src.extraction import crawl_url
from services.crawler.src.utils import filter_url
from sqlalchemy import insert, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


async def decode_pubsub_message(event: PubSubEvent) -> CrawlingRequest:
    try:
        encoded_data = event.message.data
        if not encoded_data:
            raise ValidationError("PubSub message missing data field")
        decoded_data = base64.b64decode(encoded_data).decode()
        return deserialize(decoded_data, CrawlingRequest)
    except DeserializationError as e:
        logger.error("Validation error processing PubSub message", exc_info=e)
        raise ValidationError(
            "Failed to decode PubSub message", context={"message": event.message, "error": str(e)}
        ) from e


@post("/")
async def handle_url_crawling(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    crawling_request = await decode_pubsub_message(data)
    parent_type, parent_id = crawling_request["parent_type"], crawling_request["parent_id"]
    existing_url = None

    if filter_url(crawling_request["url"]):
        logger.info("Skipping URL due to filtering rules", url=crawling_request["url"])
        return

    async with session_maker() as session, session.begin():
        try:
            rag_source = await session.scalar(
                select(RagSource).join(RagUrl).where(RagUrl.url == crawling_request["url"])
            )
            if rag_source:
                source_id = rag_source.id
                if rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED:
                    existing_url = True
                    indexing_status = rag_source.indexing_status
                else:
                    await session.execute(
                        update(RagSource)
                        .where(RagSource.id == rag_source.id)
                        .values(indexing_status=SourceIndexingStatusEnum.INDEXING)
                    )
                    existing_url = False
                    indexing_status = SourceIndexingStatusEnum.INDEXING
            else:
                existing_url = False
                indexing_status = SourceIndexingStatusEnum.INDEXING
                source_id = await session.scalar(
                    insert(RagSource)
                    .values(
                        [
                            {
                                "indexing_status": indexing_status,
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
                                "url": crawling_request["url"],
                            }
                        ]
                    )
                    .returning(RagUrl.id)
                )

                if parent_type == "grant_application":
                    await session.execute(
                        pg_insert(GrantApplicationRagSource)
                        .values(
                            {
                                "rag_source_id": source_id,
                                "grant_application_id": parent_id,
                            }
                        )
                        .on_conflict_do_nothing(index_elements=["rag_source_id", "grant_application_id"])
                    )
                elif parent_type == "funding_organization":
                    await session.execute(
                        pg_insert(FundingOrganizationRagSource)
                        .values(
                            {
                                "rag_source_id": source_id,
                                "funding_organization_id": parent_id,
                            }
                        )
                        .on_conflict_do_nothing(index_elements=["rag_source_id", "funding_organization_id"])
                    )
                else:
                    await session.execute(
                        pg_insert(GrantTemplateRagSource)
                        .values(
                            {
                                "rag_source_id": source_id,
                                "grant_template_id": parent_id,
                            }
                        )
                        .on_conflict_do_nothing(index_elements=["rag_source_id", "grant_template_id"])
                    )
                logger.info("Created new url record", source_id=source_id, parent_type=parent_type, parent_id=parent_id)
        except SQLAlchemyError:
            logger.exception(
                "Error creating url record",
                url=crawling_request["url"],
                parent_type=parent_type,
                parent_id=parent_id,
            )
            await session.rollback()
            return

    if existing_url:
        logger.info(
            "Skipping crawl for existing URL",
            source_id=source_id,
            url=crawling_request["url"],
            indexing_status=indexing_status,
        )
        await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event="source_processing",
            data=SourceProcessingResult(
                parent_id=parent_id,
                parent_type=parent_type,
                rag_source_id=source_id,
                indexing_status=indexing_status,
                identifier=crawling_request["url"],
            ),
        )
        return

    try:
        vectors, content, files = await crawl_url(
            url=crawling_request["url"],
            source_id=str(source_id),
        )

        if files:
            await gather(
                *[
                    upload_blob(
                        blob_path=construct_object_uri(
                            application_id=str(parent_id) if parent_type == "grant_application" else None,
                            blob_name=file["filename"],
                            organization_id=str(parent_id) if parent_type == "funding_organization" else None,
                            template_id=str(parent_id) if parent_type == "grant_template" else None,
                            workspace_id=str(crawling_request["workspace_id"])
                            if crawling_request.get("workspace_id")
                            else None,
                        ),
                        content=file["content"],
                    )
                    for file in files
                ]
            )

        async with session_maker() as session, session.begin():
            try:
                await session.execute(insert(TextVector).values(vectors))
                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == source_id)
                    .values({"indexing_status": SourceIndexingStatusEnum.FINISHED, "text_content": content})
                )
                await session.execute(
                    update(RagUrl).where(RagUrl.id == source_id).values({"title": "", "description": ""})
                )
                await session.commit()
                logger.info("Successfully indexed URL", url=crawling_request["url"], source_id=source_id)
            except SQLAlchemyError as e:
                logger.exception(
                    "Database operation error",
                    url=crawling_request["url"],
                    source_id=source_id,
                    error_type="DatabaseError" if "connection" in str(e).lower() else "SQLAlchemyError",
                )
                await session.rollback()
                await publish_notification(
                    logger=logger,
                    parent_id=parent_id,
                    event="source_processing",
                    data=SourceProcessingResult(
                        parent_id=parent_id,
                        parent_type=parent_type,
                        rag_source_id=source_id,
                        indexing_status=SourceIndexingStatusEnum.FAILED,
                        identifier=crawling_request["url"],
                    ),
                )

        await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event="source_processing",
            data=SourceProcessingResult(
                parent_id=parent_id,
                parent_type=parent_type,
                rag_source_id=source_id,
                indexing_status=SourceIndexingStatusEnum.FINISHED,
                identifier=crawling_request["url"],
            ),
        )
    except Exception as e:
        logger.exception(
            "Error crawling URL",
            url=crawling_request["url"],
            source_id=source_id,
            error_type=type(e).__name__,
        )

        async with session_maker() as session, session.begin():
            try:
                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == source_id)
                    .values(indexing_status=SourceIndexingStatusEnum.FAILED)
                )
                await session.commit()
            except SQLAlchemyError as db_error:
                logger.error(
                    "Failed to mark source as failed in database",
                    error=str(db_error),
                    source_id=source_id,
                    original_error=str(e),
                )
                await session.rollback()

        await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event="source_processing",
            data=SourceProcessingResult(
                parent_id=parent_id,
                parent_type=parent_type,
                rag_source_id=source_id,
                indexing_status=SourceIndexingStatusEnum.FAILED,
                identifier=crawling_request["url"],
            ),
        )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_url_crawling,
    ],
)
