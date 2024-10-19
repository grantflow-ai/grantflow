import logging
from typing import Final

from azure.functions import InputStream

from src.ai_search import ensure_index_exists, upload_to_ai_search
from src.chunking import chunk_text
from src.embeddings import create_embeddings
from src.exceptions import RequestFailureError, ValidationError
from src.extraction import parse_blob_data

logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30


async def blob_trigger_handler(blob: InputStream) -> None:
    """Azure Function to parse a file and index its contents.

    Args:
        blob: The input blob to be parsed.

    Raises:
        ValidationError: If the blob name is not provided.

    Returns:
        None
    """
    logger.info("Extracting text from blob: %s", blob.name)

    if blob.name is None:
        raise ValidationError("Blob name is required")

    workspace_id, parent_id, filename = blob.name.split("/")

    try:
        extracted_data, mime_type = await parse_blob_data(blob_data=blob.read(), filename=filename)
        chunks = chunk_text(extracted_data=extracted_data, mime_type=mime_type)
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
