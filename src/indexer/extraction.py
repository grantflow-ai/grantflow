from typing import Final, cast

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, DocumentAnalysisFeature, DocumentContentFormat
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from charset_normalizer import detect
from pypandoc import convert_text

from src.exceptions import FileParsingError, ValidationError
from src.indexer.dto import FileDTO, OCROutput
from src.utils.env import get_env
from src.utils.logging import get_logger
from src.utils.sync import as_async_callable

logger = get_logger(__name__)

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
            return await extract_with_azure_document_intelligence(file_data.content, mime_type), MARKDOWN_MIME_TYPE

    raise ValidationError(f"Unsupported mime type for file extraction: {mime_type}")
