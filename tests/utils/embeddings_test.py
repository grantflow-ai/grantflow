from pytest_mock import MockerFixture

from src.constants import EMBEDDING_DIMENSIONS
from src.utils.embeddings import embedding_model_ref, generate_embeddings


async def test_generate_embeddings(mocker: MockerFixture) -> None:
    mock_embedding_model = mocker.Mock()
    mock_embedding_model.encode.return_value = [
        [0.1] * EMBEDDING_DIMENSIONS,
        [0.2] * EMBEDDING_DIMENSIONS,
        [0.3] * EMBEDDING_DIMENSIONS,
    ]
    embedding_model_ref.value = mock_embedding_model

    inputs = [
        "The quick brown fox jumps over the lazy dog.",
        "The quick brown fox jumps over the lazy dog.",
        "The quick brown fox jumps over the lazy dog.",
    ]
    embeddings = await generate_embeddings(inputs)

    assert isinstance(embeddings, list)
    assert all(isinstance(value, list) for value in embeddings)
    assert all(len(embedding) == EMBEDDING_DIMENSIONS for embedding in embeddings)
    mock_embedding_model.encode.assert_called_once_with(inputs)

    embedding_model_ref.value = None
