import base64
import binascii
from asyncio import gather
from typing import Any

from litestar import post
from litestar.exceptions import ValidationException
from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError

from packages.db.src.utils import update_source_indexing_status
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.shared_utils.src.exceptions import (
    DeserializationError,
    ValidationError,
    DatabaseError,
)
from packages.shared_utils.src.gcs import construct_object_uri, upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import (
    CrawlingRequest,
    PubSubEvent,
)
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.server import create_litestar_app
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.crawler.src.extraction import crawl_url, FileContent
from services.crawler.src.utils import filter_url
from packages.db.src.constants import RAG_FILE
from packages.db.src.tables import (
    RagSource,
    RagFile,
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    FundingOrganizationRagSource,
)
from packages.shared_utils.src.constants import SUPPORTED_FILE_EXTENSIONS

configure_otel("crawler")

logger = get_logger(__name__)


async def decode_pubsub_message(event: PubSubEvent) -> CrawlingRequest:
    logger.debug(
        "Decoding PubSub message",
        message_id=event.message.message_id,
        publish_time=event.message.publish_time,
    )

    try:
        encoded_data = event.message.data
        if not encoded_data:
            logger.warning("PubSub message missing data field")
            raise ValidationError("PubSub message missing data field")

        logger.debug("Decoding base64 data", data_length=len(encoded_data))
        decoded_data = base64.b64decode(encoded_data).decode()

        logger.debug("Deserializing crawling request", decoded_length=len(decoded_data))
        request = deserialize(decoded_data, CrawlingRequest)

        logger.debug(
            "PubSub message decoded successfully",
            source_id=str(request["source_id"]),
            parent_id=str(request["parent_id"]),
            url=request["url"],
            project_id=str(request["project_id"]) if request["project_id"] else None,
            correlation_id=request.get("correlation_id"),
        )

        return request
    except (DeserializationError, binascii.Error, UnicodeDecodeError) as e:
        logger.error(
            "Validation error processing PubSub message",
            error_type=type(e).__name__,
            error_message=str(e),
            message_id=event.message.message_id,
        )
        raise ValidationError(
            "Failed to decode PubSub message",
            context={"message": event.message, "error": str(e)},
        ) from e


async def handle_gcs_file_upload(
    file: FileContent,
    crawling_request: CrawlingRequest,
    session_maker: async_sessionmaker[Any],
    parent_type: str,
) -> None:
    import time

    start_time = time.time()
    logger.debug(
        "Starting GCS file upload",
        filename=file["filename"],
        file_size=len(file["content"]),
        parent_type=parent_type,
        parent_id=str(crawling_request["parent_id"]),
    )

    async with session_maker() as session, session.begin():
        try:
            db_start = time.time()
            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "source_type": RAG_FILE,
                        "text_content": "",
                    }
                )
                .returning(RagSource.id)
            )
            db_insert_duration = time.time() - db_start

            logger.debug(
                "Created RagSource record",
                source_id=str(source_id),
                db_insert_duration_ms=round(db_insert_duration * 1000, 2),
            )

            object_path = construct_object_uri(
                project_id=crawling_request["project_id"],
                parent_id=crawling_request["parent_id"],
                source_id=source_id,
                blob_name=file["filename"],
            )

            logger.debug("Constructed object path", object_path=object_path)

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

            logger.debug("Creating parent association", parent_type=parent_type)

            if parent_type == "grant_application":
                await session.execute(
                    insert(GrantApplicationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_application_id": crawling_request["parent_id"],
                        }
                    )
                )
            elif parent_type == "funding_organization":
                await session.execute(
                    insert(FundingOrganizationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "funding_organization_id": crawling_request["parent_id"],
                        }
                    )
                )
            else:
                await session.execute(
                    insert(GrantTemplateRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_template_id": crawling_request["parent_id"],
                        }
                    )
                )

            commit_start = time.time()
            await session.commit()
            commit_duration = time.time() - commit_start

            logger.debug(
                "Database transaction committed",
                commit_duration_ms=round(commit_duration * 1000, 2),
            )

            upload_start = time.time()
            await upload_blob(object_path, file["content"])
            upload_duration = time.time() - upload_start

            total_duration = time.time() - start_time
            logger.info(
                "File uploaded to GCS successfully",
                filename=file["filename"],
                source_id=str(source_id),
                file_size=len(file["content"]),
                object_path=object_path,
                upload_duration_ms=round(upload_duration * 1000, 2),
                total_duration_ms=round(total_duration * 1000, 2),
            )

        except SQLAlchemyError as e:
            logger.error("Failed to create RagFile entry in DB", exc_info=e)
            await session.rollback()
            raise DatabaseError(
                "Failed to create RagFile entry in DB", context=str(e)
            ) from e


