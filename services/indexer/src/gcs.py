from typing import Any, cast

from google.cloud import storage
from google.cloud.exceptions import ClientError
from google.cloud.storage import Bucket
from google.oauth2.service_account import Credentials
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

storage_client_ref = Ref[storage.Client]()
bucket_cache: dict[str, Bucket] = {}


def get_storage_credentials() -> Credentials:
    credentials = deserialize(get_env("GCS_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
    return Credentials.from_service_account_info(credentials)  # type: ignore[no-any-return,no-untyped-call]


def get_storage_client() -> storage.Client:
    if not storage_client_ref.value:
        storage_client_ref.value = storage.Client(
            credentials=get_storage_credentials(),
            project=get_env("GOOGLE_CLOUD_PROJECT"),
        )
    return storage_client_ref.value


def get_bucket(bucket_name: str) -> Bucket:
    if bucket_name not in bucket_cache:
        storage_client = get_storage_client()
        bucket_cache[bucket_name] = storage_client.bucket(bucket_name)
    return bucket_cache[bucket_name]


async def download_blob(bucket_name: str, blob_name: str) -> bytes:
    try:
        bucket = await run_sync(get_bucket, bucket_name)
        blob = bucket.blob(blob_name)
        content = await run_sync(blob.download_as_bytes)
        logger.info("Downloaded blob", bucket_name=bucket_name, blob_name=blob_name)
        return cast("bytes", content)
    except ClientError as e:
        logger.error("Failed to download blob", bucket_name=bucket_name, blob_name=blob_name, exc_info=e)
        raise ExternalOperationError(
            "Failed to download blob",
            context={
                "bucket_name": bucket_name,
                "blob_name": blob_name,
                "error": str(e),
            },
        ) from e
