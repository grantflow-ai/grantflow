from fastembed import TextEmbedding

from src.utils.logger import get_logger
from src.utils.ref import Ref

logger = get_logger(__name__)
embedding_model_ref = Ref[TextEmbedding]()


def get_embedding_model() -> TextEmbedding:
    """Get the embedding model.

    Returns:
        The embedding model.
    """
    if embedding_model_ref.value is None:
        embedding_model_ref.value = TextEmbedding()

    return embedding_model_ref.value


async def generate_embeddings(inputs: str | list[str]) -> list[list[float]]:
    """Generate embeddings for the given text using the specified model.

    Args:
        inputs: The text for which embeddings are to be created or a list thereof.

    Returns:
        The embeddings for the given text or None if an error occurred.
    """
    if not isinstance(inputs, list):
        inputs = [inputs]

    return [[float(x) for x in embedding] for embedding in get_embedding_model().embed(inputs)]
