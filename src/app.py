import logging
from asyncio import gather
from typing import Final

from azure.functions import InputStream

from src.ai_search import SearchSchema, ensure_index_exists, upload_to_ai_search
from src.chunking import chunk_text, process_chunk
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

    try:
        extracted_text, mime_type = await parse_blob_data(blob_data=blob.read(), filename=blob.name)
        chunked_elements = chunk_text(text=extracted_text.decode(), mime_type=mime_type)

        documents_to_index: list[SearchSchema] = []

        for i in range(0, len(chunked_elements), CHUNKS_BATCH_SIZE):
            batch = chunked_elements[i : i + CHUNKS_BATCH_SIZE]
            results = await gather(
                *[
                    process_chunk(
                        chunk_id=str(i + j),
                        chunk=chunked_element,
                        filename=blob.name,
                    )
                    for j, chunked_element in enumerate(batch)
                ]
            )
            documents_to_index.extend([result for result in results if result is not None])

        if documents_to_index:
            await ensure_index_exists()
            await upload_to_ai_search(documents_to_index)

        logger.info("Data extraction and indexing Completed for blob: %s", blob.name)
    except (RequestFailureError, ValidationError) as e:
        logger.error("Failed to parse blob: %s, Error: %s", blob.name, e)
