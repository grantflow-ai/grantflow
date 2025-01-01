from dataclasses import dataclass
from enum import Enum
from mimetypes import guess_type
from typing import Any, NotRequired, TypedDict

from pathvalidate import sanitize_filename
from sanic.request import File

from src.constants import SUPPORTED_FILE_EXTENSIONS_TO_MIMETYPE_MAP
from src.dto import Chunk


class ParagraphRole(str, Enum):
    """Possible roles for a paragraph in a document."""

    FORMULA_BLOCK = "formulaBlock"  # A block containing a formula
    PAGE_FOOTER = "pageFooter"  # Footer section of the page
    PAGE_HEADER = "pageHeader"  # Header section of the page
    PAGE_NUMBER = "pageNumber"  # Page number
    SECTION_HEADING = "sectionHeading"  # Heading for a section
    TITLE = "title"  # Document or section title
    FOOTNOTE = "footnote"  # A footnote in the document


class SelectionMarkState(str, Enum):
    """States for a selection mark in a document."""

    SELECTED = "selected"  # The mark is selected (e.g., checked checkbox)
    UNSELECTED = "unselected"  # The mark is unselected (e.g., empty checkbox)


class Span(TypedDict, total=False):
    """A span of text in a document."""

    offset: NotRequired[int]
    """Character offset in the document's text"""
    length: NotRequired[int]
    """Length of the span in characters"""


class Formula(TypedDict, total=False):
    """A mathematical or chemical formula in a document."""

    kind: str
    """Type of formula (e.g., 'inline', 'display')"""
    value: str
    """The formula as text"""
    polygon: list[float]
    """Bounding polygon coordinates defining the spatial location"""
    span: Span
    """Span of the formula in the document text"""
    confidence: float
    """Confidence score for the formula extraction"""


class Language(TypedDict, total=False):
    """Detected language in a document."""

    spans: list[Span]
    """Text spans where the language is detected"""
    locale: str
    """Language code (e.g., 'en', 'fr')"""
    confidence: float
    """Confidence score for language detection"""


class BoundingRegion(TypedDict, total=False):
    """A bounding region in a document."""

    pageNumber: NotRequired[int]
    """Page number containing this region"""
    polygon: NotRequired[list[float]]
    """Bounding polygon coordinates defining the region's spatial location"""


class Word(TypedDict, total=False):
    """A word in a document."""

    content: str
    """The text of the word"""
    confidence: NotRequired[float]
    """Confidence score for word extraction"""
    span: NotRequired[Span]
    """Text span for the word"""
    polygon: NotRequired[list[float]]
    """Bounding polygon coordinates defining the word's spatial location"""


class SelectionMark(TypedDict, total=False):
    """A selection mark in a document."""

    state: SelectionMarkState
    """State of the selection mark (e.g., selected, unselected)"""
    confidence: NotRequired[float]
    """Confidence score for selection mark detection"""
    polygon: NotRequired[list[float]]
    """Bounding polygon coordinates defining the mark's spatial location"""
    span: NotRequired[Span]
    """Text span for the selection mark"""
    content: NotRequired[str]
    """Optional content for the mark (e.g., checkbox label)"""


class Line(TypedDict, total=False):
    """A line of text in a document."""

    content: str
    """The text content of the line"""
    polygon: NotRequired[list[float]]
    """Bounding polygon coordinates defining the line's spatial location"""
    spans: NotRequired[list[Span]]
    """List of spans defining the line's text position"""


class Page(TypedDict, total=False):
    """A page in a document."""

    pageNumber: NotRequired[int]
    """The page number"""
    words: NotRequired[list[Word]]
    """List of words on the page"""
    spans: NotRequired[list[Span]]
    """List of text spans on the page"""
    angle: NotRequired[float]
    """Rotation angle of the page"""
    width: NotRequired[float]
    """Width of the page in the specified unit"""
    height: NotRequired[float]
    """Height of the page in the specified unit"""
    unit: NotRequired[str]
    """Unit for page dimensions (e.g., 'inch', 'pixel')"""
    selectionMarks: NotRequired[list[SelectionMark]]
    """Selection marks on the page (e.g., checkboxes)"""
    lines: NotRequired[list[Line]]
    """Lines of text on the page"""
    languages: NotRequired[list[Language]]
    """List of detected languages on the page"""
    formulas: NotRequired[list[Formula]]
    """List of formulas detected on the page"""


