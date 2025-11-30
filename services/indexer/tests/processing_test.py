from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from packages.db.src.json_objects import Chunk
from packages.shared_utils.src.dto import VectorDTO
from pytest_mock import MockerFixture

from services.indexer.src.processing import process_source


@pytest.fixture
def mock_chunk() -> Chunk:
    return Chunk(
        content="Test chunk content",
        page_number=1,
    )


@pytest.fixture
def mock_vector_dto(mock_chunk: Chunk) -> VectorDTO:
    return VectorDTO(
        chunk=mock_chunk,
        embedding=[0.1, 0.2, 0.3],
        rag_source_id="test-source-id",
    )


@pytest.fixture
def mock_extraction_result() -> MagicMock:
    result = MagicMock()
    result.content = "Test file content"
    result.mime_type = "text/plain"
    result.chunks = ["Test chunk content"]
    result.metadata = {"title": "Test"}
    result.entities = [MagicMock(type="PERSON", text="John Doe")]
    result.keywords = [("machine learning", 0.85)]
    return result


async def test_process_source_text_file(
    mocker: MockerFixture,
    mock_chunk: Chunk,
    mock_vector_dto: VectorDTO,
    mock_extraction_result: MagicMock,
) -> None:
    mock_extract = mocker.patch(
        "services.indexer.src.processing.extract_bytes",
        new_callable=AsyncMock,
        return_value=mock_extraction_result,
    )
    mock_index_chunks = mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[mock_vector_dto],
    )
    mocker.patch(
        "services.indexer.src.processing.analyze_scientific_content",
        new_callable=AsyncMock,
        return_value=None,
    )

    vectors, text_content, metadata, _scientific_analysis = await process_source(
        content=b"Test file content",
        source_id="test-source-id",
        filename="test.txt",
        mime_type="text/plain",
    )

    metadata_dict: Any = metadata

    assert len(vectors) == 1
    assert vectors[0] == mock_vector_dto
    assert text_content == "Test file content"
    assert "entities" in metadata_dict
    assert "keywords" in metadata_dict
    assert len(metadata_dict["entities"]) == 1
    assert metadata_dict["entities"][0]["type"] == "PERSON"
    assert metadata_dict["entities"][0]["text"] == "John Doe"
    assert len(metadata_dict["keywords"]) == 1
    assert metadata_dict["keywords"][0]["keyword"] == "machine learning"
    assert metadata_dict["keywords"][0]["score"] == 0.85

    mock_extract.assert_called_once()
    expected_chunks = [{"content": "Test chunk content"}]
    mock_index_chunks.assert_called_once_with(
        chunks=expected_chunks,
        source_id="test-source-id",
    )


async def test_process_source_pdf_file(
    mocker: MockerFixture,
    mock_chunk: Chunk,
    mock_vector_dto: VectorDTO,
) -> None:
    result = MagicMock()
    result.content = "PDF content extracted"
    result.mime_type = "application/pdf"
    result.chunks = ["PDF chunk content"]
    result.metadata = {}
    result.entities = []
    result.keywords = []

    mock_extract = mocker.patch(
        "services.indexer.src.processing.extract_bytes",
        new_callable=AsyncMock,
        return_value=result,
    )
    mock_index_chunks = mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[mock_vector_dto],
    )
    mocker.patch(
        "services.indexer.src.processing.analyze_scientific_content",
        new_callable=AsyncMock,
        return_value=None,
    )

    vectors, text_content, _metadata, _scientific_analysis = await process_source(
        content=b"PDF binary content",
        source_id="pdf-source-id",
        filename="document.pdf",
        mime_type="application/pdf",
    )

    assert len(vectors) == 1
    assert vectors[0] == mock_vector_dto
    assert text_content == "PDF content extracted"

    mock_extract.assert_called_once()
    expected_chunks = [{"content": "PDF chunk content"}]
    mock_index_chunks.assert_called_once_with(
        chunks=expected_chunks,
        source_id="pdf-source-id",
    )


