from unittest.mock import Mock

from src.indexer.dto import Chunk, VectorDTO
from src.indexer.indexing import create_vector_dto


async def test_create_vector_dto(mock_text_embedding_model: Mock) -> None:
    chunk: Chunk = {
        "content": "test content",
        "index": 0,
        "page_number": 1,
        "element_type": "paragraph",
    }
    file_id = "test_file_id"

    vector_dto = await create_vector_dto(chunk=chunk, file_id=file_id)

    assert vector_dto == VectorDTO(
        chunk_index=0,
        content="test content",
        element_type="paragraph",
        embedding=[1.0, 2.0, 3.0],
        file_id="test_file_id",
        page_number=1,
    )
