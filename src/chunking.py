from __future__ import annotations

import logging
from hashlib import sha256
from typing import Final
from uuid import uuid4

from openai import OpenAIError
from openai.lib.azure import AsyncAzureOpenAI
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.dto import Chunk, OCROutput, SearchSchema
from src.env import get_env
from src.exceptions import OpenAIFailureError
from src.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)

MAX_CHARS: Final[int] = 2000

EMBEDDING_MODEL: Final[str] = "text-embedding-3-large"
AZURE_API_VERSION: Final[str] = "2024-06-01"


def chunk_text(*, extracted_data: bytes | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        extracted_data: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[str]: The list of chunks.
    """
    if mime_type == "text/markdown":
        chunker: MarkdownSplitter | TextSplitter = MarkdownSplitter(capacity=MAX_CHARS)
    else:
        chunker = TextSplitter(capacity=MAX_CHARS)

    if isinstance(extracted_data, bytes):
        return [
            Chunk(
                content=chunk,
                page_number=None,
            )
            for chunk in chunker.chunks(extracted_data.decode())
        ]

    paged_chunks: list[Chunk] = []

    for page in extracted_data["pages"]:
        line_contents = "\n".join([line["content"] for line in page["lines"]])
        paged_chunks.extend(
            Chunk(
                content=chunk,
                page_number=page["pageNumber"],
            )
            for chunk in chunker.chunks(line_contents)
        )

    return paged_chunks


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


def compute_hash(*, chunk: Chunk, workspace_id: str, filename: str) -> str:
    """Compute the hash for the chunk content and metadata.

    Args:
        chunk: The chunked element.
        workspace_id: The workspace ID.
        filename: The file ID of the file.

    Returns:
        str: Hash of the content.
    """
    value = chunk["content"] + workspace_id + filename
    return sha256(value.encode()).hexdigest()


async def process_chunk(
    *,
    chunk: Chunk,
    filename: str,
    parent_id: str,
    workspace_id: str,
) -> SearchSchema:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        filename: The file ID of the file.
        parent_id: The ID of the parent element.
        workspace_id: The ID of the workspace.

    Returns:
        SearchSchema | None

    """
    content_hash = compute_hash(chunk=chunk, workspace_id=workspace_id, filename=filename)

    logger.debug(
        "Preparing chunk for indexing with filename: %s and chunk_id: %s",
    )
    try:
        embeddings = await get_embeddings(
            text=chunk["content"],
        )
        return SearchSchema(
            id=str(uuid4()),
            content=chunk["content"],
            content_hash=content_hash,
            content_vector=embeddings,
            filename=filename,
            page_number=chunk["page_number"],
            parent_id=parent_id,
            workspace_id=workspace_id,
        )
    except OpenAIFailureError as e:
        logger.error("Failed to get embeddings from OpenAI for chunk: %s", chunk["content"])
        raise e
