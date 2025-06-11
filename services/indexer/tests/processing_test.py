from unittest.mock import AsyncMock

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


async def test_process_source_text_file(
    mocker: MockerFixture,
    mock_chunk: Chunk,
    mock_vector_dto: VectorDTO,
) -> None:
    mock_extract = mocker.patch(
        "services.indexer.src.processing.extract_file_content",
        new_callable=AsyncMock,
        return_value=("Test file content", "text/plain"),
    )
    mock_chunk_text = mocker.patch(
        "services.indexer.src.processing.chunk_text",
        return_value=[mock_chunk],
    )
    mock_index_chunks = mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[mock_vector_dto],
    )

    vectors, text_content = await process_source(
        content=b"Test file content",
        source_id="test-source-id",
        filename="test.txt",
        mime_type="text/plain",
    )

    assert len(vectors) == 1
    assert vectors[0] == mock_vector_dto
    assert text_content == "Test file content"

    mock_extract.assert_called_once_with(
        content=b"Test file content",
        mime_type="text/plain",
    )
    mock_chunk_text.assert_called_once_with(
        text="Test file content",
        mime_type="text/plain",
    )
    mock_index_chunks.assert_called_once_with(
        chunks=[mock_chunk],
        source_id="test-source-id",
    )


async def test_process_source_pdf_file(
    mocker: MockerFixture,
    mock_chunk: Chunk,
    mock_vector_dto: VectorDTO,
) -> None:
    mock_extract = mocker.patch(
        "services.indexer.src.processing.extract_file_content",
        new_callable=AsyncMock,
        return_value=("PDF content extracted", "application/pdf"),
    )
    mock_chunk_text = mocker.patch(
        "services.indexer.src.processing.chunk_text",
        return_value=[mock_chunk],
    )
    mock_index_chunks = mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[mock_vector_dto],
    )

    vectors, text_content = await process_source(
        content=b"PDF binary content",
        source_id="pdf-source-id",
        filename="document.pdf",
        mime_type="application/pdf",
    )

    assert len(vectors) == 1
    assert vectors[0] == mock_vector_dto
    assert text_content == "PDF content extracted"

    mock_extract.assert_called_once_with(
        content=b"PDF binary content",
        mime_type="application/pdf",
    )
    mock_chunk_text.assert_called_once_with(
        text="PDF content extracted",
        mime_type="application/pdf",
    )
    mock_index_chunks.assert_called_once_with(
        chunks=[mock_chunk],
        source_id="pdf-source-id",
    )


async def test_process_source_multiple_chunks(
    mocker: MockerFixture,
) -> None:
    chunks: list[Chunk] = [
        Chunk(content="Chunk 1", page_number=1),
        Chunk(content="Chunk 2", page_number=2),
        Chunk(content="Chunk 3", page_number=3),
    ]

    vectors = [
        VectorDTO(
            chunk=chunk,
            embedding=[0.1, 0.2, 0.3],
            rag_source_id="multi-source-id",
        )
        for chunk in chunks
    ]

    mocker.patch(
        "services.indexer.src.processing.extract_file_content",
        new_callable=AsyncMock,
        return_value=("Long document content", "text/plain"),
    )
    mocker.patch(
        "services.indexer.src.processing.chunk_text",
        return_value=chunks,
    )
    mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=vectors,
    )

    result_vectors, text_content = await process_source(
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

    mocker.patch(
        "services.indexer.src.processing.extract_file_content",
        new_callable=AsyncMock,
        return_value=(json_content, "application/json"),
    )
    mocker.patch(
        "services.indexer.src.processing.chunk_text",
        return_value=[mock_chunk],
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

    vectors, text_content = await process_source(
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
    mocker.patch(
        "services.indexer.src.processing.extract_file_content",
        new_callable=AsyncMock,
        return_value=("", "text/plain"),
    )
    mocker.patch(
        "services.indexer.src.processing.chunk_text",
        return_value=[],
    )
    mocker.patch(
        "services.indexer.src.processing.index_chunks",
        new_callable=AsyncMock,
        return_value=[],
    )

    vectors, text_content = await process_source(
        content=b"",
        source_id="empty-source-id",
        filename="empty.txt",
        mime_type="text/plain",
    )

    assert len(vectors) == 0
    assert text_content == ""


async def test_process_source_with_extraction_error(
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.indexer.src.processing.extract_file_content",
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