@post("/")
async def handle_url_crawling(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    import time

    start_time = time.time()
    logger.debug("Starting URL crawling request processing")

    try:
        decode_start = time.time()
        crawling_request = await decode_pubsub_message(data)
        decode_duration = time.time() - decode_start
        correlation_id = crawling_request.get("correlation_id")

        logger.debug(
            "PubSub message decoded successfully",
            source_id=str(crawling_request["source_id"]),
            parent_id=str(crawling_request["parent_id"]),
            url=crawling_request["url"],
            project_id=str(crawling_request["project_id"])
            if crawling_request["project_id"]
            else None,
            correlation_id=correlation_id,
            decode_duration_ms=round(decode_duration * 1000, 2),
        )
    except ValidationError as e:
        logger.error("Invalid PubSub message", exc_info=e)
        raise ValidationException(str(e)) from e

    if filter_url(crawling_request["url"]):
        logger.info(
            "Skipping URL due to filtering rules",
            url=crawling_request["url"],
            correlation_id=correlation_id,
        )
        return

    logger.debug(
        "Updating source status to INDEXING",
        source_id=str(crawling_request["source_id"]),
        correlation_id=correlation_id,
    )
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
        crawl_start = time.time()
        logger.debug(
            "Starting URL crawling",
            url=crawling_request["url"],
            correlation_id=correlation_id,
        )

        vectors, content, files = await crawl_url(
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
        )

        crawl_duration = time.time() - crawl_start
        logger.debug(
            "URL crawling completed",
            url=crawling_request["url"],
            vector_count=len(vectors),
            content_length=len(content),
            file_count=len(files),
            correlation_id=correlation_id,
            crawl_duration_ms=round(crawl_duration * 1000, 2),
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
                correlation_id=correlation_id,
            )

            parent_type = None
            lookup_start = time.time()
            async with session_maker() as session:
                if await session.scalar(
                    select(GrantApplicationRagSource).where(
                        GrantApplicationRagSource.rag_source_id
                        == crawling_request["source_id"]
                    )
                ):
                    parent_type = "grant_application"

                elif await session.scalar(
                    select(GrantTemplateRagSource).where(
                        GrantTemplateRagSource.rag_source_id
                        == crawling_request["source_id"]
                    )
                ):
                    parent_type = "grant_template"

                elif await session.scalar(
                    select(FundingOrganizationRagSource).where(
                        FundingOrganizationRagSource.rag_source_id
                        == crawling_request["source_id"]
                    )
                ):
                    parent_type = "funding_organization"
                else:
                    raise ValidationError(
                        "Could not determine parent type for source",
                        context={"source_id": crawling_request["source_id"]},
                    )

            lookup_duration = time.time() - lookup_start
            logger.debug(
                "Parent type determined",
                parent_type=parent_type,
                correlation_id=correlation_id,
                lookup_duration_ms=round(lookup_duration * 1000, 2),
            )

            upload_start = time.time()
            await gather(
                *[
                    handle_gcs_file_upload(
                        file=file,
                        crawling_request=crawling_request,
                        session_maker=session_maker,
                        parent_type=parent_type,
                    )
                    for file in files_to_uploads
                ]
            )
            upload_duration = time.time() - upload_start
            logger.debug(
                "All file uploads completed",
                file_count=len(files_to_uploads),
                correlation_id=correlation_id,
                upload_duration_ms=round(upload_duration * 1000, 2),
            )
        else:
            logger.debug(
                "No supported files found for upload",
                total_files=len(files),
                correlation_id=correlation_id,
            )

        logger.debug(
            "Updating source status to FINISHED",
            source_id=str(crawling_request["source_id"]),
            correlation_id=correlation_id,
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

        total_duration = time.time() - start_time
        logger.info(
            "URL crawling completed successfully",
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
            vector_count=len(vectors),
            content_length=len(content),
            file_count=len(files),
            correlation_id=correlation_id,
            total_duration_ms=round(total_duration * 1000, 2),
        )

    except Exception as e:
        error_duration = time.time() - start_time
        logger.exception(
            "Error during URL crawling",
            url=crawling_request["url"],
            source_id=str(crawling_request["source_id"]),
            error_type=type(e).__name__,
            correlation_id=correlation_id,
            error_duration_ms=round(error_duration * 1000, 2),
        )
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
