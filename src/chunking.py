from __future__ import annotations

import logging
from hashlib import sha256
from typing import Final
from uuid import uuid4

from openai import OpenAIError
from openai.lib.azure import AsyncAzureOpenAI
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.dto import SearchSchema
from src.env import get_env
from src.exceptions import OpenAIFailureError
from src.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)

MAX_CHARS: Final[int] = 2000
OVERLAP: Final[int] = 100

EMBEDDING_MODEL: Final[str] = "text-embedding-3-large"
AZURE_API_VERSION: Final[str] = "2024-06-01"


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


@exponential_backoff_retry(OpenAIError)
async def get_embeddings(text: str) -> list[float] | None:
    """Generate embeddings for the given text using the specified model.

    Args:
        text: The text for which embeddings are to be created.

    Returns:
        str: The embeddings for the given text or None if an error occurred.

    """
    client = AsyncAzureOpenAI(
        api_key=get_env("AZURE_OPENAI_KEY"),
        api_version=AZURE_API_VERSION,
        azure_endpoint=get_env("AZURE_OPENAI_ENDPOINT"),
    )

    try:
        response = await client.embeddings.create(input=text, model=EMBEDDING_MODEL)
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
    chunk_id: str,
    filename: str,
    parent_id: str,
    workspace_id: str,
    page_number: int | None,
) -> SearchSchema:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        chunk_id: The ID of the chunk.
        filename: The file ID of the file.
        parent_id: The ID of the parent element.
        workspace_id: The ID of the workspace.
        page_number: The page number of the chunk.

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
        )
        logger.info("Got embeddings from OpenAI for chunk: %s", chunk_id)
        return SearchSchema(
            chunk_id=chunk_id,
            content=chunk,
            content_vector=embeddings,
            content_hash=content_hash,
            filename=filename,
            id=str(uuid4()),
            workspace_id=workspace_id,
            parent_id=parent_id,
            page_number=page_number,
        )
    except OpenAIFailureError as e:
        logger.error("Failed to get embeddings from OpenAI for chunk: %s", chunk_id)
        raise e
