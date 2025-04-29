from typing import Any, cast

from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from google.cloud.exceptions import ClientError
from google.cloud.storage import Bucket
from google.oauth2.service_account import Credentials

from packages.shared_utils.src.constants import ONE_MINUTE_SECONDS
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

storage_client_ref = Ref[storage.Client]()
bucket_ref = Ref[Bucket]()


def get_credentials() -> Credentials:
    if get_env("STORAGE_EMULATOR_HOST", fallback=""):
        return cast("Credentials", AnonymousCredentials())  # type: ignore[no-untyped-call]
    credentials = deserialize(get_env("GCS_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
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
        bucket = storage_client.bucket(get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads"))

        if not bucket.exists():
            bucket.create()

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


async def create_signed_upload_url(
    workspace_id: str,
    application_id: str | None,
    blob_name: str,
) -> str:
    blob_path = (
        f"workspaces/{workspace_id}/applications/{application_id}/{blob_name}"
        if application_id
        else f"workspaces/{workspace_id}/{blob_name}"
    )
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
        logger.error("Failed to create signed upload URL", blob_path=blob_path, exc_info=e)
        raise ExternalOperationError(
            "Failed to create signed upload URL",
            context={
                "blob_path": blob_path,
                "error": str(e),
            },
        ) from e
