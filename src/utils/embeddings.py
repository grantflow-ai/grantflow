from enum import StrEnum
from itertools import chain

from vertexai.language_models import TextEmbeddingInput

from src.constants import EMBEDDING_DIMENSIONS
from src.exceptions import ExternalOperationError
from src.utils.ai import get_embeddings_client
from src.utils.logging import get_logger
from src.utils.retry import with_exponential_backoff_retry

logger = get_logger(__name__)


class TaskType(StrEnum):
    """The type of task for which embeddings are to be generated."""

    RetrievalDocument = "RETRIEVAL_DOCUMENT"
    RetrievalQuery = "RETRIEVAL_QUERY"


@with_exponential_backoff_retry(ExternalOperationError)
async def generate_embeddings(
    inputs: str | list[str], task: TaskType, output_dimensionality: int = EMBEDDING_DIMENSIONS
) -> list[float]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.
        task: The task for which the embeddings are to be created.
        output_dimensionality: The dimensionality of the output embeddings.

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
            output_dimensionality=output_dimensionality,
        )
        logger.info("Successfully generated embeddings")
        return list(chain(*[embedding.values for embedding in embeddings]))
    except ValueError as e:
        logger.error("Failed to get embeddings due to an API error.", exec_info=e)
        raise ExternalOperationError(message="Failed to get embeddings", context=str(e)) from e
