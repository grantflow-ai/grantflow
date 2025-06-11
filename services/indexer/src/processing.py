from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.extraction import extract_file_content
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

logger = get_logger(__name__)


async def process_source(
    *,
    content: bytes,
    source_id: str,
    filename: str,
    mime_type: str,
) -> tuple[list[VectorDTO], str]:
    extracted_text, mime_type = await extract_file_content(
        content=content,
        mime_type=mime_type,
    )
    logger.info("Extracted text from file", filename=filename)

    chunks = chunk_text(text=extracted_text, mime_type=mime_type)
    vectors = await index_chunks(
        chunks=chunks,
        source_id=source_id,
    )

    text_content = extracted_text if isinstance(extracted_text, str) else serialize(extracted_text).decode()

    return vectors, text_content
