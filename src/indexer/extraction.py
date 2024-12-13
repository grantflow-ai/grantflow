import logging
from typing import Any, Final, NotRequired, TypedDict, cast

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, ContentFormat
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from charset_normalizer import detect
from pypandoc import convert_text

from src.exceptions import FileParsingError, ValidationError
from src.indexer.dto import FileDTO
from src.utils.env import get_env
from src.utils.sync import as_async_callable

logger = logging.getLogger(__name__)

MARKDOWN_MIME_TYPE: Final[str] = "text/markdown"

PLAIN_TEXT_MIME_TYPES: set[str] = {
    MARKDOWN_MIME_TYPE,
    "text/plain",
}

PANDOC_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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


async def extract_with_azure_document_intelligence(file_content: bytes) -> OCROutput:
    """Extract text from a document using the Azure Document Intelligence prebuilt-layout model.

    Args:
        file_content: The content of the document.

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
            analyze_request=AnalyzeDocumentRequest(bytes_source=file_content),
            output_content_format=ContentFormat.MARKDOWN,
        )
        result = await poller.result()
        return cast(OCROutput, result.as_dict())
    except HttpResponseError as e:
        logger.error("Error extracting text from from file: %s", e)
        raise FileParsingError(
            "Error extracting text from file",
            context=str(e),
        ) from e
    finally:
        await client.close()


async def parse_file_data(file_data: FileDTO) -> tuple[str | OCROutput, str]:
    """Extract the contents of a file.

    Args:
        file_data: The file data.

    Raises:
        ValidationError: If the mime type is not supported.

    Returns:
        A tuple composed of the extracted text and mime_type.
    """
    if mime_type := file_data.mime_type:
        if mime_type in PLAIN_TEXT_MIME_TYPES or any(mime_type.startswith(value) for value in PLAIN_TEXT_MIME_TYPES):
            return file_data.content.decode(), mime_type

        if mime_type in PANDOC_MIME_TYPES or any(mime_type.startswith(value) for value in PANDOC_MIME_TYPES):
            return await extract_with_pandoc(file_data.content, mime_type), MARKDOWN_MIME_TYPE

        if mime_type in DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES or any(
            mime_type.startswith(value) for value in DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES
        ):
            return await extract_with_azure_document_intelligence(file_data.content), MARKDOWN_MIME_TYPE

    raise ValidationError(f"Unsupported mime type for file extraction: {mime_type}")
