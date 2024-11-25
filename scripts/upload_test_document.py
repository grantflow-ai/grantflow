import logging
from pathlib import Path

from azure.storage.blob.aio import BlobServiceClient

from src.utils.env import get_env
from tests.indexer.e2e.utils import load_settings_and_set_env

logger = logging.getLogger(__name__)

WORKSPACE_ID = "3d8f40f3-5053-4b55-b431-ede2a167201c"
APPLICATION_ID = "9e4cf818-a3f6-4f3e-9cc2-6e8a3fcf3a05"

INNOVATION_FILES = [
    "EIC_SIGNIFICANCE.docx",
    "EIC_INNOVATION.docx",
]

RESEARCH_PLAN_FILES = ["EIC_AIMS.docx", "EIC_PRELIM.docx", "EIC_RISKS.docx"]


async def upload_test_documents() -> None:
    """Upload a test document to the blob storage."""
    load_settings_and_set_env(logger)

    blob_service_client = BlobServiceClient.from_connection_string(get_env("AzureWebJobsStorage"))
    container_client = blob_service_client.get_container_client("grant-application-files")

    for file in INNOVATION_FILES:
        test_file = Path(__file__).parent / file
        data = test_file.read_bytes()

        filename = f"{WORKSPACE_ID}/{APPLICATION_ID}/significance-and-innovation/{file}"
        await container_client.upload_blob(name=filename, data=data, overwrite=True)

    for file in RESEARCH_PLAN_FILES:
        test_file = Path(__file__).parent / file
        data = test_file.read_bytes()

        filename = f"{WORKSPACE_ID}/{APPLICATION_ID}/research-plan/{file}"
        await container_client.upload_blob(name=filename, data=data, overwrite=True)

    await container_client.close()  # type: ignore[no-untyped-call]


if __name__ == "__main__":
    import asyncio

    asyncio.run(upload_test_documents())
