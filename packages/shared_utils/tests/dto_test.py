from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk
    from packages.shared_utils.src.dto import VectorDTO


async def test_vector_dto_structure() -> None:
    embedding = [0.1, 0.2, 0.3]
    rag_source_id = "test_source"
    chunk: Chunk = {
        "content": "test chunk",
        "page_number": 1,
    }

    vector: VectorDTO = {
        "embedding": embedding,
        "rag_source_id": rag_source_id,
        "chunk": chunk,
    }

    assert vector["embedding"] == embedding
    assert vector["rag_source_id"] == rag_source_id
    assert vector["chunk"] == chunk


async def test_vector_dto_complete_example() -> None:
    chunk: Chunk = {
        "content": "This is a test chunk content",
        "page_number": 1,
    }

    vector: VectorDTO = {
        "embedding": [0.1] * 384,
        "rag_source_id": "550e8400-e29b-41d4-a716-446655440000",
        "chunk": chunk,
    }

    assert isinstance(vector["embedding"], list)
    assert len(vector["embedding"]) == 384
    assert all(isinstance(x, float) for x in vector["embedding"])
    assert isinstance(vector["rag_source_id"], str)
    assert isinstance(vector["chunk"], dict)
    assert "content" in vector["chunk"]
    assert vector["chunk"]["page_number"] == 1
