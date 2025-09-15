import time
from asyncio import gather
from typing import Any

from litestar import post
from litestar.exceptions import ValidationException
from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError

from services.crawler.src.utils import decode_pubsub_message
from packages.db.src.utils import update_source_indexing_status
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.shared_utils.src.exceptions import (
    ValidationError,
    DatabaseError,
)
from packages.shared_utils.src.gcs import (
    construct_object_uri,
    upload_blob,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import (
    CrawlingRequest,
    PubSubEvent,
)
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.crawler.src.extraction import crawl_url, FileContent
from services.crawler.src.utils import filter_url
from packages.db.src.tables import (
    RagFile,
    GrantApplicationSource,
    GrantTemplateSource,
    GrantingInstitutionSource,
    GrantTemplate,
)
from packages.shared_utils.src.constants import SUPPORTED_FILE_EXTENSIONS

configure_otel("crawler")

logger = get_logger(__name__)


async def handle_gcs_file_upload(
    file: FileContent,
    crawling_request: CrawlingRequest,
    session_maker: async_sessionmaker[Any],
    source_id: str,
) -> None:
    start_time = time.time()
    logger.debug(
        "Starting GCS file upload",
        filename=file["filename"],
        file_size=len(file["content"]),
        entity_id=str(crawling_request["entity_id"]),
        source_id=source_id,
    )
    object_path = construct_object_uri(
        entity_type=crawling_request["entity_type"],
        entity_id=crawling_request["entity_id"],
        source_id=source_id,
        blob_name=file["filename"],
    )
    logger.debug("Constructed object path", object_path=object_path)

    async with session_maker() as session, session.begin():
        try:
            file_extension = file["filename"].split(".")[-1].lower()
            mime_type = SUPPORTED_FILE_EXTENSIONS[file_extension]

            logger.debug(
                "Creating RagFile record",
                filename=file["filename"],
                file_extension=file_extension,
                mime_type=mime_type,
            )

            await session.execute(
                insert(RagFile).values(
                    {
                        "id": str(source_id),
                        "bucket_name": "",
                        "object_path": object_path,
                        "filename": file["filename"],
                        "mime_type": mime_type,
                        "size": 0,
                    }
                )
            )

            if crawling_request["entity_type"] == "granting_institution":
                await session.execute(
                    insert(GrantingInstitutionSource).values(
                        {
                            "rag_source_id": source_id,
                            "granting_institution_id": crawling_request["entity_id"],
                        }
                    )
                )
            elif crawling_request["entity_type"] == "grant_application":
                await session.execute(
                    insert(GrantApplicationSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_application_id": crawling_request["entity_id"],
                        }
                    )
                )
            elif crawling_request["entity_type"] == "grant_template":
                await session.execute(
                    insert(GrantTemplateSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_template_id": crawling_request["entity_id"],
                        }
                    )
                )
            else:
                raise ValidationError(
                    "No rag source was found for the provided entity",
                    context={
                        "entity_type": crawling_request["entity_type"],
                        "entity_id": crawling_request["entity_id"],
                    },
                )

            upload_start = time.time()
            await upload_blob(object_path, file["content"])

            logger.info(
                "File uploaded to GCS successfully",
                filename=file["filename"],
                source_id=str(source_id),
                file_size=len(file["content"]),
                object_path=object_path,
                upload_duration_ms=round((time.time() - upload_start) * 1000, 2),
                total_duration_ms=round((time.time() - start_time) * 1000, 2),
            )
        except SQLAlchemyError as e:
            logger.error("Failed to create RagFile entry in DB", exc_info=e)
            raise DatabaseError(
                "Failed to create RagFile entry in DB", context=str(e)
            ) from e


