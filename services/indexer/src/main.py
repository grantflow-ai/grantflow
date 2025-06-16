from typing import Any, TypedDict

from litestar import post
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    RagFile,
    RagSource,
)
from packages.db.src.utils import update_source_indexing_status
from packages.shared_utils.src.exceptions import (
    ExternalOperationError,
    FileParsingError,
    ValidationError,
)
from packages.shared_utils.src.gcs import URIParseResult, download_blob, parse_object_uri
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import PubSubEvent
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.indexer.src.processing import process_source

logger = get_logger(__name__)


class GCSNotification(TypedDict):
    bucket_name: str
    object_name: str
    event_type: str


def get_gcs_notification_data(event: PubSubEvent) -> GCSNotification | None:
    attributes = event.message.attributes or {}
    if any(key not in attributes for key in ("bucketId", "objectId", "eventType")):
        return None

    bucket_name = attributes["bucketId"]
    object_name = attributes["objectId"]
    event_type = attributes["eventType"]

    return GCSNotification(
        bucket_name=bucket_name,
        object_name=object_name,
        event_type=event_type,
    )


async def handle_pubsub_message(
    event: PubSubEvent,
) -> tuple[URIParseResult, str]:
    if gcs_notification := get_gcs_notification_data(event):
        object_path = gcs_notification["object_name"]
        logger.debug("Received object path for indexing", object_path=object_path)
        parsed = parse_object_uri(object_path=object_path)
        return parsed, object_path

    raise ValidationError(
        "Invalid pubsub message.",
        context={
            "message": event.message,
            "attributes": event.message.attributes,
        },
    )


@post("/")
async def handle_file_indexing(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    parse_result, object_path = await handle_pubsub_message(data)
    content = await download_blob(object_path)

    async with session_maker() as session:
        rag_file = await session.scalar(select(RagFile).where(RagFile.id == parse_result["source_id"]))
        rag_source = await session.scalar(select(RagSource).where(RagSource.id == parse_result["source_id"]))

    if not rag_file:
        logger.error("Rag file not found", source_id=parse_result["source_id"])
        raise ValidationError("Rag file not found", context={"source_id": parse_result["source_id"]})

    if not rag_source:
        logger.error("Rag source not found", source_id=parse_result["source_id"])
        raise ValidationError("Rag source not found", context={"source_id": parse_result["source_id"]})

    if rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED:
        logger.info(
            "File already processed, skipping", filename=parse_result["blob_name"], source_id=parse_result["source_id"]
        )

        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=parse_result["source_id"],
            parent_id=parse_result["parent_id"],
            identifier=parse_result["blob_name"],
            text_content=rag_source.text_content,
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        return

    try:
        vectors, text_content = await process_source(
            content=content,
            source_id=str(parse_result["source_id"]),
            filename=parse_result["blob_name"],
            mime_type=rag_file.mime_type,
        )

        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=parse_result["source_id"],
            parent_id=parse_result["parent_id"],
            identifier=parse_result["blob_name"],
            text_content=text_content,
            vectors=vectors,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )

        logger.info(
            "Successfully indexed file", filename=parse_result["blob_name"], source_id=parse_result["source_id"]
        )

    except Exception as e:
        logger.exception(
            "Error processing file",
            filename=parse_result["blob_name"],
            source_id=parse_result["source_id"],
            error_type=type(e).__name__,
        )

        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=parse_result["source_id"],
            parent_id=parse_result["parent_id"],
            identifier=parse_result["blob_name"],
            text_content="",
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FAILED,
        )

        if isinstance(e, (FileParsingError, ExternalOperationError, ValidationError)):
            raise

        raise


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_file_indexing,
    ],
)
