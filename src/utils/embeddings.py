from fastembed import TextEmbedding

from src.utils.logger import get_logger

logger = get_logger(__name__)
embedding_model = TextEmbedding()


async def generate_embeddings(inputs: str | list[str]) -> list[list[float]]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.

    Returns:
        The embeddings for the given text or None if an error occurred.
    """
    if not isinstance(inputs, list):
        inputs = [inputs]

    return list(embedding_model.embed(inputs))
