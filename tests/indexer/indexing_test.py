from unittest.mock import Mock

from src.dto import VectorDTO
from src.indexer.indexing import create_vector_dto
from tests.indexer.factories import ChunkFactory


async def test_create_vector_dto(mock_text_embedding_model: Mock) -> None:
    chunk = ChunkFactory.build()
    file_id = "test_file_id"

    vector_dto = await create_vector_dto(chunk=chunk, rag_file_id=file_id)

    assert vector_dto == VectorDTO(embedding=[1.0, 2.0, 3.0], rag_file_id="test_file_id", chunk=chunk)
