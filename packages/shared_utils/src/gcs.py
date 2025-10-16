from typing import Any, TypedDict, cast
from uuid import UUID

from google.api_core import exceptions
from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from google.cloud.exceptions import ClientError
from google.cloud.storage import Bucket
from google.oauth2.service_account import Credentials

from packages.shared_utils.src.constants import ONE_MINUTE_SECONDS
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.shared_types import EntityType
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

storage_client_ref = Ref[storage.Client]()
bucket_ref = Ref[Bucket]()


class URIParseResult(TypedDict):
    entity_type: EntityType
    entity_id: UUID
    source_id: UUID
    blob_name: str


def get_credentials() -> Credentials:
    if get_env("STORAGE_EMULATOR_HOST", raise_on_missing=False):
        return cast("Credentials", AnonymousCredentials())  # type: ignore[no-untyped-call]

    credentials_json = get_env(
        "GCS_SERVICE_ACCOUNT_CREDENTIALS", raise_on_missing=False
    )
    if credentials_json:
        credentials = deserialize(credentials_json, dict[str, Any])
        return cast(
            "Credentials",
            Credentials.from_service_account_info(  # type: ignore[no-untyped-call]
                credentials,
                scopes=[
                    "https://www.googleapis.com/auth/cloud-platform",
                    "https://www.googleapis.com/auth/devstorage.read_write",
                ],
            ),
        )

    return cast("Credentials", None)


def get_storage_client() -> storage.Client:
    if storage_client_ref.value:
        return storage_client_ref.value

    credentials = get_credentials()
    storage_client_ref.value = storage.Client(
        credentials=credentials,
        project=get_env("GOOGLE_CLOUD_PROJECT"),
    )

    return storage_client_ref.value


def get_bucket() -> Bucket:
    if not bucket_ref.value:
        storage_client = get_storage_client()
        bucket = storage_client.bucket(
            get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")
        )

        try:
            if not bucket.exists():
                bucket.create()
        except exceptions.Conflict:
            pass

        bucket_ref.value = bucket

    return bucket_ref.value


async def download_blob(blob_name: str) -> bytes:
    try:
        bucket_name = get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")
        bucket = await run_sync(get_bucket)

        blob = bucket.blob(blob_name)
        content = await run_sync(blob.download_as_bytes)
        logger.info(
            "Downloaded blob",
            blob_name=blob_name,
            bucket_name=bucket_name,
        )
        return cast("bytes", content)
    except ClientError as e:
        logger.error("Failed to download blob", blob_name=blob_name, exc_info=e)
        raise ExternalOperationError(
            "Failed to download blob",
            context={
                "blob_name": blob_name,
                "error": str(e),
            },
        ) from e


def construct_object_uri(
    *,
    entity_type: EntityType,
    entity_id: UUID | str,
    source_id: UUID | str,
    blob_name: str,
) -> str:
    return f"{entity_type}/{entity_id}/{source_id}/{blob_name}"


def parse_object_uri(
    *,
    object_path: str,
) -> URIParseResult:
    components = object_path.split("/")
    if len(components) == 4:
        entity_type_str, entity_id_str, source_id_str, blob_name = components

        if entity_type_str not in (
            "grant_application",
            "grant_template",
            "granting_institution",
        ):
            raise ValidationError(
                "Invalid entity type. Must be one of: grant_application, grant_template, granting_institution",
                context={
                    "entity_type": entity_type_str,
                    "object_path": object_path,
                },
            )

        return URIParseResult(
            entity_type=entity_type_str,  # type: ignore[typeddict-item]
            entity_id=UUID(entity_id_str),
            source_id=UUID(source_id_str),
            blob_name=blob_name,
        )

    raise ValidationError(
        "Invalid object path format. Expected format: <entity_type>/<entity_id>/<source_id>/<blob_name>",
        context={
            "object_path": object_path,
        },
    )


