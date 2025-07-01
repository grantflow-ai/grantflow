import time
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
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import PubSubEvent
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.indexer.src.processing import process_source

configure_otel("indexer")

logger = get_logger(__name__)


class GCSNotification(TypedDict):
    bucket_name: str
    object_name: str
    event_type: str


def get_gcs_notification_data(event: PubSubEvent) -> tuple[GCSNotification | None, str | None]:
    attributes = event.message.attributes or {}

    trace_id = attributes.get("customMetadata_trace-id") or attributes.get("trace_id")
    logger.debug(
        "Parsing GCS notification",
        attributes_count=len(attributes),
        attributes=list(attributes.keys()),
        trace_id=trace_id,
    )

    if any(key not in attributes for key in ("bucketId", "objectId", "eventType")):
        logger.debug(
            "Missing required GCS attributes",
            missing_keys=[key for key in ("bucketId", "objectId", "eventType") if key not in attributes],
            trace_id=trace_id,
        )
        return None, trace_id

    bucket_name = attributes["bucketId"]
    object_name = attributes["objectId"]
    event_type = attributes["eventType"]

    logger.debug(
        "Parsed GCS notification",
        bucket_name=bucket_name,
        object_name=object_name,
        event_type=event_type,
        trace_id=trace_id,
    )

    return GCSNotification(
        bucket_name=bucket_name,
        object_name=object_name,
        event_type=event_type,
    ), trace_id


async def handle_pubsub_message(
    event: PubSubEvent,
) -> tuple[URIParseResult, str, str | None]:
    logger.debug(
        "Processing PubSub message", message_id=event.message.message_id, publish_time=event.message.publish_time
    )

    gcs_notification, trace_id = get_gcs_notification_data(event)

    if gcs_notification:
        object_path = gcs_notification["object_name"]
        logger.debug(
            "Received object path for indexing",
            object_path=object_path,
            event_type=gcs_notification["event_type"],
            trace_id=trace_id,
        )

        parsed = parse_object_uri(object_path=object_path)
        logger.debug(
            "Parsed object URI",
            source_id=str(parsed["source_id"]),
            parent_id=str(parsed["parent_id"]),
            blob_name=parsed["blob_name"],
            trace_id=trace_id,
        )

        return parsed, object_path, trace_id

    logger.warning("Invalid PubSub message format", message_attributes=event.message.attributes, trace_id=trace_id)
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
    start_time = time.time()

    logger.info("Starting file indexing request")

    parse_result, object_path, trace_id = await handle_pubsub_message(data)
    logger.debug(
        "PubSub message parsed",
        parse_duration_ms=round((time.time() - start_time) * 1000, 2),
        trace_id=trace_id,
    )

    download_start = time.time()
    content = await download_blob(object_path)
    download_duration = time.time() - download_start
    logger.debug(
        "Downloaded blob content",
        content_size=len(content),
        download_duration_ms=round(download_duration * 1000, 2),
        trace_id=trace_id,
    )

    db_start = time.time()
    async with session_maker() as session:
        logger.debug(
            "Querying database for file and source records",
            source_id=str(parse_result["source_id"]),
            trace_id=trace_id,
        )
        rag_file = await session.scalar(select(RagFile).where(RagFile.id == parse_result["source_id"]))
        rag_source = await session.scalar(select(RagSource).where(RagSource.id == parse_result["source_id"]))

    db_duration = time.time() - db_start
    logger.debug(
        "Database queries completed",
        db_duration_ms=round(db_duration * 1000, 2),
        rag_file_found=rag_file is not None,
        rag_source_found=rag_source is not None,
        trace_id=trace_id,
    )

    if not rag_file:
        logger.error("Rag file not found", source_id=parse_result["source_id"], trace_id=trace_id)
        raise ValidationError("Rag file not found", context={"source_id": parse_result["source_id"]})

    if not rag_source:
        logger.error("Rag source not found", source_id=parse_result["source_id"], trace_id=trace_id)
        raise ValidationError("Rag source not found", context={"source_id": parse_result["source_id"]})

    if rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED:
        logger.info(
            "File already processed, skipping",
            filename=parse_result["blob_name"],
            source_id=parse_result["source_id"],
            current_status=rag_source.indexing_status.value,
            trace_id=trace_id,
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
        total_duration = time.time() - start_time
        logger.info(
            "File indexing completed (already processed)",
            total_duration_ms=round(total_duration * 1000, 2),
            trace_id=trace_id,
        )
        return

    logger.debug(
        "Starting file processing",
        filename=parse_result["blob_name"],
        mime_type=rag_file.mime_type,
        file_size=len(content),
        trace_id=trace_id,
    )

    try:
        processing_start = time.time()
        vectors, text_content = await process_source(
            content=content,
            source_id=str(parse_result["source_id"]),
            filename=parse_result["blob_name"],
            mime_type=rag_file.mime_type,
        )
        processing_duration = time.time() - processing_start

        logger.debug(
            "File processing completed",
            processing_duration_ms=round(processing_duration * 1000, 2),
            text_length=len(text_content),
            vector_count=len(vectors) if vectors else 0,
            trace_id=trace_id,
        )

        status_update_start = time.time()
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
        status_update_duration = time.time() - status_update_start
        total_duration = time.time() - start_time

        logger.info(
            "Successfully indexed file",
            filename=parse_result["blob_name"],
            source_id=parse_result["source_id"],
            total_duration_ms=round(total_duration * 1000, 2),
            status_update_duration_ms=round(status_update_duration * 1000, 2),
            text_length=len(text_content),
            vector_count=len(vectors) if vectors else 0,
            trace_id=trace_id,
        )

    except Exception as e:
        error_duration = time.time() - start_time
        logger.exception(
            "Error processing file",
            filename=parse_result["blob_name"],
            source_id=parse_result["source_id"],
            error_type=type(e).__name__,
            error_duration_ms=round(error_duration * 1000, 2),
            file_size=len(content),
            mime_type=rag_file.mime_type,
            trace_id=trace_id,
        )

        failure_update_start = time.time()
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
        failure_update_duration = time.time() - failure_update_start

        logger.debug(
            "Updated status to failed",
            failure_update_duration_ms=round(failure_update_duration * 1000, 2),
            is_retryable_error=isinstance(e, (FileParsingError, ExternalOperationError, ValidationError)),
            trace_id=trace_id,
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
