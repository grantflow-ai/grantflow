import logging
import sys
from json import dumps
from typing import Final, cast

from azure.functions import Blueprint, InputStream

from src.ai_search import ensure_index_exists, upload_to_ai_search
from src.chunking import chunk_text
from src.embeddings import create_embeddings
from src.exceptions import RequestFailureError, ValidationError
from src.extraction import parse_blob_data

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30
CONTAINER_NAME: Final[str] = "grant-application-files/"


def parse_blob_name(blob_name: str | None) -> tuple[str, str, str]:
    """Parse the name of the blob to its components.

    Expected format: {container_name}/{workspace_id}/{parent_id}/{filename}

    Args:
        blob_name: The name string.

    Raises:
        ValidationError: If the blob name is not provided or is of invalid format.

    Returns:
        A tuple of workspace_id, parent_id, filename
    """
    if blob_name is None:
        logger.error("Blob name is None")
        raise ValidationError("Blob name is required")

    namespace = blob_name.replace(CONTAINER_NAME, "").removeprefix("/")
    logger.info("Extracting text from blob: %s", namespace)

    components = namespace.split("/")
    if len(components) != 3 or any(not x for x in components):
        logger.error("Invalid blob name format: %s", namespace)
        raise ValidationError("Invalid blob name format")

    return cast(tuple[str, str, str], tuple(components))


async def blob_trigger_handler(blob: InputStream) -> None:
    """Azure Function to parse a file and index its contents.

    Args:
        blob: The input blob to be parsed.

    Returns:
        None
    """
    workspace_id, parent_id, filename = parse_blob_name(blob.name)

    try:
        extracted_data, mime_type = await parse_blob_data(blob_data=blob.read(), filename=filename)
        chunks = chunk_text(extracted_data=extracted_data, mime_type=mime_type)
        logger.info("Extracted text from response: %s", dumps(chunks))

        if embeddings := await create_embeddings(
            chunks=chunks,
            filename=filename,
            parent_id=parent_id,
            workspace_id=workspace_id,
        ):
            await ensure_index_exists()
            await upload_to_ai_search(embeddings)
            logger.info(
                "Data extraction and indexing Completed for blob: %s, uploaded %d embeddings",
                blob.name,
                len(embeddings),
            )
        else:
            logger.warning("No embeddings to index for blob: %s", blob.name)

    except (RequestFailureError, ValidationError) as e:
        logger.error("Failed to parse blob: %s, Error: %s", blob.name, e)


"""
- see the documentation on Azure Blob trigger name patterns:
    https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-python#blob-name-patterns
- see the documentation about Binding Expressions:
    https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-expressions-patterns
"""
blueprint = Blueprint(name="parser-indexer")  # type: ignore[no-untyped-call]

blueprint.function_name(name=blob_trigger_handler.__name__)(
    blueprint.blob_trigger(
        arg_name="blob",
        path="grant-application-files/{workspace_id}/{parent_id}/{filename}",
        connection="AzureWebJobsStorage",
    )(blob_trigger_handler)
)
