from unittest.mock import Mock

from src.indexer.dto import VectorDTO
from src.indexer.indexing import create_vector_dto
from tests.indexer.factories import ChunkFactory


async def test_create_vector_dto(mock_text_embedding_model: Mock) -> None:
    chunk = ChunkFactory.build()
    file_id = "test_file_id"

    vector_dto = await create_vector_dto(chunk=chunk, file_id=file_id)

    assert vector_dto == VectorDTO(
        content=chunk["content"],
        element_type=chunk["element_type"],
        embedding=[1.0, 2.0, 3.0],
        file_id="test_file_id",
        index=chunk["index"],
        parent_id=chunk["parent_id"],
        position=chunk["position"],
        role=chunk["role"],
        table_context=chunk["table_context"],
    )
