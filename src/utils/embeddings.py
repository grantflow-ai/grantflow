import logging
from enum import StrEnum

from vertexai.language_models import TextEmbeddingInput

from src.constants import EMBEDDING_DIMENSIONS
from src.utils.ai import get_embeddings_client
from src.utils.exceptions import ExternalOperationError
from src.utils.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)


class TaskType(StrEnum):
    """The type of task for which embeddings are to be generated."""

    RetrievalDocument = "RETRIEVAL_DOCUMENT"
    RetrievalQuery = "RETRIEVAL_QUERY"


@exponential_backoff_retry(ExternalOperationError)
async def generate_embeddings(inputs: str | list[str], task: TaskType) -> list[list[float]]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.
        task: The task for which the embeddings are to be created.

    Raises:
        ExternalOperationError: If an error occurs during the operation.

    Returns:
        The embeddings for the given text or None if an error occurred.
    """
    client = get_embeddings_client()

    if not isinstance(inputs, list):
        inputs = [inputs]

    try:
        embeddings = await client.get_embeddings_async(
            [TextEmbeddingInput(text, task.value) for text in inputs],
            output_dimensionality=EMBEDDING_DIMENSIONS,
        )
        logger.info("Successfully generated embeddings")
        return [embedding.values for embedding in embeddings]
    except ValueError as e:
        logger.error("Failed to get embeddings due to an API error: %s", e)
        raise ExternalOperationError(message="Failed to get embeddings", context=str(e)) from e
