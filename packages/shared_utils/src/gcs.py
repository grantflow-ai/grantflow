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
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

storage_client_ref = Ref[storage.Client]()
bucket_ref = Ref[Bucket]()


class URIParseResult(TypedDict):
    project_id: UUID | None
    parent_id: UUID
    source_id: UUID
    blob_name: str


def get_credentials() -> Credentials:
    if get_env("STORAGE_EMULATOR_HOST", fallback=""):
        return cast("Credentials", AnonymousCredentials())  # type: ignore[no-untyped-call]
    credentials = deserialize(
        get_env("GCS_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any]
    )
    return cast("Credentials", Credentials.from_service_account_info(credentials))  # type: ignore[no-untyped-call]


def get_storage_client() -> storage.Client:
    if storage_client_ref.value:
        return storage_client_ref.value

    storage_client_ref.value = storage.Client(
        credentials=get_credentials(),
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
    project_id: UUID | str | None,
    parent_id: UUID | str,
    source_id: UUID | str,
    blob_name: str,
) -> str:
    return (
        f"{project_id}/{parent_id}/{source_id}/{blob_name}"
        if project_id
        else f"{parent_id}/{source_id}/{blob_name}"
    )


def parse_object_uri(
    *,
    object_path: str,
) -> URIParseResult:
    components = object_path.split("/")

    if len(components) == 4 or len(components) == 3:
        if len(components) == 4:
            project_id, parent_id, source_id, blob_name = components
        else:
            project_id = None
            parent_id, source_id, blob_name = components

        return URIParseResult(
            project_id=UUID(project_id) if project_id else None,
            parent_id=UUID(parent_id),
            source_id=UUID(source_id),
            blob_name=blob_name,
        )

    raise ValidationError(
        "Invalid object path format. Expected format: <project_id>/<parent_id>/<source_id>/<blob_name> or <parent_id>/<source_id>/<blob_name>",
        context={
            "object_path": object_path,
        },
    )


async def create_signed_upload_url(
    project_id: UUID | str | None,
    parent_id: UUID | str,
    source_id: UUID | str,
    blob_name: str,
) -> str:
    blob_path = construct_object_uri(
        project_id=project_id,
        parent_id=parent_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    # Dev bypass: return special URL for direct indexer upload ~keep
    if get_env("DEBUG", fallback="False").lower() == "true" and not get_env(
        "STORAGE_EMULATOR_HOST", fallback=""
    ):
        dev_url = f"dev://indexer/{blob_path}"
        logger.info(
            "Created dev bypass URL for direct indexer upload",
            blob_name=blob_name,
            blob_path=blob_path,
        )
        return dev_url

    # E2E tests: use GCS emulator if configured ~keep
    if emulator_host := get_env(
        "STORAGE_EMULATOR_HOST", raise_on_missing=False, fallback=""
    ):
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

        signed_url = await run_sync(
            lambda: blob.generate_signed_url(
                version="v4",
                expiration=ONE_MINUTE_SECONDS * 5,
                method="PUT",
            )
        )

        logger.info(
            "Created signed upload URL",
            blob_name=blob_name,
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
