"""Tests for document content chunking functionality."""

import pytest
from polyfactory.factories import TypedDictFactory
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.indexer.chunking import (
    chunk_ocr_output,
    chunk_text,
    extract_page_content,
    get_splitter,
    process_fallback_chunks,
    process_page_chunks,
    process_paragraph_chunks,
    process_table_cell,
    process_table_chunks,
)
from src.utils.extraction import BoundingRegion, OCROutput, Page, Paragraph, ParagraphRole, Span, Table, TableCell


class MockSplitter:
    """Mock splitter that returns predictable chunks."""

    def __init__(self, chunk_size: int = 100, overlap: int = 0) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunks(self, text: str) -> list[str]:
        return [text[i : i + self.chunk_size] for i in range(0, len(text), self.chunk_size - self.overlap)]


class SpanFactory(TypedDictFactory[Span]):
    __model__ = Span

    offset = 0
    length = 10


class BoundingRegionFactory(TypedDictFactory[BoundingRegion]):
    __model__ = BoundingRegion

    pageNumber = 1
    polygon = [0.0, 0.0, 100.0, 0.0, 100.0, 100.0, 0.0, 100.0]


class PageFactory(TypedDictFactory[Page]):
    __model__ = Page

    pageNumber = 1
    lines = [{"content": "Line 1"}, {"content": "Line 2"}]
    words = [
        {"content": "Word1", "span": SpanFactory.build()},
        {"content": "Word2", "span": SpanFactory.build(offset=20)},
    ]
    languages = [{"locale": "en", "confidence": 0.9}]


class TableCellFactory(TypedDictFactory[TableCell]):
    __model__ = TableCell

    rowIndex = 0
    columnIndex = 0
    content = "Cell content"
    boundingRegions = [BoundingRegionFactory.build()]
    spans = [SpanFactory.build()]
    columnSpan = 1
    rowSpan = 1
    kind = "content"


class TableFactory(TypedDictFactory[Table]):
    __model__ = Table

    rowCount = 2
    columnCount = 2
    cells = [
        TableCellFactory.build(rowIndex=0, columnIndex=0),
        TableCellFactory.build(rowIndex=0, columnIndex=1),
        TableCellFactory.build(rowIndex=1, columnIndex=0),
        TableCellFactory.build(rowIndex=1, columnIndex=1),
    ]
    boundingRegions = [BoundingRegionFactory.build()]


class ParagraphFactory(TypedDictFactory[Paragraph]):
    __model__ = Paragraph

    content = "Sample paragraph content"
    role = ParagraphRole.SECTION_HEADING
    boundingRegions = [BoundingRegionFactory.build()]
    spans = [SpanFactory.build()]


class OCROutputFactory(TypedDictFactory[OCROutput]):
    __model__ = OCROutput

    apiVersion = "1.0"
    modelId = "test-model"
    stringIndexType = "utf16CodeUnit"
    content = "Full document content"
    pages = [PageFactory.build()]
    tables = [TableFactory.build()]
    paragraphs = [ParagraphFactory.build()]


@pytest.fixture
def mock_splitter() -> MockSplitter:
    return MockSplitter()


@pytest.mark.parametrize(
    "mime_type,expected_type",
    [
        ("text/markdown", MarkdownSplitter),
        ("text/plain", TextSplitter),
        ("application/pdf", TextSplitter),
    ],
)
def test_get_splitter_types(mime_type: str, expected_type: type) -> None:
    splitter = get_splitter(mime_type)
    assert isinstance(splitter, expected_type)


def test_chunk_plain_text() -> None:
    text = "Simple test content"
    chunks = chunk_text(text=text, mime_type="text/plain")
    assert len(chunks) > 0
    assert all(isinstance(chunk, dict) for chunk in chunks)
    assert all("content" in chunk for chunk in chunks)
    assert all("content_hash" in chunk for chunk in chunks)
    assert all("index" in chunk for chunk in chunks)
    assert all("element_type" in chunk for chunk in chunks)


def test_chunk_ocr_output() -> None:
    ocr_output = OCROutputFactory.build()
    chunks = chunk_text(text=ocr_output, mime_type="application/pdf")
    assert len(chunks) > 0
    assert all(isinstance(chunk, dict) for chunk in chunks)
    valid_types = {"page", "table_cell", "paragraph", "formula", "raw"}
    assert all(chunk.get("element_type") in valid_types for chunk in chunks)


def test_extract_from_lines() -> None:
    page = PageFactory.build(words=None)
    content = extract_page_content(page)
    assert content == "Line 1\nLine 2"


def test_extract_from_words() -> None:
    page = PageFactory.build(lines=None)
    content = extract_page_content(page)
    assert "Word1" in content
    assert "Word2" in content


def test_empty_page() -> None:
    page = PageFactory.build(lines=None, words=None)
    content = extract_page_content(page)
    assert content == ""


