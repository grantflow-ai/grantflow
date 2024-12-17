from datetime import timedelta
from typing import Any

from google.cloud import storage
from google.cloud.storage import Bucket, Client
from google.oauth2.service_account import Credentials

from src.utils.env import get_env
from src.utils.ref import Ref
from src.utils.serialization import deserialize
from src.utils.sync import run_sync

client_ref = Ref[Client]()
buckets: dict[str, Bucket] = {}


def get_storage_client() -> Client:
    """Get the Google Cloud Storage client."""
    if client_ref.value is None:
        service_account_dict = deserialize(get_env("CLOUD_STORAGE_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
        credentials = Credentials.from_service_account_info(service_account_dict)  # type: ignore[no-untyped-call]
        client_ref.value = storage.Client(credentials=credentials)
    return client_ref.value


async def get_bucket(bucket_name: str) -> Bucket:
    """Get a bucket by name.

    Args:
        bucket_name: The name of the bucket.

    Returns:
        The bucket.
    """
    if bucket_name not in buckets:
        storage_client = get_storage_client()
        buckets[bucket_name] = await run_sync(storage_client.get_bucket, bucket_name)
    return buckets[bucket_name]


async def create_signed_upload_url(bucket_name: str, blob_name: str) -> str:
    """Create a signed upload URL for a file.

    Args:
        bucket_name: The name of the bucket.
        blob_name: The name of the blob.

    Returns:
        str: The signed URL.
    """
    bucket = await get_bucket(bucket_name)
    blob_client = bucket.blob(blob_name)
    return await run_sync(
        blob_client.generate_signed_url,
        content_type="application/octet-stream",
        expiration=timedelta(minutes=15),
        method="PUT",
        version="v4",
    )


async def delete_file_blob(bucket_name: str, blob_name: str) -> None:
    """Delete a file from a bucket.

    Args:
        bucket_name: The name of the bucket.
        blob_name: The name of the blob.
    """
    bucket = await get_bucket(bucket_name)
    blob_client = bucket.blob(blob_name)
    await run_sync(blob_client.delete)
