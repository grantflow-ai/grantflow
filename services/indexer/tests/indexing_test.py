from services.indexer.src.indexing import create_vector_dto

from tests.indexer.factories import ChunkFactory


async def test_create_vector_dto() -> None:
    chunk = ChunkFactory.build()
    file_id = "test_file_id"

    vector_dto = await create_vector_dto(chunk=chunk, rag_file_id=file_id)

    assert isinstance(vector_dto, dict)
    assert vector_dto["rag_file_id"] == "test_file_id"
    assert vector_dto["chunk"] == chunk
    assert len(vector_dto["embedding"]) == 384
    assert all(isinstance(x, float) for x in vector_dto["embedding"])
