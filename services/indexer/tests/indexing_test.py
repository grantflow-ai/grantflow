from services.indexer.src.indexing import create_vector_dto
from testing.factories import ChunkFactory


async def test_create_vector_dto() -> None:
    chunk = ChunkFactory.build()
    source_id = "test_source_id"

    vector_dto = await create_vector_dto(chunk=chunk, rag_source_id=source_id)

    assert isinstance(vector_dto, dict)
    assert vector_dto["rag_source_id"] == "test_source_id"
    assert vector_dto["chunk"] == chunk
    assert len(vector_dto["embedding"]) == 384
    assert all(isinstance(x, float) for x in vector_dto["embedding"])
