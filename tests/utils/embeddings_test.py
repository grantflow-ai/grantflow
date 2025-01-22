from src.constants import EMBEDDING_DIMENSIONS
from src.utils.embeddings import generate_embeddings


async def test_generate_embeddings() -> None:
    inputs = [
        "The quick brown fox jumps over the lazy dog.",
        "The quick brown fox jumps over the lazy dog.",
        "The quick brown fox jumps over the lazy dog.",
    ]
    embeddings = await generate_embeddings(inputs)

    assert isinstance(embeddings, list)
    assert all(isinstance(value, list) for value in embeddings)
    assert all(len(embedding) == EMBEDDING_DIMENSIONS for embedding in embeddings)
