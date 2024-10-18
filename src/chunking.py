from __future__ import annotations

import logging
from hashlib import sha256
from typing import Final
from uuid import uuid4

from openai import OpenAIError
from openai.lib.azure import AsyncAzureOpenAI
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.ai_search import SearchSchema
from src.env import get_env
from src.exceptions import OpenAIFailureError
from src.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)

MAX_CHARS: Final[int] = 2000
OVERLAP: Final[int] = 100


def chunk_text(*, text: str, mime_type: str) -> list[str]:
    """Chunk the text into smaller pieces.

    Args:
        text: The text to be chunked.
        mime_type: The MIME type of the text.

    Returns:
        list[str]: The list of chunks.
    """
    if mime_type == "text/markdown":
        chunker: MarkdownSplitter | TextSplitter = MarkdownSplitter(MAX_CHARS, OVERLAP)
    else:
        chunker = TextSplitter(MAX_CHARS, OVERLAP)

    return chunker.chunks(text)


def map_chunk_element_to_search_schema(
    chunk: str,
    chunk_id: str,
    filename: str,
    embeddings: list[float] | None,
    content_hash: str,
) -> SearchSchema:
    """Map chunk element to search schema.

    Args:
        chunk: chunked Element to be indexed.
        chunk_id: Chunk ID for the document.
        filename: The name of the file from which the content was extracted.
        embeddings: Vector representation of the content.
        content_hash: Hash of the content.

    Returns:
        SearchSchema: Dictionary compatible with index schema and ready for indexing.

    """
    return SearchSchema(
        chunk_id=chunk_id,
        content=chunk,
        content_vector=embeddings,
        content_hash=content_hash,
        filename=filename,
        id=str(uuid4()),
        page_number=None,
    )


@exponential_backoff_retry(OpenAIError)
async def get_embeddings(text: str, model: str) -> list[float] | None:
    """Generate embeddings for the given text using the specified model.

    Args:
        text: The text for which embeddings are to be created.
        model: The model to use for creating embeddings.

    Returns:
        str: The embeddings for the given text or None if an error occurred.

    """
    client = AsyncAzureOpenAI(
        api_key=get_env("AZURE_OPENAI_KEY"),
        api_version=get_env("AZURE_OPENAI_API_VERSION"),
        azure_endpoint=get_env("AZURE_OPENAI_ENDPOINT"),
    )

    try:
        response = await client.embeddings.create(input=text, model=model)
        result = response.data[0].embedding
        logger.info("Successfully generated embeddings")
        return result
    except (OpenAIError, IndexError) as e:
        logger.error("Failed to get embeddings due to an API error: %s", e)
        raise OpenAIFailureError(message="Failed to get embeddings", context=str(e)) from e


def compute_hash(chunk: str, filename: str) -> str:
    """Compute the hash for the chunk content and metadata.

    Args:
        chunk: The chunked element.
        filename: The file ID of the file.

    Returns:
        str: Hash of the content.
    """
    return sha256((chunk + filename).encode()).hexdigest()


async def process_chunk(
    *,
    chunk: str,
    filename: str,
    chunk_id: str,
) -> SearchSchema | None:
    """Process a single chunked element.

    Args:
        chunk: Element to be indexed.
        filename: The name of the file from which the content was extracted.
        chunk_id: Chunk ID for the document.

    Returns:
        SearchSchema | None

    """
    content_hash = compute_hash(chunk, filename)

    logger.info(
        "Preparing chunk for indexing with filename: %s and chunk_id: %s",
    )
    try:
        embeddings = await get_embeddings(
            text=chunk,
            model=get_env("EMBEDDING_MODEL"),
        )
        logger.info("Got embeddings from OpenAI for chunk: %s", chunk_id)
        return map_chunk_element_to_search_schema(
            chunk,
            filename=filename,
            chunk_id=chunk_id,
            embeddings=embeddings,
            content_hash=content_hash,
        )
    except OpenAIFailureError as e:
        logger.error("Failed to get embeddings from OpenAI for chunk: %s", chunk_id)
        raise e
