import logging

from src.dto import FileDTO, VectorDTO
from src.indexer.chunking import chunk_text
from src.indexer.extraction import parse_file_data
from src.indexer.indexing import index_documents

logger = logging.getLogger(__name__)


async def parse_and_index_file(
    file: FileDTO,
) -> list[VectorDTO]:
    """Parse and index the given file.

    Args:
        file: The file to parse and index.

    Returns:
        None
    """
    extracted_text, mime_type = await parse_file_data(file)
    logger.info("Extracted text from file: %s", file.filename)

    chunks = chunk_text(text=extracted_text, mime_type=mime_type)
    vectors = await index_documents(
        chunks=chunks,
    )
    logger.info("Successfully indexed file: %s", file.filename)
    return vectors
