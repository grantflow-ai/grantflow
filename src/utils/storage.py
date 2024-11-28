from functools import partial

from anyio.to_thread import run_sync
from google.cloud.storage import Bucket, Client
from google.oauth2.service_account import Credentials

from src.constants import CONTENT_TYPE_JSON
from src.utils.env import get_env
from src.utils.ref import Ref

ref = Ref[Client]()


def get_client() -> Client:
    """Get the Google Cloud Storage client.

    Returns:
        The Google Cloud Storage client.
    """
    if not ref.value:
        ref.value = Client(
            project=get_env("GCP_PROJECT_ID"),
            credentials=Credentials.from_service_account_info(get_env("GCP_CREDENTIALS")),  # type: ignore[no-untyped-call]
        )
    return ref.value


def get_bucket(bucket_name: str) -> Bucket:
    """Get the Google Cloud Storage bucket.

    Args:
        bucket_name: The name of the bucket to get.

    Returns:
        The Google Cloud Storage bucket
    """
    client = get_client()
    bucket: Bucket = client.bucket(bucket_name)
    if not bucket.exists():
        bucket.create()
    return bucket


async def upload_to_bucket(
    bucket_name: str,
    filename: str,
    data: str,
) -> None:
    """Uploads a number of files in parallel to the bucket."

    Args:
        bucket_name: The name of the bucket to upload to.
        filename: The name of the file to upload.
        data: The content of the file to upload.

    Returns:
        None
    """
    bucket = await run_sync(get_bucket, bucket_name)
    blob = bucket.blob(filename)
    await run_sync(partial(blob.upload_from_string, content_type=CONTENT_TYPE_JSON, num_retries=3), data)
