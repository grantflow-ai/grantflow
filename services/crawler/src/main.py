import base64
import binascii
from asyncio import gather
from typing import Any
from uuid import UUID

from litestar import post
from litestar.exceptions import ValidationException
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    RagSource,
    TextVector,
)
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.gcs import construct_object_uri, upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import (
    CrawlingRequest,
    PubSubEvent,
    SourceProcessingResult,
    publish_notification,
)
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from packages.shared_utils.src.shared_types import ParentType
from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.crawler.src.extraction import crawl_url
from services.crawler.src.utils import filter_url

logger = get_logger(__name__)


async def decode_pubsub_message(event: PubSubEvent) -> CrawlingRequest:
    try:
        encoded_data = event.message.data
        if not encoded_data:
            raise ValidationError("PubSub message missing data field")
        decoded_data = base64.b64decode(encoded_data).decode()
        return deserialize(decoded_data, CrawlingRequest)
    except (DeserializationError, binascii.Error, UnicodeDecodeError) as e:
        logger.error("Validation error processing PubSub message", exc_info=e)
        raise ValidationError(
            "Failed to decode PubSub message",
            context={"message": event.message, "error": str(e)},
        ) from e


async def update_rag_source_status(
    session_maker: async_sessionmaker[Any],
    source_id: UUID,
    parent_id: UUID,
    crawling_request: CrawlingRequest,
    content: str,
    vectors: list[VectorDTO] | None,
    indexing_status: SourceIndexingStatusEnum,
) -> None:
    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(RagSource)
                .where(RagSource.id == source_id)
                .values({"indexing_status": indexing_status, "text_content": content})
            )
            if vectors:
                await session.execute(insert(TextVector).values(vectors))
            await session.commit()

            await publish_notification(
                logger=logger,
                parent_id=parent_id,
                event="source_processing",
                data=SourceProcessingResult(
                    source_id=source_id,
                    indexing_status=indexing_status,
                    identifier=crawling_request["url"],
                ),
            )
        except SQLAlchemyError as e:
            logger.exception(
                "Database operation error",
                url=crawling_request["url"],
                source_id=source_id,
                error_type="DatabaseError"
                if "connection" in str(e).lower()
                else "SQLAlchemyError",
            )
            await session.rollback()
            await publish_notification(
                logger=logger,
                parent_id=parent_id,
                event="source_processing",
                data=SourceProcessingResult(
                    source_id=source_id,
                    indexing_status=SourceIndexingStatusEnum.FAILED,
                    identifier=crawling_request["url"],
                ),
            )


@post("/")
async def handle_url_crawling(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    try:
        crawling_request = await decode_pubsub_message(data)
    except ValidationError as e:
        logger.error("Invalid PubSub message", exc_info=e)
        raise ValidationException(str(e)) from e

    if filter_url(crawling_request["url"]):
        logger.info("Skipping URL due to filtering rules", url=crawling_request["url"])
        return

    await update_rag_source_status(
        session_maker=session_maker,
        parent_id=crawling_request["parent_id"],
        source_id=crawling_request["source_id"],
        crawling_request=crawling_request,
        content="",
        vectors=None,
        indexing_status=SourceIndexingStatusEnum.INDEXING,
    )

    try:
        vectors, content, files = await crawl_url(
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
        )

        if files:
            await gather(
                *[
                    upload_blob(
                        blob_path=construct_object_uri(
                            source_id=crawling_request["source_id"],
                            blob_name=file["filename"],
                            workspace_id=crawling_request["workspace_id"],
                        ),
                        content=file["content"],
                    )
                    for file in files
                ]
            )

        await update_rag_source_status(
            session_maker=session_maker,
            parent_id=crawling_request["parent_id"],
            source_id=crawling_request["source_id"],
            crawling_request=crawling_request,
            content=content,
            vectors=vectors,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
    except Exception as e:
        logger.exception("Error during URL crawling", error=e)
        await update_rag_source_status(
            session_maker=session_maker,
            parent_id=crawling_request["parent_id"],
            source_id=crawling_request["source_id"],
            crawling_request=crawling_request,
            content="",
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FAILED,
        )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_url_crawling,
    ],
)
