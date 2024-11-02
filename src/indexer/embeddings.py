import logging
from asyncio import gather
from hashlib import sha256
from typing import Final
from uuid import uuid4

from openai import OpenAIError
from openai.lib.azure import AsyncAzureOpenAI

from src.indexer.dto import Chunk, SearchSchema
from src.utils.env import get_env
from src.utils.exceptions import OpenAIFailureError
from src.utils.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30
EMBEDDING_MODEL: Final[str] = "text-embedding-3-large"
AZURE_API_VERSION: Final[str] = "2024-06-01"


@exponential_backoff_retry(OpenAIFailureError)
async def generate_embeddings(text: str) -> list[float] | None:
    """Generate embeddings for the given text using the specified model.

    Args:
        text: The text for which embeddings are to be created.

    Raises:
        OpenAIFailureError: If an error occurs while generating embeddings.

    Returns:
        str: The embeddings for the given text or None if an error occurred.

    """
    client = AsyncAzureOpenAI(
        api_key=get_env("AZURE_OPENAI_KEY"),
        api_version=AZURE_API_VERSION,
        azure_endpoint=get_env("AZURE_OPENAI_EMBEDDINGS_ENDPOINT"),
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
    embeddings = await generate_embeddings(
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


async def create_embeddings(
    *, chunks: list[Chunk], filename: str, parent_id: str, workspace_id: str
) -> list[SearchSchema]:
    """Create embeddings for the given chunks.

    Args:
        chunks: The chunks to create embeddings for.
        filename: The name of the file from which the chunks were extracted.
        parent_id: The ID of the parent element.
        workspace_id: The ID of the workspace.

    Returns:
        The list of documents to index.
    """
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
