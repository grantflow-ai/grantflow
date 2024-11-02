from __future__ import annotations

import logging
from http import HTTPStatus
from mimetypes import guess_type
from typing import cast

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, ContentFormat
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

from src.indexer.dto import OCROutput
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
            model_id="prebuilt-read",
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
