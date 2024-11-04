import logging
from itertools import chain
from typing import Final

from openai import OpenAIError

from src.utils.exceptions import OpenAIFailureError
from src.utils.llm import get_azure_openai
from src.utils.retry import exponential_backoff_retry

logger = logging.getLogger(__name__)

EMBEDDING_MODEL: Final[str] = "text-embedding-3-large"


@exponential_backoff_retry(OpenAIFailureError)
async def generate_embeddings(inputs: str | list[str]) -> list[float]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.

    Raises:
        OpenAIFailureError: If an error occurs while generating embeddings.

    Returns:
        The embeddings for the given text or None if an error occurred.
    """
    client = get_azure_openai()

    try:
        response = await client.embeddings.create(input=inputs, model=EMBEDDING_MODEL)
        return list(chain(*[datum.embedding for datum in response.data]))
    except OpenAIError as e:
        logger.error("Failed to get embeddings due to an API error: %s", e)
        raise OpenAIFailureError(message="Failed to get embeddings", context=str(e)) from e
