from typing import Any, Literal, TypedDict
from uuid import UUID

from litestar import post
from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganizationRagSource,
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    RagFile,
    RagSource,
    TextVector,
)
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import (
    DatabaseError,
    ExternalOperationError,
    FileParsingError,
    ValidationError,
)
from packages.shared_utils.src.gcs import download_blob, parse_object_uri
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import PubSubEvent, publish_source_processing_message
from packages.shared_utils.src.server import create_litestar_app
from services.indexer.src.processing import process_source
from sqlalchemy import insert, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


SUPPORTED_FILE_EXTENSIONS = {
    "csv": "text/csv",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "latex": "text/latex",
    "md": "text/markdown",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rst": "text/rst",
    "rtf": "text/rtf",
    "txt": "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class GCSNotification(TypedDict):
    bucket_name: str
    object_name: str
    event_type: str


class FileIndexingRequest(TypedDict):
    parent_type: Literal["grant_application", "funding_organization", "grant_template"]
    parent_id: str
    content: bytes
    bucket_name: str
    filename: str
    mime_type: str
    object_path: str
    size: int
    workspace_id: str | None


def get_gcs_notification_data(event: PubSubEvent) -> GCSNotification | None:
    attributes = event["message"]["attributes"]
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
) -> FileIndexingRequest:
    if gcs_notification := get_gcs_notification_data(event):
        try:
            parse_result = parse_object_uri(object_path=gcs_notification["object_name"])
            file_extension = parse_result["filename"].split(".")[-1].lower()
            mime_type = SUPPORTED_FILE_EXTENSIONS.get(file_extension)
            if not mime_type:
                raise ValidationError(
                    f"Unsupported file extension: {file_extension}",
                    context={
                        "object_path": gcs_notification["object_name"],
                        "supported_extensions": list(SUPPORTED_FILE_EXTENSIONS.keys()),
                    },
                )
        except (KeyError, IndexError) as e:
            raise ValidationError(
                "Invalid object path format.",
                context={
                    "object_path": gcs_notification["object_name"],
                },
            ) from e

        content = await download_blob(gcs_notification["object_name"])
        bucket_name = get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")
        return FileIndexingRequest(
            bucket_name=bucket_name,
            content=content,
            filename=parse_result["filename"],
            mime_type=mime_type,
            object_path=gcs_notification["object_name"],
            parent_id=parse_result["parent_id"],
            parent_type=parse_result["parent_type"],
            size=len(content),
            workspace_id=parse_result.get("workspace_id"),
        )
    raise ValidationError(
        "Invalid pubsub message.",
        context={
            "message": event["message"],
            "attributes": event["message"]["attributes"],
        },
    )


@post("/")
async def handle_file_indexing(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    indexing_request = await handle_pubsub_message(data)
    parent_id = indexing_request.pop("parent_id")  # type: ignore[misc]
    parent_type = indexing_request.pop("parent_type")  # type: ignore[misc]
    content = indexing_request.pop("content")  # type: ignore[misc]
    object_path = indexing_request["object_path"]
    indexing_request.get("workspace_id")
    existing_file = None

    async with session_maker() as session, session.begin():
        try:
            rag_source = await session.scalar(
                select(RagSource).join(RagFile, RagSource.id == RagFile.id).where(RagFile.object_path == object_path)
            )
            if rag_source and rag_source.indexing_status != SourceIndexingStatusEnum.FAILED:
                source_id = rag_source.id
                existing_file = True
                indexing_status = rag_source.indexing_status
            else:
                existing_file = False
                indexing_status = SourceIndexingStatusEnum.INDEXING
                source_id = await session.scalar(
                    insert(RagSource)
                    .values(
                        [
                            {
                                "indexing_status": SourceIndexingStatusEnum.INDEXING,
                                "text_content": "",
                                "source_type": RAG_FILE,  # Set polymorphic identity ~keep
                            }
                        ]
                    )
                    .returning(RagSource.id)
                )

                rag_file_data = {k: v for k, v in indexing_request.items() if k != "workspace_id"}
                await session.execute(
                    insert(RagFile)
                    .values(
                        [
                            {
                                "id": source_id,
                                **rag_file_data,
                            }
                        ]
                    )
                    .returning(RagFile.id)
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
                logger.info(
                    "Created new file record", source_id=source_id, parent_type=parent_type, parent_id=parent_id
                )
        except SQLAlchemyError as e:
            logger.error("Error creating file record", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error creating file record", context=str(e)) from e

    if existing_file:
        logger.info(
            "Skipping indexing for existing file",
            source_id=source_id,
            object_path=object_path,
            indexing_status=indexing_status,
        )
        await publish_source_processing_message(
            logger=logger,
            parent_id=UUID(parent_id),
            parent_type=parent_type,
            rag_source_id=source_id,
            indexing_status=indexing_status,
            identifier=indexing_request["filename"],
        )
        return

    try:
        vectors, text_content = await process_source(
            content=content,
            source_id=str(source_id),
            filename=indexing_request["filename"],
            mime_type=indexing_request["mime_type"],
        )

        async with session_maker() as session, session.begin():
            try:
                if vectors:
                    await session.execute(insert(TextVector).values(vectors))
                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == source_id)
                    .values({"indexing_status": SourceIndexingStatusEnum.FINISHED, "text_content": text_content})
                )
                await session.commit()
                logger.info("Successfully indexed file", filename=indexing_request["filename"], source_id=source_id)

                await publish_source_processing_message(
                    logger=logger,
                    parent_id=UUID(parent_id),
                    parent_type=parent_type,
                    rag_source_id=source_id,
                    indexing_status=SourceIndexingStatusEnum.FINISHED,
                    identifier=indexing_request["filename"],
                )
            except SQLAlchemyError as e:
                if "connection" in str(e).lower():
                    logger.error("Database connection error", exc_info=e, filename=indexing_request["filename"])
                    await session.rollback()
                    raise DatabaseError("Database connection failed", context=str(e)) from e
                logger.error("Database operation error", exc_info=e, filename=indexing_request["filename"])
                await session.rollback()
                raise DatabaseError("Error in database operation", context=str(e)) from e

    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        async with session_maker() as session, session.begin():
            try:
                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == source_id)
                    .values(indexing_status=SourceIndexingStatusEnum.FAILED)
                )
                await session.commit()
                await publish_source_processing_message(
                    logger=logger,
                    parent_id=UUID(parent_id),
                    parent_type=parent_type,
                    rag_source_id=source_id,
                    indexing_status=SourceIndexingStatusEnum.FAILED,
                    identifier=indexing_request["filename"],
                )
            except SQLAlchemyError as sql_error:
                logger.error("Failed to mark source as failed: {error}", error=str(e), source_id=source_id)
                await session.rollback()
                raise DatabaseError("Failed to mark source as failed", context=str(sql_error)) from sql_error


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_file_indexing,
    ],
)