async def test_process_source_multiple_chunks(
    mocker: MockerFixture,
) -> None:
    chunks_content = ["Chunk 1", "Chunk 2", "Chunk 3"]

    vectors = [
        VectorDTO(
            chunk=Chunk(content=content),
            embedding=[0.1, 0.2, 0.3],
            rag_source_id="multi-source-id",
        )
        for content in chunks_content
    ]

    result = MagicMock()
    result.content = "Long document content"
    result.mime_type = "text/plain"
    result.chunks = chunks_content
    result.metadata = {}
    result.entities = []
    result.keywords = []

    mocker.patch(
        "services.indexer.src.processing.extract_bytes",
        new_callable=AsyncMock,
        return_value=result,
    )
    mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=vectors,
    )
    mocker.patch(
        "services.indexer.src.processing.analyze_scientific_content",
        new_callable=AsyncMock,
        return_value=None,
    )

    result_vectors, text_content, _metadata, _scientific_analysis = await process_source(
        content=b"Long document content",
        source_id="multi-source-id",
        filename="long-document.txt",
        mime_type="text/plain",
    )

    assert len(result_vectors) == 3
    assert text_content == "Long document content"

    for i, vector in enumerate(result_vectors):
        assert vector["chunk"]["content"] == f"Chunk {i + 1}"
        assert vector["rag_source_id"] == "multi-source-id"


async def test_process_source_json_content(
    mocker: MockerFixture,
    mock_chunk: Chunk,
    mock_vector_dto: VectorDTO,
) -> None:
    json_content = {"key": "value", "nested": {"data": "test"}}

    result = MagicMock()
    result.content = json_content
    result.mime_type = "application/json"
    result.chunks = ["JSON chunk"]
    result.metadata = {}
    result.entities = []
    result.keywords = []

    mocker.patch(
        "services.indexer.src.processing.extract_bytes",
        new_callable=AsyncMock,
        return_value=result,
    )
    mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[mock_vector_dto],
    )
    mock_serialize = mocker.patch(
        "services.indexer.src.processing.serialize",
        return_value=b'{"key":"value","nested":{"data":"test"}}',
    )
    mocker.patch(
        "services.indexer.src.processing.analyze_scientific_content",
        new_callable=AsyncMock,
        return_value=None,
    )

    vectors, text_content, _metadata, _scientific_analysis = await process_source(
        content=b'{"key":"value","nested":{"data":"test"}}',
        source_id="json-source-id",
        filename="data.json",
        mime_type="application/json",
    )

    assert len(vectors) == 1
    assert text_content == '{"key":"value","nested":{"data":"test"}}'

    mock_serialize.assert_called_once_with(json_content)


async def test_process_source_empty_content(
    mocker: MockerFixture,
) -> None:
    result = MagicMock()
    result.content = ""
    result.mime_type = "text/plain"
    result.chunks = None
    result.metadata = {}
    result.entities = []
    result.keywords = []

    mocker.patch(
        "services.indexer.src.processing.extract_bytes",
        new_callable=AsyncMock,
        return_value=result,
    )
    mock_index_chunks = mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[],
    )
    mocker.patch(
        "services.indexer.src.processing.analyze_scientific_content",
        new_callable=AsyncMock,
        return_value=None,
    )

    vectors, text_content, _metadata, _scientific_analysis = await process_source(
        content=b"",
        source_id="empty-source-id",
        filename="empty.txt",
        mime_type="text/plain",
    )

    assert len(vectors) == 0
    assert text_content == ""

    expected_chunks = [{"content": ""}]
    mock_index_chunks.assert_called_once_with(
        chunks=expected_chunks,
        source_id="empty-source-id",
    )


async def test_process_source_with_extraction_error(
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.indexer.src.processing.extract_bytes",
        new_callable=AsyncMock,
        side_effect=Exception("Extraction failed"),
    )

    with pytest.raises(Exception, match="Extraction failed"):
        await process_source(
            content=b"Invalid content",
            source_id="error-source-id",
            filename="error.txt",
            mime_type="text/plain",
        )
