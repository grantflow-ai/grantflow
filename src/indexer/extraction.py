from __future__ import annotations

import logging
from http import HTTPStatus
from mimetypes import guess_type
from typing import NotRequired, TypedDict, cast

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, ContentFormat
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

from src.utils.env import get_env
from src.utils.exceptions import RequestFailureError, ValidationError

logger = logging.getLogger(__name__)

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
PLAIN_TEXT_MIMETYPES: set[str] = {
    "text/markdown",
    "text/plain",
}


class Span(TypedDict, total=False):
    offset: NotRequired[int]
    length: NotRequired[int]


class BoundingRegion(TypedDict, total=False):
    pageNumber: NotRequired[int]
    polygon: NotRequired[list[float]]


class Word(TypedDict, total=False):
    content: str
    confidence: NotRequired[float]
    span: NotRequired[Span]
    polygon: NotRequired[list[float]]


class SelectionMark(TypedDict, total=False):
    state: str
    confidence: NotRequired[float]
    polygon: NotRequired[list[float]]
    span: NotRequired[Span]


class Line(TypedDict, total=False):
    content: str
    polygon: NotRequired[list[float]]
    spans: NotRequired[list[Span]]


class Page(TypedDict, total=False):
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
    rowCount: NotRequired[int]
    columnCount: NotRequired[int]
    cells: NotRequired[list[TableCell]]
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]


class Paragraph(TypedDict, total=False):
    spans: NotRequired[list[Span]]
    boundingRegions: NotRequired[list[BoundingRegion]]
    content: str
    role: NotRequired[str]


class Style(TypedDict, total=False):
    confidence: NotRequired[float]
    spans: NotRequired[list[Span]]
    isHandwritten: NotRequired[bool]


class Section(TypedDict, total=False):
    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]


class FigureCaption(TypedDict, total=False):
    content: str
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]


class Figure(TypedDict, total=False):
    id: str
    boundingRegions: NotRequired[list[BoundingRegion]]
    spans: NotRequired[list[Span]]
    elements: NotRequired[list[str]]
    caption: NotRequired[FigureCaption]


class OCROutput(TypedDict, total=False):
    """This is the raw output from the Azure Document Intelligence prebuilt-layout model api."""

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
    additionalItems: NotRequired[list[str | dict]]


async def parse_blob_data(
    *,
    blob_data: bytes,
    filename: str,
) -> tuple[OCROutput | bytes, str]:
    """Extract the contents of a file.

    Args:
        blob_data: The contents of the file.
        filename: The name of the file.

    Raises:
        ValidationError: If the mime type is not supported.

    Returns:
        A tuple composed of the extracted text and mime_type.
    """
    if mime_type := guess_type(filename)[0]:
        if mime_type in PLAIN_TEXT_MIMETYPES or any(mime_type.startswith(value) for value in PLAIN_TEXT_MIMETYPES):
            return blob_data, mime_type

        if mime_type in DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES or any(
            mime_type.startswith(value) for value in DOCUMENT_INTELLIGENCE_SUPPORTED_MIME_TYPES
        ):
            return await extract_document(blob_data, filename), mime_type

    raise ValidationError(f"Unsupported mime type for file extraction: {mime_type}")


async def extract_document(file_content: bytes, filename: str) -> OCROutput:
    """Extract text from a document.

    Args:
        file_content: The content of the document.
        filename: The name of the document.

    Raises:
        RequestFailureError: If the extraction fails.

    Returns:
        The extracted text from the document.
    """
    try:
        client = DocumentIntelligenceClient(
            endpoint=get_env("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"),
            credential=AzureKeyCredential(get_env("AZURE_DOCUMENT_INTELLIGENCE_KEY")),
        )
        poller = await client.begin_analyze_document(
            model_id="prebuilt-layout",
            analyze_request=AnalyzeDocumentRequest(bytes_source=file_content),
            output_content_format=ContentFormat.MARKDOWN,
        )
        result = await poller.result()
        return cast(OCROutput, result.as_dict())
    except HttpResponseError as e:
        logger.error("Error extracting text from from file: %s, Error: %s", filename, e)
        raise RequestFailureError(
            f"Error extracting text from file: {filename}",
            status_code=e.status_code or HTTPStatus.INTERNAL_SERVER_ERROR,
            context={
                "reason": str(e),
            },
        ) from e
