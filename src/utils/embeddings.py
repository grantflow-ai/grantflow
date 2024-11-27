import logging
from typing import Final, Literal

from vertexai.language_models import TextEmbeddingInput

from src.constants import EMBEDDING_DIMENSIONS
from src.utils.ai import get_embeddings_client
from src.utils.exceptions import RequestFailureError
from src.utils.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)

EMBEDDING_MODEL: Final[str] = "text-embedding-3-large"


@exponential_backoff_retry(RequestFailureError)
async def generate_embeddings(
    inputs: str | list[str], task: Literal["RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY"]
) -> list[list[float]]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.

    Raises:
        OpenAIFailureError: If an error occurs while generating embeddings.

    Returns:
        The embeddings for the given text or None if an error occurred.
    """
    client = get_embeddings_client()

    try:
        embeddings = await client.get_embeddings_async(
            [TextEmbeddingInput(text, task) for text in inputs], output_dimensionality=EMBEDDING_DIMENSIONS
        )
        logger.info("Successfully generated embeddings")
        return [embedding.values for embedding in embeddings]
    except ValueError as e:
        logger.error("Failed to get embeddings due to an API error: %s", e)
        raise RequestFailureError(message="Failed to get embeddings", context=str(e)) from e
