from enum import StrEnum
from itertools import batched, chain

from google.api_core.exceptions import GoogleAPIError
from vertexai.language_models import TextEmbeddingInput

from src.constants import EMBEDDING_DIMENSIONS
from src.exceptions import ExternalOperationError
from src.utils.ai import get_embeddings_client
from src.utils.logger import get_logger
from src.utils.retry import with_exponential_backoff_retry

logger = get_logger(__name__)


class TaskType(StrEnum):
    """The type of task for which embeddings are to be generated."""

    RetrievalDocument = "RETRIEVAL_DOCUMENT"
    RetrievalQuery = "RETRIEVAL_QUERY"


@with_exponential_backoff_retry(ExternalOperationError)
async def get_embeddings(inputs: list[TextEmbeddingInput]) -> list[float]:
    """Get embeddings for the given text.

    Args:
        inputs: The text for which embeddings are to be created.

    Raises:
        ExternalOperationError: If an error occurs during the operation.

    Returns:
        The embeddings for the given text.
    """
    client = get_embeddings_client()
    try:
        embeddings = await client.get_embeddings_async(
            inputs,
            output_dimensionality=EMBEDDING_DIMENSIONS,
        )
        logger.info("Successfully generated embeddings")
        return list(chain(*[embedding.values for embedding in embeddings]))
    except GoogleAPIError as e:
        logger.error("Failed to get embeddings due to an API error.", exec_info=e)
        raise ExternalOperationError(message="Failed to get embeddings", context=str(e)) from e


async def generate_embeddings(inputs: str | list[str], task: TaskType) -> list[float]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.
        task: The task for which the embeddings are to be created.

    Returns:
        The embeddings for the given text or None if an error occurred.
    """
    if not isinstance(inputs, list):
        inputs = [inputs]

    ret: list[float] = []
    for batch in batched(inputs, 100):
        result = await get_embeddings([TextEmbeddingInput(text=text, task_type=task) for text in batch])
        ret.extend(result)

    return ret
