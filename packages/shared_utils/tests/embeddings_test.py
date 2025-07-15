from typing import TYPE_CHECKING

import pytest
from pytest_mock import MockerFixture
from testing.factories import ChunkFactory

from packages.db.src.constants import EMBEDDING_DIMENSIONS
from packages.shared_utils.src.embeddings import (
    CHUNKS_BATCH_SIZE,
    EMBEDDING_MODEL_NAME,
    create_vector_dto,
    embedding_model_ref,
    generate_embeddings,
    get_embedding_model,
    index_chunks,
)
from packages.shared_utils.src.exceptions import ExternalOperationError

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk


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


async def test_generate_embeddings_single_string(mocker: MockerFixture) -> None:
    mock_embedding_model = mocker.Mock()
    mock_embedding_model.encode.return_value = [[0.1] * EMBEDDING_DIMENSIONS]
    embedding_model_ref.value = mock_embedding_model

    input_string = "Single input string"
    embeddings = await generate_embeddings(input_string)

    assert isinstance(embeddings, list)
    assert len(embeddings) == 1
    assert len(embeddings[0]) == EMBEDDING_DIMENSIONS
    mock_embedding_model.encode.assert_called_once_with([input_string])

    embedding_model_ref.value = None


def test_get_embedding_model(mocker: MockerFixture) -> None:
    embedding_model_ref.value = None

    mocker.patch("packages.shared_utils.src.embeddings.getenv", return_value=None)
    mock_sentence_transformer = mocker.patch(
        "packages.shared_utils.src.embeddings.SentenceTransformer"
    )
    mock_model_instance = mocker.Mock()
    mock_sentence_transformer.return_value = mock_model_instance

    model = get_embedding_model()

    assert model == mock_model_instance
    assert embedding_model_ref.value == mock_model_instance
    mock_sentence_transformer.assert_called_once_with(
        EMBEDDING_MODEL_NAME, device="cpu", trust_remote_code=False
    )

    model2 = get_embedding_model()
    assert model2 == mock_model_instance
    assert mock_sentence_transformer.call_count == 1

    embedding_model_ref.value = None


def test_get_embedding_model_with_model_dir(mocker: MockerFixture) -> None:
    embedding_model_ref.value = None

    mocker.patch("packages.shared_utils.src.embeddings.getenv", return_value="/app/hf")
    mock_path = mocker.patch("packages.shared_utils.src.embeddings.Path")
    mock_path.return_value.exists.return_value = True

    mock_sentence_transformer = mocker.patch(
        "packages.shared_utils.src.embeddings.SentenceTransformer"
    )
    mock_model_instance = mocker.Mock()
    mock_sentence_transformer.return_value = mock_model_instance

    model = get_embedding_model()

    assert model == mock_model_instance
    assert embedding_model_ref.value == mock_model_instance
    mock_sentence_transformer.assert_called_once_with(
        "/app/hf", device="cpu", trust_remote_code=False
    )

    embedding_model_ref.value = None


async def test_create_vector_dto(mocker: MockerFixture) -> None:
    chunk = ChunkFactory.build()
    source_id = "test_source_id"

    mock_generate_embeddings = mocker.patch(
        "packages.shared_utils.src.embeddings.generate_embeddings",
        return_value=[[0.1] * EMBEDDING_DIMENSIONS],
    )

    vector_dto = await create_vector_dto(chunk=chunk, rag_source_id=source_id)

    assert isinstance(vector_dto, dict)
    assert vector_dto["rag_source_id"] == "test_source_id"
    assert vector_dto["chunk"] == chunk
    assert len(vector_dto["embedding"]) == EMBEDDING_DIMENSIONS
    assert all(isinstance(x, float) for x in vector_dto["embedding"])
    mock_generate_embeddings.assert_called_once_with(
        [chunk["content"]], model_name="sentence-transformers/all-MiniLM-L12-v2"
    )


