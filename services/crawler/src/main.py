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


async def handle_gcs_file_upload(
    file: FileContent,
    crawling_request: CrawlingRequest,
    session_maker: async_sessionmaker[Any],
    parent_type: str,
) -> None:
    async with session_maker() as session, session.begin():
        try:
            # Create a new RagSource for this file
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

            object_path = construct_object_uri(
                workspace_id=crawling_request["workspace_id"],
                parent_id=crawling_request["parent_id"],
                source_id=source_id,
                blob_name=file["filename"],
            )

            # Create the RagFile entry
            await session.execute(
                insert(RagFile).values(
                    {
                        "id": str(source_id),
                        "bucket_name": "",
                        "object_path": object_path,
                        "filename": file["filename"],
                        "mime_type": SUPPORTED_FILE_EXTENSIONS[
                            file["filename"].split(".")[-1].lower()
                        ],
                        "size": 0,
                    }
                )
            )

            # Create the appropriate association based on parent type
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
            else:  # grant_template
                await session.execute(
                    insert(GrantTemplateRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_template_id": crawling_request["parent_id"],
                        }
                    )
                )

            await session.commit()

            # Upload the file after successful DB transaction
            await upload_blob(object_path, file["content"])

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

        if files_to_uploads := [
            file
            for file in files
            if file["filename"].split(".")[-1].lower() in SUPPORTED_FILE_EXTENSIONS
        ]:
            # Determine parent type by checking associations
            parent_type = None
            async with session_maker() as session:
                # Check GrantApplicationRagSource
                if await session.scalar(
                    select(GrantApplicationRagSource).where(
                        GrantApplicationRagSource.rag_source_id
                        == crawling_request["source_id"]
                    )
                ):
                    parent_type = "grant_application"
                # Check GrantTemplateRagSource
                elif await session.scalar(
                    select(GrantTemplateRagSource).where(
                        GrantTemplateRagSource.rag_source_id
                        == crawling_request["source_id"]
                    )
                ):
                    parent_type = "grant_template"
                # Check FundingOrganizationRagSource
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
