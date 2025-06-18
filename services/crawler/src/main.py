import base64
import binascii
from asyncio import gather
from typing import Any

from litestar import post
from litestar.exceptions import ValidationException
from packages.db.src.utils import update_source_indexing_status
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
)
from packages.shared_utils.src.gcs import construct_object_uri, upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import (
    CrawlingRequest,
    PubSubEvent,
)
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
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

    await update_source_indexing_status(
        logger=logger,
        session_maker=session_maker,
        source_id=crawling_request["source_id"],
        parent_id=crawling_request["parent_id"],
        identifier=crawling_request["url"],
        text_content="",
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
                            workspace_id=crawling_request["workspace_id"],
                            parent_id=crawling_request["parent_id"],
                            source_id=crawling_request["source_id"],
                            blob_name=file["filename"],
                        ),
                        content=file["content"],
                    )
                    for file in files
                ]
            )

        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=crawling_request["source_id"],
            parent_id=crawling_request["parent_id"],
            identifier=crawling_request["url"],
            text_content=content,
            vectors=vectors,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
    except Exception as e:
        logger.exception("Error during URL crawling", error=e)
        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=crawling_request["source_id"],
            parent_id=crawling_request["parent_id"],
            identifier=crawling_request["url"],
            text_content="",
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FAILED,
        )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_url_crawling,
    ],
)
