from dataclasses import dataclass
from mimetypes import guess_type
from typing import Any, NotRequired

from pathvalidate import sanitize_filename
from sanic.request import File
from typing_extensions import TypedDict

from src.constants import SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP


class Span(TypedDict, total=False):
    """A span of text in a document."""

    offset: NotRequired[int]
    length: NotRequired[int]


class BoundingRegion(TypedDict, total=False):
    """A bounding region in a document."""

    pageNumber: NotRequired[int]
    polygon: NotRequired[list[float]]


class Word(TypedDict, total=False):
    """A word in a document."""

    content: str
    confidence: NotRequired[float]
    span: NotRequired[Span]
    polygon: NotRequired[list[float]]


class SelectionMark(TypedDict, total=False):
    """A selection mark in a document."""

    state: str
    confidence: NotRequired[float]
    polygon: NotRequired[list[float]]
    span: NotRequired[Span]


class Line(TypedDict, total=False):
    """A line in a document."""

    content: str
    polygon: NotRequired[list[float]]
    spans: NotRequired[list[Span]]


class Page(TypedDict, total=False):
    """A page in a document."""

    pageNumber: NotRequired[int]
    words: NotRequired[list[Word]]
    spans: NotRequired[list[Span]]
    angle: NotRequired[float]
    width: NotRequired[float]
    height: NotRequired[float]
    unit: NotRequired[str]
    selectionMarks: NotRequired[list[SelectionMark]]
    lines: NotRequired[list[Line]]


class TableCell(TypedDict, total=False):
    """A table cell in a document."""

    rowIndex: NotRequired[int]
    columnIndex: NotRequired[int]
    content: str
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]
    columnSpan: NotRequired[int]
    rowSpan: NotRequired[int]
    kind: NotRequired[str]


class Table(TypedDict, total=False):
    """A table in a document."""

    rowCount: NotRequired[int]
    columnCount: NotRequired[int]
    cells: NotRequired[list[TableCell]]
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]


class Paragraph(TypedDict, total=False):
    """A paragraph in a document."""

    spans: NotRequired[list[Span]]
    boundingRegions: NotRequired[list[BoundingRegion]]
    content: str
    role: NotRequired[str]


class Style(TypedDict, total=False):
    """A style in a document."""

    confidence: NotRequired[float]
    spans: NotRequired[list[Span]]
    isHandwritten: NotRequired[bool]


class Section(TypedDict, total=False):
    """A section in a document."""

    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]


class FigureCaption(TypedDict, total=False):
    """A figure caption in a document."""

    content: str
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]


class Figure(TypedDict, total=False):
    """A figure in a document."""

    id: str
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]
    caption: NotRequired[FigureCaption]


class OCROutput(TypedDict, total=False):
    """The raw output from the Azure Document Intelligence prebuilt-layout model api."""

    apiVersion: str
    modelId: str
    stringIndexType: str
    content: str
    pages: NotRequired[list[Page]]
    tables: NotRequired[list[Table]]
    paragraphs: NotRequired[list[Paragraph]]
    styles: NotRequired[list[Style]]
    contentFormat: NotRequired[str]
    sections: NotRequired[list[Section]]
    figures: NotRequired[list[Figure]]
    additionalItems: NotRequired[list[str | dict[str, Any]]]


@dataclass
class FileDTO:
    """DTO for a file."""

    content: bytes
    """The content of the file."""
    filename: str
    """The name of the file."""
    mime_type: str

    @classmethod
    def from_file(cls, file: File | list[File], filename: str) -> "FileDTO":
        """Create a FileDTO from a Sanic File object.

        Args:
            file: The Sanic File object.
            filename: The name of the file.

        Raises:
            ValueError: If the mime type of the file cannot be determined.

        Returns:
            The FileDTO object.
        """
        file = file[0] if isinstance(file, list) else file
        ext = filename.split(".")[-1]

        if mime_type := (guess_type(filename)[0] or SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP.get(ext)):
            filename = sanitize_filename(filename)
            return cls(content=file.body, filename=filename, mime_type=mime_type)

        raise ValueError("Could not determine the mime type of the file")


class Position(TypedDict):
    """Position information for a chunk within the document."""

    page_number: int | None
    """Page number where the chunk appears"""
    bounding_regions: list[BoundingRegion] | None
    """List of bounding regions defining the chunk's spatial location"""
    spans: list[Span] | None
    """List of spans defining the chunk's text position"""


class TableContext(TypedDict):
    """Context information for table cells."""

    row_index: int | None
    """Zero-based row index in the table"""
    column_index: int | None
    """Zero-based column index in the table"""
    row_span: int | None
    """Number of rows this cell spans"""
    column_span: int | None
    """Number of columns this cell spans"""
    table_dimensions: str | None
    """Table dimensions in format 'rowsxcolumns'"""


class Chunk(TypedDict):
    """DTO for a chunk of text."""

    content: str
    """The actual text content of the chunk"""
    index: int
    """Sequential index in document order"""
    position: Position | None
    """Position information including page number and bounds"""
    element_type: str | None
    """Type of document element (page, table_cell, paragraph, figure)"""
    parent_id: str | None
    """ID of the parent element (e.g., table_1, para_2)"""
    table_context: TableContext | None
    """Additional context for table cells"""
    role: str | None
    """Role or type of the content (e.g., paragraph role, cell kind)"""


class VectorDTO(Chunk):
    """DTO for embeddings and metadata."""

    embedding: list[float]
    """The embeddings of the content."""
    file_id: str
    """The ID of the file from which the content is derived."""
