from enum import Enum
from typing import Any, Final, NotRequired, TypedDict, cast

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, DocumentAnalysisFeature, DocumentContentFormat
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from charset_normalizer import detect
from crawl4ai import AsyncWebCrawler
from pypandoc import convert_text

from src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from src.utils.env import get_env
from src.utils.logger import get_logger
from src.utils.retry import with_exponential_backoff_retry
from src.utils.sync import as_async_callable

logger = get_logger(__name__)


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


MARKDOWN_MIME_TYPE: Final[str] = "text/markdown"

PLAIN_TEXT_MIME_TYPES: set[str] = {
    MARKDOWN_MIME_TYPE,
    "text/plain",
}

PANDOC_MIME_TYPES = {
    # "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # we use Azure Document Intelligence for this
    "text/csv",
    "application/csv",
    "text/x-csv",
    "application/x-csv",
    "text/tab-separated-values",
    "text/x-tsv",
    "application/rtf",
    "text/rtf",
    "application/x-rtf",
    "text/x-rst",
    "text/rst",
    "application/vnd.oasis.opendocument.text",
    "application/x-vnd.oasis.opendocument.text",
    "application/x-latex",
    "text/x-latex",
    "application/latex",
    "text/latex",
}

DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/bmp",
    "image/gif",
    "image/heif",
    "image/jpeg",
    "image/png",
    "image/tiff",
}

MIME_TYPE_EXT_MAP = {
    "application/csv": "csv",
    "application/latex": "latex",
    "application/rtf": "rtf",
    "application/vnd.oasis.opendocument.text": "odt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/x-csv": "csv",
    "application/x-latex": "latex",
    "application/x-rtf": "rtf",
    "application/x-vnd.oasis.opendocument.text": "odt",
    "text/csv": "csv",
    "text/latex": "latex",
    "text/rst": "rst",
    "text/rtf": "rtf",
    "text/tab-separated-values": "tsv",
    "text/x-csv": "csv",
    "text/x-latex": "latex",
    "text/x-rst": "rst",
    "text/x-tsv": "tsv",
}

pandoc_handler = as_async_callable(convert_text)


async def extract_with_pandoc(file_data: bytes, mime_type: str) -> str:
    """Extract text using pandoc.

    Args:
        file_data: The content of the file.
        mime_type: The mime type of the file.

    Returns:
        The extracted text.
    """
    ext = MIME_TYPE_EXT_MAP[mime_type]
    encoding = detect(file_data)["encoding"] or "utf-8"

    return cast(str, await pandoc_handler(file_data, to="md", format=ext, encoding=encoding))


async def extract_with_azure_document_intelligence(file_content: bytes, mime_type: str) -> OCROutput:
    """Extract text from a document using the Azure Document Intelligence prebuilt-layout model.

    Args:
        file_content: The content of the document.
        mime_type: The mime type of the document.

    Raises:
        FileParsingError: If an error occurs during the extraction.

    Returns:
        The extracted text from the document.
    """
    client = DocumentIntelligenceClient(
        endpoint=get_env("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"),
        credential=AzureKeyCredential(get_env("AZURE_DOCUMENT_INTELLIGENCE_KEY")),
    )
    try:
        poller = await client.begin_analyze_document(
            model_id="prebuilt-layout",
            body=AnalyzeDocumentRequest(bytes_source=file_content),
            output_content_format=DocumentContentFormat.MARKDOWN,
            features=[DocumentAnalysisFeature.FORMULAS, DocumentAnalysisFeature.LANGUAGES]
            if mime_type == "application/pdf"
            else None,
        )
        result = await poller.result()
        return cast(OCROutput, result.as_dict())
    except HttpResponseError as e:
        logger.error("Error extracting text from from file.", exec_info=e)
        raise FileParsingError(
            "Error extracting text from file",
            context=str(e),
        ) from e
    finally:
        await client.close()


async def extract_file_content(*, content: bytes, mime_type: str) -> tuple[str | OCROutput, str]:
    """Extract the textual content from a given byte string representing a file's contents.

    Args:
        content: The content to extract.
        mime_type: The mime type of the content.

    Raises:
        ValidationError: If the mime type is not supported.

    Returns:
        The extracted content and the mime type of the content.
    """
    if mime_type in PLAIN_TEXT_MIME_TYPES or any(mime_type.startswith(value) for value in PLAIN_TEXT_MIME_TYPES):
        return content.decode(), mime_type

    if mime_type in PANDOC_MIME_TYPES or any(mime_type.startswith(value) for value in PANDOC_MIME_TYPES):
        return await extract_with_pandoc(content, mime_type), MARKDOWN_MIME_TYPE

    if mime_type in DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES or any(
        mime_type.startswith(value) for value in DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES
    ):
        return await extract_with_azure_document_intelligence(content, mime_type), MARKDOWN_MIME_TYPE

    raise ValidationError(f"Unsupported mime type: {mime_type}")


@with_exponential_backoff_retry(ExternalOperationError, max_retries=3)
async def extract_webpage_content(url: str) -> str:
    """Extract the content from a webpage as markdown.

    Args:
        url: The URL of the webpage to extract content from.

    Raises:
        ExternalOperationError: If the operation failed.

    Returns:
        The markdown content of the webpage.
    """
    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            result = await crawler.arun(url=url)
            return cast(str, result.markdown)
    except ValueError as e:
        raise ExternalOperationError("Failed to get markdown from URL") from e
