from typing import Any, Literal, TypedDict, cast

from kreuzberg._mime_types import EXT_TO_MIME_TYPE
from litestar import post
from litestar.exceptions import ValidationException
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    OrganizationRagSource,
    RagFile,
    RagSource,
)
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import DatabaseError, ValidationError
from packages.shared_utils.src.gcs import download_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app
from services.indexer.src.processing import process_source
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class PubSubMessage(TypedDict):
    message_id: str
    publish_time: str
    data: str
    attributes: dict[str, str]


class PubSubEvent(TypedDict):
    message: PubSubMessage


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


class FileIndexingResponse(TypedDict):
    message: str


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
            # parent_type is one of "grant_application", "funding_organization", or "grant_template"
            # parent_id is a UUID string of the parent entity
            # the filename is a discrete filename with extension
            parent_type, parent_id, filename = gcs_notification["object_name"].split("/")
            file_extension = filename.split(".")[-1]
            mime_type = EXT_TO_MIME_TYPE[file_extension]
        except ValueError as e:
            raise ValidationException(
                "Invalid file path format. Expected format: <parent_type>/<parent_id>/<filename>.<extension>",
            ) from e
        except KeyError as e:
            raise ValidationException(
                f"Unsupported file extension: {gcs_notification['object_name'].split('.')[-1]}. Supported extensions are: {', '.join(EXT_TO_MIME_TYPE.keys())}",
            ) from e

        content = await download_blob(gcs_notification["object_name"])
        bucket_name = get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")
        return FileIndexingRequest(
            bucket_name=bucket_name,
            content=content,
            filename=filename,
            mime_type=mime_type,
            object_path=gcs_notification["object_name"],
            parent_id=parent_id,
            parent_type=cast("Literal['grant_application', 'funding_organization', 'grant_template']", parent_type),
            size=len(content),
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
) -> FileIndexingResponse:
    message = await handle_pubsub_message(data)
    parent_id = message.pop("parent_id")  # type: ignore[misc]
    parent_type = message.pop("parent_type")  # type: ignore[misc]
    content = message.pop("content")  # type: ignore[misc]
    async with session_maker() as session, session.begin():
        try:
            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    [
                        {
                            "indexing_status": FileIndexingStatusEnum.INDEXING,
                            "text_content": "",
                            "source_type": "rag_file",  # Set polymorphic identity ~keep
                        }
                    ]
                )
                .returning(RagSource.id)
            )

            await session.execute(
                insert(RagFile)
                .values(
                    [
                        {
                            "id": source_id,
                            **message,
                        }
                    ]
                )
                .returning(RagFile.id)
            )

            if parent_type == "grant_application":
                await session.execute(
                    insert(GrantApplicationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_application_id": parent_id,
                        }
                    )
                )
            elif parent_type == "funding_organization":
                await session.execute(
                    insert(OrganizationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "funding_organization_id": parent_id,
                        }
                    )
                )
            else:
                await session.execute(
                    insert(GrantTemplateRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_template_id": parent_id,
                        }
                    )
                )
            logger.info("Created new file record", source_id=source_id, parent_type=parent_type, parent_id=parent_id)
        except SQLAlchemyError as e:
            logger.error("Error creating file record", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error creating file record", context=str(e)) from e

    await process_source(
        content=content,
        source_id=str(source_id),
        filename=message["filename"],
        mime_type=message["mime_type"],
    )
    logger.info("Successfully indexed file", source_id=source_id)

    return FileIndexingResponse(
        message="File indexing completed successfully.",
    )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_file_indexing,
    ],
)