class TableCell(TypedDict, total=False):
    """A table cell in a document."""

    rowIndex: NotRequired[int]
    """The row index of the cell"""
    columnIndex: NotRequired[int]
    """The column index of the cell"""
    content: str
    """The text content of the cell"""
    boundingRegions: NotRequired[list[BoundingRegion]]
    """Bounding regions defining the cell's spatial location"""
    spans: NotRequired[list[Span]]
    """List of spans defining the cell's text position"""
    elements: NotRequired[list[str]]
    """References to elements within the cell"""
    columnSpan: NotRequired[int]
    """Number of columns spanned by the cell"""
    rowSpan: NotRequired[int]
    """Number of rows spanned by the cell"""
    kind: NotRequired[str]
    """Type of cell (e.g., 'header', 'data')"""


class Table(TypedDict, total=False):
    """A table in a document."""

    caption: NotRequired["Paragraph"]
    """Caption for the table, if available"""
    rowCount: NotRequired[int]
    """Number of rows in the table"""
    columnCount: NotRequired[int]
    """Number of columns in the table"""
    cells: NotRequired[list[TableCell]]
    """List of cells in the table"""
    boundingRegions: NotRequired[list[BoundingRegion]]
    """Bounding regions defining the table's spatial location"""
    spans: NotRequired[list[Span]]
    """List of spans defining the table's text position"""


class Paragraph(TypedDict, total=False):
    """A paragraph in a document."""

    spans: NotRequired[list[Span]]
    """List of spans defining the paragraph's text position"""
    boundingRegions: NotRequired[list[BoundingRegion]]
    """Bounding regions defining the paragraph's spatial location"""
    content: str
    """The text content of the paragraph"""
    role: NotRequired[ParagraphRole | str]
    """Role of the paragraph (e.g., title, section heading)"""


class Style(TypedDict, total=False):
    """A style in a document."""

    confidence: NotRequired[float]
    """Confidence score for the style detection"""
    spans: NotRequired[list[Span]]
    """List of spans defining the style's text position"""
    isHandwritten: NotRequired[bool]
    """Whether the style indicates handwritten text"""


class Section(TypedDict, total=False):
    """A section in a document."""

    spans: NotRequired[list[Span]]
    """List of spans defining the section's text position"""
    elements: NotRequired[list[str]]
    """References to elements within the section"""


class FigureCaption(TypedDict, total=False):
    """A figure caption in a document."""

    content: str
    """The text content of the caption"""
    boundingRegions: NotRequired[list[BoundingRegion]]
    """Bounding regions defining the caption's spatial location"""
    spans: NotRequired[list[Span]]
    """List of spans defining the caption's text position"""
    elements: NotRequired[list[str]]
    """References to elements within the caption"""


class Figure(TypedDict, total=False):
    """A figure in a document."""

    id: str
    """Unique identifier for the figure"""
    boundingRegions: NotRequired[list[BoundingRegion]]
    """Bounding regions defining the figure's spatial location"""
    spans: NotRequired[list[Span]]
    """List of spans defining the figure's text position"""
    elements: NotRequired[list[str]]
    """References to elements within the figure"""
    caption: NotRequired[FigureCaption]
    """Caption for the figure, if available"""
    footnotes: NotRequired[list[Paragraph]]
    """Footnotes associated with the figure"""


class OCROutput(TypedDict, total=False):
    """The raw output from the Azure Document Intelligence prebuilt-layout model API."""

    apiVersion: str
    """API version used for analysis"""
    modelId: str
    """Identifier of the model used"""
    stringIndexType: str
    """Type of string indexing (e.g., 'utf8CodeUnit')"""
    content: str
    """Full content of the document"""
    pages: NotRequired[list[Page]]
    """List of pages in the document"""
    tables: NotRequired[list[Table]]
    """List of tables in the document"""
    paragraphs: NotRequired[list[Paragraph]]
    """List of paragraphs in the document"""
    styles: NotRequired[list[Style]]
    """Detected styles in the document"""
    contentFormat: NotRequired[str]
    """Format of the document content (e.g., 'text/plain')"""
    sections: NotRequired[list[Section]]
    """List of sections in the document"""
    figures: NotRequired[list[Figure]]
    """Figures in the document"""
    additionalItems: NotRequired[list[str | dict[str, Any]]]
    """Additional items or metadata related to the document"""
    languages: NotRequired[list[Language]]
    """Languages detected in the document"""


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


class VectorDTO(TypedDict):
    """DTO for embeddings and metadata."""

    embedding: list[float]
    """The embeddings of the content."""
    file_id: str
    """The ID of the file from which the content is derived."""
    chunk: Chunk
    """The chunk of text from which the embeddings are generated."""