async def test_create_vector_dto_multiple_embeddings_error(
    mocker: MockerFixture,
) -> None:
    mock_generate_embeddings = mocker.patch(
        "packages.shared_utils.src.embeddings.generate_embeddings",
        return_value=[[0.1] * EMBEDDING_DIMENSIONS, [0.2] * EMBEDDING_DIMENSIONS],
    )

    chunk = ChunkFactory.build()
    source_id = "test_source_id"

    with pytest.raises(ExternalOperationError, match="Expected a single embedding"):
        await create_vector_dto(chunk=chunk, rag_source_id=source_id)

    mock_generate_embeddings.assert_called_once_with(
        [chunk["content"]], model_name="sentence-transformers/all-MiniLM-L12-v2"
    )


async def test_index_chunks_small_batch(mocker: MockerFixture) -> None:
    chunks = [ChunkFactory.build() for _ in range(5)]
    source_id = "test_source_id"

    mock_create_vector_dto = mocker.patch(
        "packages.shared_utils.src.embeddings.create_vector_dto",
        side_effect=[
            {
                "chunk": chunk,
                "embedding": [0.1] * EMBEDDING_DIMENSIONS,
                "rag_source_id": source_id,
            }
            for chunk in chunks
        ],
    )

    vectors = await index_chunks(chunks=chunks, source_id=source_id)

    assert len(vectors) == 5
    assert all(v["rag_source_id"] == source_id for v in vectors)
    assert mock_create_vector_dto.call_count == 5

    for _i, chunk in enumerate(chunks):
        mock_create_vector_dto.assert_any_call(
            chunk=chunk,
            rag_source_id=source_id,
            model_name="sentence-transformers/all-MiniLM-L12-v2",
        )


async def test_index_chunks_large_batch(mocker: MockerFixture) -> None:
    num_chunks = CHUNKS_BATCH_SIZE * 2 + 5
    chunks = [ChunkFactory.build() for _ in range(num_chunks)]
    source_id = "test_source_id"

    mock_create_vector_dto = mocker.patch(
        "packages.shared_utils.src.embeddings.create_vector_dto",
        side_effect=[
            {
                "chunk": chunk,
                "embedding": [0.1] * EMBEDDING_DIMENSIONS,
                "rag_source_id": source_id,
            }
            for chunk in chunks
        ],
    )

    vectors = await index_chunks(chunks=chunks, source_id=source_id)

    assert len(vectors) == num_chunks
    assert all(v["rag_source_id"] == source_id for v in vectors)
    assert mock_create_vector_dto.call_count == num_chunks

    for chunk in chunks:
        mock_create_vector_dto.assert_any_call(
            chunk=chunk,
            rag_source_id=source_id,
            model_name="sentence-transformers/all-MiniLM-L12-v2",
        )


async def test_index_chunks_empty_list() -> None:
    chunks: list[Chunk] = []
    source_id = "test_source_id"

    vectors = await index_chunks(chunks=chunks, source_id=source_id)

    assert len(vectors) == 0


async def test_index_chunks_filters_none_results(mocker: MockerFixture) -> None:
    chunks = [ChunkFactory.build() for _ in range(3)]
    source_id = "test_source_id"

    mocker.patch(
        "packages.shared_utils.src.embeddings.create_vector_dto",
        side_effect=[
            {
                "chunk": chunks[0],
                "embedding": [0.1] * EMBEDDING_DIMENSIONS,
                "rag_source_id": source_id,
            },
            None,
            {
                "chunk": chunks[2],
                "embedding": [0.3] * EMBEDDING_DIMENSIONS,
                "rag_source_id": source_id,
            },
        ],
    )

    vectors = await index_chunks(chunks=chunks, source_id=source_id)

    assert len(vectors) == 2
    assert vectors[0]["chunk"] == chunks[0]
    assert vectors[1]["chunk"] == chunks[2]