async def create_signed_upload_url(
    entity_type: EntityType,
    entity_id: UUID | str,
    source_id: UUID | str,
    blob_name: str,
    trace_id: str | None = None,
    content_type: str | None = None,
) -> str:
    blob_path = construct_object_uri(
        entity_type=entity_type,
        entity_id=entity_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    # Dev bypass: return special URL for direct indexer upload ~keep
    if get_env(
        "DEBUG", fallback="false", raise_on_missing=False
    ).lower() == "true" and not get_env(
        "STORAGE_EMULATOR_HOST", raise_on_missing=False
    ):
        dev_url = f"dev://indexer/{blob_path}"
        logger.info(
            "Created dev bypass URL for direct indexer upload",
            blob_name=blob_name,
            blob_path=blob_path,
        )
        return dev_url

    # E2E tests: use GCS emulator if configured ~keep
    if emulator_host := get_env("STORAGE_EMULATOR_HOST", raise_on_missing=False):
        bucket_name = get_env(
            "GCS_BUCKET_NAME", raise_on_missing=False, fallback="grantflow-uploads"
        )
        emulator_url = f"{emulator_host}/upload/storage/v1/b/{bucket_name}/o?uploadType=media&name={blob_path}"
        logger.info(
            "Created emulator upload URL",
            blob_name=blob_name,
            url=emulator_url,
        )
        return emulator_url

    try:
        bucket = await run_sync(get_bucket)

        blob = bucket.blob(blob_path)

        headers = {}
        if content_type:
            headers["Content-Type"] = content_type

        signed_url = await run_sync(
            lambda: blob.generate_signed_url(
                version="v4",
                expiration=ONE_MINUTE_SECONDS * 5,
                method="PUT",
                headers=headers if headers else None,
                content_type=content_type,
            )
        )

        logger.info(
            "Created signed upload URL",
            blob_name=blob_name,
            trace_id=trace_id,
        )

        return cast("str", signed_url)
    except ClientError as e:
        logger.error(
            "Failed to create signed upload URL", blob_path=blob_path, exc_info=e
        )
        raise ExternalOperationError(
            "Failed to create signed upload URL",
            context={
                "blob_path": blob_path,
                "error": str(e),
            },
        ) from e


async def upload_blob(blob_path: str, content: bytes) -> None:
    try:
        bucket = await run_sync(get_bucket)
        blob = bucket.blob(blob_path)

        await run_sync(lambda: blob.upload_from_string(content))

        logger.info(
            "Uploaded blob",
            blob_path=blob_path,
        )
    except ClientError as e:
        logger.error("Failed to upload blob", blob_path=blob_path, exc_info=e)
        raise ExternalOperationError(
            "Failed to upload blob",
            context={
                "blob_path": blob_path,
                "error": str(e),
            },
        ) from e


async def delete_blob(blob_path: str) -> None:
    try:
        bucket = await run_sync(get_bucket)
        blob = bucket.blob(blob_path)

        exists = await run_sync(blob.exists)
        if not exists:
            logger.info("Blob does not exist, skipping deletion", blob_path=blob_path)
            return

        await run_sync(blob.delete)

        logger.info(
            "Deleted blob",
            blob_path=blob_path,
        )
    except ClientError as e:
        logger.error("Failed to delete blob", blob_path=blob_path, exc_info=e)
        raise ExternalOperationError(
            "Failed to delete blob",
            context={
                "blob_path": blob_path,
                "error": str(e),
            },
        ) from e


async def create_signed_download_url(
    bucket_name: str,
    object_path: str,
    filename: str,
    trace_id: str | None = None,
    expiration_seconds: int = ONE_MINUTE_SECONDS * 60,
) -> str:
    if get_env("DEBUG", fallback="false", raise_on_missing=False).lower() == "true":
        dev_url = f"dev://download/{bucket_name}/{object_path}"
        logger.info(
            "Created dev bypass URL for file download",
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
        )
        return dev_url

    if emulator_host := get_env("STORAGE_EMULATOR_HOST", raise_on_missing=False):
        emulator_url = (
            f"{emulator_host}/storage/v1/b/{bucket_name}/o/{object_path}?alt=media"
        )
        logger.info(
            "Created emulator download URL",
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
        )
        return emulator_url

    try:
        storage_client = get_storage_client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_path)

        if not await run_sync(blob.exists):
            raise ExternalOperationError(
                "File not found",
                context={
                    "bucket_name": bucket_name,
                    "object_path": object_path,
                    "filename": filename,
                },
            )

        signed_url = await run_sync(
            blob.generate_signed_url,
            version="v4",
            expiration=expiration_seconds,
            method="GET",
            response_disposition=f'inline; filename="{filename}"' if filename else None,
        )

        logger.info(
            "Created signed download URL",
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
            expiration_seconds=expiration_seconds,
            trace_id=trace_id,
        )

        return cast("str", signed_url)
    except ClientError as e:
        logger.error(
            "Failed to create signed download URL",
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
            exc_info=e,
        )
        raise ExternalOperationError(
            "Failed to create signed download URL",
            context={
                "bucket_name": bucket_name,
                "object_path": object_path,
                "filename": filename,
                "error": str(e),
            },
        ) from e
