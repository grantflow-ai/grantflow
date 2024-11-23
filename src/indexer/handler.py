import logging
import sys
from json import dumps
from typing import Final

from azure.functions import InputStream

from src.indexer.ai_search import ensure_index_exists, upload_to_ai_search
from src.indexer.chunking import chunk_text
from src.indexer.dto import BlobFileMetadata
from src.indexer.extraction import parse_blob_data
from src.indexer.indexing import index_documents
from src.utils.exceptions import RequestFailureError, ValidationError

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30
CONTAINER_NAME: Final[str] = "grant-application-files/"


def parse_blob_name(blob_name: str | None) -> BlobFileMetadata:
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
    if len(components) != 4 or any(not x for x in components):
        logger.error("Invalid blob name format: %s", namespace)
        raise ValidationError("Invalid blob name format")

    return BlobFileMetadata(*components)


async def blob_trigger_handler(blob: InputStream) -> None:
    """Azure Function to parse a file and index its contents.

    Args:
        blob: The input blob to be parsed.

    Returns:
        None
    """
    metadata = parse_blob_name(blob.name)

    try:
        extracted_data, mime_type = await parse_blob_data(blob_data=blob.read(), filename=metadata.filename)
        chunks = chunk_text(extracted_data=extracted_data, mime_type=mime_type)
        logger.debug("Extracted text from response: %s", dumps(chunks))

        if search_schemas := await index_documents(chunks=chunks, metadata=metadata):
            await ensure_index_exists()
            await upload_to_ai_search(search_schemas)
            logger.info(
                "Data extraction and indexing Completed for blob: %s, uploaded %d embeddings",
                blob.name,
                len(search_schemas),
            )
        else:
            logger.warning("No embeddings to index for blob: %s", blob.name)

    except (RequestFailureError, ValidationError) as e:
        logger.error("Failed to parse blob: %s, Error: %s", blob.name, e)