@post("/")
async def handle_url_crawling(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    start_time = time.time()
    logger.debug("Starting URL crawling request processing")

    try:
        decode_start = time.time()
        crawling_request = await decode_pubsub_message(data)
        decode_duration = time.time() - decode_start
        trace_id = crawling_request.get("trace_id")

        logger.debug(
            "PubSub message decoded successfully",
            source_id=str(crawling_request["source_id"]),
            entity_id=str(crawling_request["entity_id"]),
            entity_type=crawling_request["entity_type"],
            url=crawling_request["url"],
            trace_id=trace_id,
            decode_duration_ms=round(decode_duration * 1000, 2),
        )
    except ValidationError as e:
        logger.error("Invalid PubSub message", exc_info=e)
        raise ValidationException(str(e)) from e

    if filter_url(crawling_request["url"]):
        logger.info(
            "Skipping URL due to filtering rules",
            url=crawling_request["url"],
            trace_id=trace_id,
        )
        return

    logger.debug(
        "Updating source status to INDEXING",
        source_id=str(crawling_request["source_id"]),
        trace_id=trace_id,
    )

    parent_id = crawling_request["entity_id"]
    if crawling_request["entity_type"] == "grant_template":
        async with session_maker() as session:
            parent_id = await session.scalar(
                select(GrantTemplate.grant_application_id).where(
                    GrantTemplate.id == crawling_request["entity_id"]
                )
            )

    await update_source_indexing_status(
        logger=logger,
        session_maker=session_maker,
        source_id=crawling_request["source_id"],
        parent_id=parent_id,
        identifier=crawling_request["url"],
        text_content="",
        vectors=None,
        indexing_status=SourceIndexingStatusEnum.INDEXING,
        should_send_notifications=crawling_request["entity_type"]
        != "granting_institution",
    )

    try:
        crawl_start = time.time()
        logger.debug(
            "Starting URL crawling",
            url=crawling_request["url"],
            trace_id=trace_id,
        )

        vectors, content, files = await crawl_url(
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
        )

        logger.debug(
            "URL crawling completed",
            url=crawling_request["url"],
            vector_count=len(vectors),
            content_length=len(content),
            file_count=len(files),
            trace_id=trace_id,
            crawl_duration_ms=round((time.time() - crawl_start) * 1000, 2),
        )

        if files_to_uploads := [
            file
            for file in files
            if file["filename"].split(".")[-1].lower() in SUPPORTED_FILE_EXTENSIONS
        ]:
            logger.debug(
                "Processing file uploads",
                total_files=len(files),
                supported_files=len(files_to_uploads),
                trace_id=trace_id,
            )

            upload_start = time.time()
            await gather(
                *[
                    handle_gcs_file_upload(
                        file=file,
                        crawling_request=crawling_request,
                        session_maker=session_maker,
                        source_id=str(crawling_request["source_id"]),
                    )
                    for file in files_to_uploads
                ]
            )
            upload_duration = time.time() - upload_start
            logger.debug(
                "All file uploads completed",
                file_count=len(files_to_uploads),
                trace_id=trace_id,
                upload_duration_ms=round(upload_duration * 1000, 2),
            )
        else:
            logger.debug(
                "No supported files found for upload",
                total_files=len(files),
                trace_id=trace_id,
            )

        logger.debug(
            "Updating source status to FINISHED",
            source_id=str(crawling_request["source_id"]),
            trace_id=trace_id,
        )

        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=crawling_request["source_id"],
            parent_id=parent_id,
            identifier=crawling_request["url"],
            text_content=content,
            vectors=vectors,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            should_send_notifications=crawling_request["entity_type"]
            != "granting_institution",
        )

        logger.info(
            "URL crawling completed successfully",
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
            vector_count=len(vectors),
            content_length=len(content),
            file_count=len(files),
            trace_id=trace_id,
            total_duration_ms=round((time.time() - start_time) * 1000, 2),
        )

    except Exception as e:
        logger.exception(
            "Error during URL crawling",
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
            error_type=type(e).__name__,
            trace_id=trace_id,
            error_duration_ms=round((time.time() - start_time) * 1000, 2),
        )

        await update_source_indexing_status(
            logger=logger,
            session_maker=session_maker,
            source_id=crawling_request["source_id"],
            parent_id=parent_id,
            identifier=crawling_request["url"],
            text_content="",
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FAILED,
            should_send_notifications=crawling_request["entity_type"]
            != "granting_institution",
        )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_url_crawling,
    ],
)
