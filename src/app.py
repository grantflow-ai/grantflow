import logging
from asyncio import gather
from typing import Final

from azure.functions import InputStream

from src.ai_search import ensure_index_exists, upload_to_ai_search
from src.chunking import chunk_text, process_chunk
from src.dto import SearchSchema
from src.exceptions import RequestFailureError, ValidationError
from src.extraction import parse_blob_data

logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30


async def blob_trigger_handler(blob: InputStream) -> None:
    """Azure Function to parse a file and index its contents.

    Args:
        blob: The input blob to be parsed.

    Returns:
        None
    """
    logger.info("Extracting text from blob: %s", blob.name)

    if blob.name is None:
        raise ValidationError("Blob name is required")

    workspace_id, parent_id, filename = blob.name.split("/")

    try:
        if documents_to_index := await prepare_data(
            blob_data=blob.read(),
            filename=filename,
            parent_id=parent_id,
            workspace_id=workspace_id,
        ):
            await index_documents(documents_to_index)
            logger.info("Data extraction and indexing Completed for blob: %s", blob.name)
        else:
            logger.warning("No documents to index for blob: %s", blob.name)

    except (RequestFailureError, ValidationError) as e:
        logger.error("Failed to parse blob: %s, Error: %s", blob.name, e)


async def prepare_data(
    *,
    blob_data: bytes,
    filename: str,
    parent_id: str,
    workspace_id: str,
) -> list[SearchSchema]:
    """Extract text from the given file blob data.

    Args:
        blob_data: The data of the file blob.
        filename: The name of the file.
        parent_id: The parent ID of the file.
        workspace_id: The workspace ID

    Returns:
        The extracted text from the file blob.
    """
    extracted_data, mime_type = await parse_blob_data(blob_data=blob_data, filename=filename)
    chunks = chunk_text(extracted_data=extracted_data, mime_type=mime_type)

    documents_to_index: list[SearchSchema] = []

    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                process_chunk(
                    chunk=chunk,
                    filename=filename,
                    workspace_id=workspace_id,
                    parent_id=parent_id,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        documents_to_index.extend([result for result in results if result is not None])

    logger.info("Finishing parsing file: %s, with %d documents to upload", filename, len(documents_to_index))
    return documents_to_index


async def index_documents(documents_to_index: list[SearchSchema]) -> None:
    """Index the given documents.

    Args:
        documents_to_index: The documents to index.

    Returns:
        None
    """
    await ensure_index_exists()
    await upload_to_ai_search(documents_to_index)
