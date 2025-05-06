from base64 import b64decode
from typing import Literal, NotRequired, TypedDict, cast

from kreuzberg._mime_types import EXT_TO_MIME_TYPE
from litestar.exceptions import ValidationException
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import DeserializationError
from packages.shared_utils.src.gcs import download_blob
from packages.shared_utils.src.serialization import deserialize


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


class IndexingMessageRequest(TypedDict):
    parent_type: Literal["grant_application", "funding_organization", "grant_template"]
    parent_id: str
    content: bytes
    source_type: Literal["file", "url"]


class FileIndexingRequestMetadata(IndexingMessageRequest):
    bucket_name: str
    filename: str
    mime_type: str
    object_path: str
    size: int


class URLIndexingRequestMetadata(IndexingMessageRequest):
    url: str
    title: NotRequired[str | None]
    description: NotRequired[str | None]


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
) -> FileIndexingRequestMetadata | URLIndexingRequestMetadata:
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
        return FileIndexingRequestMetadata(
            bucket_name=bucket_name,
            content=content,
            filename=filename,
            mime_type=mime_type,
            object_path=gcs_notification["object_name"],
            parent_id=parent_id,
            parent_type=cast("Literal['grant_application', 'funding_organization', 'grant_template']", parent_type),
            size=len(content),
            source_type="file",
        )

    try:
        decoded_data = b64decode(event["message"]["data"]).decode()
        return deserialize(decoded_data, URLIndexingRequestMetadata)
    except DeserializationError as e:
        raise ValidationException(f"Invalid pubsub message format: {e!s}") from e