def test_page_chunking(mock_splitter: MockSplitter) -> None:
    page = PageFactory.build()
    chunks = list(process_page_chunks(page, mock_splitter))  # type: ignore[arg-type]
    assert len(chunks) > 0
    assert all(chunk["element_type"] in {"page", "formula"} for chunk in chunks)
    assert any(chunk["element_type"] == "page" for chunk in chunks)  # At least one page chunk
    assert all(chunk.get("page_number") == page["pageNumber"] for chunk in chunks)
    assert all(isinstance(chunk.get("languages"), list) for chunk in chunks if chunk["element_type"] == "page")


def test_cell_chunking(mock_splitter: MockSplitter) -> None:
    cell = TableCellFactory.build()
    table = TableFactory.build()
    chunks = list(process_table_cell(cell, 0, table, 1, mock_splitter))  # type: ignore[arg-type]

    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk["element_type"] == "table_cell"
        assert chunk["parent"] == "table_0"
        assert isinstance(chunk["table_context"], dict)
        assert chunk["table_context"]["row_index"] == cell["rowIndex"]
        assert chunk["table_context"]["column_index"] == cell["columnIndex"]


def test_table_chunking(mock_splitter: MockSplitter) -> None:
    table = TableFactory.build()
    chunks = list(process_table_chunks(table, 0, mock_splitter))  # type: ignore[arg-type]

    assert len(chunks) > 0
    assert all(chunk["element_type"] == "table_cell" for chunk in chunks)
    assert all(chunk["parent"] == "table_0" for chunk in chunks)
    assert len(chunks) >= len(table["cells"])


def test_paragraph_chunking(mock_splitter: MockSplitter) -> None:
    para = ParagraphFactory.build()
    chunks = list(process_paragraph_chunks(para, 0, mock_splitter))  # type: ignore[arg-type]

    assert len(chunks) > 0
    assert all(chunk["element_type"] == "paragraph" for chunk in chunks)
    assert all(chunk["parent"] == "para_0" for chunk in chunks)
    assert all(chunk.get("role") == para["role"] for chunk in chunks)


def test_fallback_chunking(mock_splitter: MockSplitter) -> None:
    content = "Fallback content for testing"
    chunks = list(process_fallback_chunks(content, mock_splitter))  # type: ignore[arg-type]

    assert len(chunks) > 0
    assert all(chunk["element_type"] == "raw" for chunk in chunks)
    assert all("page_number" not in chunk for chunk in chunks)


def test_full_document_processing(mock_splitter: MockSplitter) -> None:
    ocr_output = OCROutputFactory.build()
    chunks = chunk_ocr_output(ocr_output, mock_splitter)  # type: ignore[arg-type]

    assert len(chunks) > 0
    element_types = {chunk["element_type"] for chunk in chunks}
    assert element_types.issuperset({"page", "table_cell", "paragraph"})

    indices = [chunk["index"] for chunk in chunks]
    assert indices == list(range(len(chunks)))


def test_empty_document_fallback(mock_splitter: MockSplitter) -> None:
    ocr_output = OCROutputFactory.build(pages=[], tables=[], paragraphs=[], content="Fallback content")
    chunks = chunk_ocr_output(ocr_output, mock_splitter)  # type: ignore[arg-type]

    assert len(chunks) > 0
    assert all(chunk["element_type"] == "raw" for chunk in chunks)


def test_completely_empty_document(mock_splitter: MockSplitter) -> None:
    ocr_output = OCROutputFactory.build(pages=[], tables=[], paragraphs=[], content="")
    chunks = chunk_ocr_output(ocr_output, mock_splitter)  # type: ignore[arg-type]
    assert len(chunks) == 0


@pytest.mark.parametrize("content_length", [100, 1000, 2000])
def test_chunk_size_limits(mock_splitter: MockSplitter, content_length: int) -> None:
    content = "a" * content_length
    chunks = list(process_fallback_chunks(content, mock_splitter))  # type: ignore[arg-type]

    assert len(chunks) > 0
    for chunk in chunks:
        assert len(chunk["content"]) <= mock_splitter.chunk_size


def test_paragraph_with_missing_bounds(mock_splitter: MockSplitter) -> None:
    paragraph = ParagraphFactory.build()
    paragraph["boundingRegions"] = [{}]
    chunks = list(process_paragraph_chunks(paragraph, 0, mock_splitter))  # type: ignore[arg-type]

    assert len(chunks) > 0
    assert all("page_number" not in chunk for chunk in chunks)


@pytest.mark.parametrize("mime_type", ["text/markdown", "text/plain"])
def test_original_chunking_text(mime_type: str) -> None:
    text = """
    # BREAKING: Scientists Discover Talking Plant in Amazon Rainforest

    In a startling development, researchers from the University of Brazil have reportedly discovered a species of plant
    capable of human speech. The plant, found deep in the Amazon rainforest, was observed engaging in conversations with
    local wildlife. Dr. Maria Silva, lead botanist on the expedition, claims the plant asked about the weather and expressed
    concerns about deforestation. Experts worldwide are scrambling to verify this unprecedented finding, which could
    revolutionize our understanding of plant intelligence.
    """

    chunks = chunk_text(text=text, mime_type=mime_type)
    assert len(chunks) == 1
