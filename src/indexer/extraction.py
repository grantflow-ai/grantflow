from __future__ import annotations

import logging
from mimetypes import guess_type
from typing import Final, cast

from anyio.to_thread import run_sync
from google.api_core.exceptions import GoogleAPICallError, RetryError
from google.cloud.documentai import DocumentProcessorServiceClient, ProcessRequest, RawDocument
from google.oauth2.service_account import Credentials
from pypandoc import convert_text
from typing_extensions import TypedDict

from src.utils.env import get_env
from src.utils.exceptions import ExternalOperationError, ValidationError
from src.utils.ref import Ref

logger = logging.getLogger(__name__)

PDF_MIMETYPE: Final[str] = "application/pdf"
DOCX_MIMETYPE: Final[str] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
PLAIN_TEXT_MIMETYPES: set[str] = {
    "text/markdown",
    "text/plain",
}


class PageSpan(TypedDict):
    pageStart: int
    pageEnd: int


class TextBlock(TypedDict):
    text: str
    type: str
    blocks: list[Block] | None


class Block(TypedDict):
    blockId: str
    textBlock: TextBlock
    pageSpan: PageSpan


class DocumentLayout(TypedDict):
    blocks: list[Block]


class OCROutput(TypedDict):
    documentLayout: DocumentLayout


ref = Ref[DocumentProcessorServiceClient]()


def get_client() -> DocumentProcessorServiceClient:
    """Get the DocumentProcessorServiceClient client.

    Returns:
        The DocumentProcessorServiceClient client.
    """
    if not ref.value:
        ref.value = DocumentProcessorServiceClient(
            credentials=Credentials.from_service_account_info(get_env("GCP_CREDENTIALS"))  # type: ignore[no-untyped-call]
        )
    return ref.value


def extract_docx(file_data: bytes) -> bytes:
    return cast(str, convert_text(file_data.decode(), "md", format="docx")).encode()


async def parse_file_data(
    *,
    file_data: bytes,
    filename: str,
) -> tuple[OCROutput | bytes, str]:
    """Extract the contents of a file.

    Args:
        file_data: The contents of the file.
        filename: The name of the file.

    Raises:
        ValidationError: If the mime type is not supported.

    Returns:
        A tuple composed of the extracted text and mime_type.
    """
    if mime_type := guess_type(filename)[0]:
        if mime_type in PLAIN_TEXT_MIMETYPES or any(mime_type.startswith(value) for value in PLAIN_TEXT_MIMETYPES):
            return file_data, mime_type

        if mime_type == DOCX_MIMETYPE:  # TODO: addd support for other pandoc supported formats
            return extract_docx(file_data), "text/markdown"

        if mime_type == PDF_MIMETYPE:
            return await extract_document(file_data, filename), "text/markdown"

    raise ValidationError(f"Unsupported mime type for file extraction: {mime_type}")


async def extract_document(file_content: bytes, filename: str) -> OCROutput:
    """Extract text from a document using GCP Document AI.

    Args:
        file_content: The content of the document.
        filename: The name of the document.

    Raises:
        RequestFailureError: If the extraction fails.

    Returns:
        The extracted text from the document.
    """
    client = get_client()
    request = ProcessRequest(
        name=get_env("GCP_DOCUMENT_AI_ENDPOINT"),
        raw_document=RawDocument(content=file_content, mime_type=PDF_MIMETYPE, display_name=filename),
    )

    try:
        response = await run_sync(client.process_document, request)
        return cast(OCROutput, response.document.to_dict())
    except (GoogleAPICallError, RetryError) as e:
        logger.error("Error extracting text from file: %s, Error: %s", filename, e)
        raise ExternalOperationError(
            f"Error extracting text from file: {filename}",
            context={"reason": str(e)},
        ) from e
