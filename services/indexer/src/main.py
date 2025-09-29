import time
from typing import Any, TypedDict

from litestar import post
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantTemplate,
    RagFile,
    RagSource,
    TextVector,
)
from packages.db.src.utils import update_source_indexing_status
from packages.shared_utils.src.exceptions import (
    ValidationError,
)
from packages.shared_utils.src.gcs import (
    URIParseResult,
    download_blob,
    parse_object_uri,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import PubSubEvent
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.indexer.src.processing import process_source

configure_otel("indexer")

logger = get_logger(__name__)


class GCSNotification(TypedDict):
    bucket_name: str
    object_name: str
    event_type: str


def get_gcs_notification_data(event: PubSubEvent) -> tuple[GCSNotification | None, str]:
    attributes = event.message.attributes or {}

    trace_id = attributes.get("customMetadata_trace-id") or attributes.get("trace_id") or ""
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
) -> tuple[URIParseResult, str, str]:
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
            entity_type=parsed["entity_type"],
            entity_id=str(parsed["entity_id"]),
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

    content = await download_blob(object_path)
    logger.debug(
        "Downloaded blob content",
        content_size=len(content),
        trace_id=trace_id,
    )

    grant_application_id = None
    if parse_result["entity_type"] == "grant_template":
        async with session_maker() as session:
            grant_application_id = await session.scalar(
                select(GrantTemplate.grant_application_id).where(GrantTemplate.id == parse_result["entity_id"])
            )
            if not grant_application_id:
                raise ValidationError(
                    "Grant template has no associated grant application",
                    context={"grant_template_id": parse_result["entity_id"]},
                )
    elif parse_result["entity_type"] == "grant_application":
        grant_application_id = parse_result["entity_id"]

    async with session_maker() as session:
        logger.debug(
            "Querying database for file and source records",
            source_id=str(parse_result["source_id"]),
            trace_id=trace_id,
        )
        rag_file = await session.scalar(select(RagFile).where(RagFile.id == parse_result["source_id"]))
        rag_source = await session.scalar(select(RagSource).where(RagSource.id == parse_result["source_id"]))

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

        if grant_application_id:
            await update_source_indexing_status(
                logger=logger,
                session_maker=session_maker,
                source_id=parse_result["source_id"],
                grant_application_id=grant_application_id,
                identifier=parse_result["blob_name"],
                text_content=rag_source.text_content,
                vectors=None,
                indexing_status=SourceIndexingStatusEnum.FINISHED,
                trace_id=trace_id,
                document_metadata=rag_source.document_metadata,
            )
        else:
            async with session_maker() as session, session.begin():
                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == parse_result["source_id"])
                    .values(indexing_status=SourceIndexingStatusEnum.FINISHED)
                )
        logger.info(
            "File indexing completed (already processed)",
            total_duration_ms=round((time.time() - start_time) * 1000, 2),
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
        vectors, text_content, document_metadata = await process_source(
            content=content,
            source_id=str(parse_result["source_id"]),
            filename=parse_result["blob_name"],
            mime_type=rag_file.mime_type,
        )

        logger.debug(
            "File processing completed",
            processing_duration_ms=round((time.time() - processing_start) * 1000, 2),
            text_length=len(text_content),
            vector_count=len(vectors) if vectors else 0,
            trace_id=trace_id,
        )

        if grant_application_id:
            await update_source_indexing_status(
                logger=logger,
                session_maker=session_maker,
                source_id=parse_result["source_id"],
                grant_application_id=grant_application_id,
                identifier=parse_result["blob_name"],
                text_content=text_content,
                vectors=vectors,
                indexing_status=SourceIndexingStatusEnum.FINISHED,
                trace_id=trace_id,
                document_metadata=document_metadata,
            )
        else:
            async with session_maker() as session, session.begin():
                update_values: dict[str, Any] = {
                    "indexing_status": SourceIndexingStatusEnum.FINISHED,
                    "text_content": text_content,
                }
                if document_metadata is not None:
                    update_values["document_metadata"] = dict(document_metadata)

                await session.execute(
                    update(RagSource).where(RagSource.id == parse_result["source_id"]).values(update_values)
                )

                if vectors:
                    await session.execute(insert(TextVector).values(vectors))

        logger.info(
            "Successfully indexed file",
            filename=parse_result["blob_name"],
            source_id=parse_result["source_id"],
            total_duration_ms=round((time.time() - start_time) * 1000, 2),
            text_length=len(text_content),
            vector_count=len(vectors) if vectors else 0,
            trace_id=trace_id,
        )

    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)

        logger.exception(
            "Error processing file",
            filename=parse_result["blob_name"],
            source_id=parse_result["source_id"],
            error_type=error_type,
            file_size=len(content),
            mime_type=rag_file.mime_type,
            trace_id=trace_id,
        )

        failure_update_start = time.time()
        if grant_application_id:
            await update_source_indexing_status(
                logger=logger,
                session_maker=session_maker,
                source_id=parse_result["source_id"],
                grant_application_id=grant_application_id,
                identifier=parse_result["blob_name"],
                text_content="",
                vectors=None,
                indexing_status=SourceIndexingStatusEnum.FAILED,
                trace_id=trace_id,
                document_metadata=None,
                error_type=error_type,
                error_message=error_message,
            )
        else:
            async with session_maker() as session, session.begin():
                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == parse_result["source_id"])
                    .values(
                        indexing_status=SourceIndexingStatusEnum.FAILED,
                        text_content="",
                        error_type=error_type,
                        error_message=error_message,
                    )
                )
        failure_update_duration = time.time() - failure_update_start

        # Check if error is retriable based on category
        is_retriable = getattr(e, "category", None) == "retriable" if hasattr(e, "category") else False

        logger.debug(
            "Updated status to failed",
            failure_update_duration_ms=round(failure_update_duration * 1000, 2),
            is_retriable_error=is_retriable,
            error_category=getattr(e, "category", "unknown"),
            trace_id=trace_id,
        )

        raise


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_file_indexing,
    ],
)
