import logging
from pathlib import Path

from azure.storage.blob.aio import BlobServiceClient

from src.utils.env import get_env
from tests.indexer.e2e.utils import load_settings_and_set_env

logger = logging.getLogger(__name__)

WORKSPACE_ID = "3d8f40f3-5053-4b55-b431-ede2a167201c"
APPLICATION_ID = "9e4cf818-a3f6-4f3e-9cc2-6e8a3fcf3a05"
SECTION_NAME = "research-plan"


async def upload_test_document() -> None:
    """Upload a test document to the blob storage."""
    load_settings_and_set_env(logger)

    blob_service_client = BlobServiceClient.from_connection_string(get_env("AzureWebJobsStorage"))
    container_client = blob_service_client.get_container_client("grant-application-files")

    test_file = Path(__file__).parent / "test_application.pdf"
    data = test_file.read_bytes()

    filename = f"{WORKSPACE_ID}/{APPLICATION_ID}/{SECTION_NAME}/test_application.pdf"
    client = await container_client.upload_blob(name=filename, data=data, overwrite=True)
    await client.close()  # type: ignore[no-untyped-call]


if __name__ == "__main__":
    import asyncio

    asyncio.run(upload_test_document())
