from unittest.mock import AsyncMock, Mock

import pytest
from pytest_mock import MockerFixture
from vertexai.language_models import TextEmbedding

from src.constants import EMBEDDING_DIMENSIONS
from src.utils.embeddings import TaskType, generate_embeddings


@pytest.fixture
def mock_get_embeddings_client(mocker: MockerFixture) -> Mock:
    return mocker.patch(
        "src.utils.embeddings.get_embeddings_client",
        return_value=Mock(
            get_embeddings_async=AsyncMock(return_value=[TextEmbedding(values=[0.1] * EMBEDDING_DIMENSIONS)])
        ),
    )


@pytest.mark.parametrize("input_text", ["test", ["test1", "test2"]])
@pytest.mark.parametrize("task", [TaskType.RetrievalDocument, TaskType.RetrievalQuery])
async def test_generate_embeddings(
    mock_get_embeddings_client: Mock, input_text: str | list[str], task: TaskType
) -> None:
    embeddings = await generate_embeddings(input_text, task)

    assert isinstance(embeddings, list)
    assert all(isinstance(value, float) for value in embeddings)
    assert len(embeddings) == EMBEDDING_DIMENSIONS
