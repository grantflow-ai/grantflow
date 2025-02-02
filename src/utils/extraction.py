from re import Pattern
from re import compile as compile_regex
from typing import Final, cast

from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import (
    AnalyzeDocumentRequest,
    AnalyzeResult,
    DocumentAnalysisFeature,
    DocumentContentFormat,
)
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from crawl4ai import AsyncWebCrawler
from kreuzberg import KreuzbergError, extract_bytes

from src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from src.utils.env import get_env
from src.utils.logger import get_logger
from src.utils.retry import with_exponential_backoff_retry

logger = get_logger(__name__)

CORRUPTED_PATTERN_REGEX: Final[Pattern[str]] = compile_regex(
    r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]|�|[\uFFFD\uFFFE\uFFFF]|(?<!\w)[®©™](?!\w)|[A-Z]\*[A-Z]|\+[A-Z]|(?<![a-z])l(?=[A-Z])|(?<=[a-z])[A-Z](?=[a-z])"
)


def validate_extracted_text(text: str, min_valid_ratio: float = 0.8) -> bool:
    """Validates text extracted from PDF for corruption.


    Args:
        text: The extracted text to validate
        min_valid_ratio: Minimum ratio of valid characters required

    Returns:
        ValidationResult containing validation status, detected language, and any error message
    """
    total_chars = len(text)
    if not total_chars:
        return False

    invalid_chars = len(CORRUPTED_PATTERN_REGEX.findall(text))

    valid_ratio = (total_chars - invalid_chars) / total_chars

    return valid_ratio >= min_valid_ratio


async def extract_with_azure_document_intelligence(file_content: bytes, mime_type: str) -> AnalyzeResult:
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
            model_id="prebuilt-read",  # or "prebuilt-layout"
            body=AnalyzeDocumentRequest(bytes_source=file_content),
            output_content_format=DocumentContentFormat.MARKDOWN,
            features=[DocumentAnalysisFeature.FORMULAS, DocumentAnalysisFeature.LANGUAGES]
            if mime_type == "application/pdf"
            else None,
        )
        result = await poller.result()
        return cast(AnalyzeResult, result.as_dict())
    except HttpResponseError as e:
        logger.error("Error extracting text from from file.", exec_info=e)
        raise FileParsingError(
            "Error extracting text from file",
            context=str(e),
        ) from e
    finally:
        await client.close()


async def extract_file_content(
    *, content: bytes, mime_type: str, use_azure: bool = False
) -> tuple[str | AnalyzeResult, str]:
    """Extract the textual content from a given byte string representing a file's contents.

    Args:
        content: The content to extract.
        mime_type: The mime type of the content.
        use_azure: Whether to use Azure Document Intelligence for extraction.

    Raises:
        ValidationError: If the mime type is not supported.

    Returns:
        The extracted content and the mime type of the content.
    """
    try:
        if use_azure:
            return await extract_with_azure_document_intelligence(
                file_content=content, mime_type=mime_type
            ), "text/markdown"

        result = await extract_bytes(content=content, mime_type=mime_type)
        if validate_extracted_text(result.content):
            return result.content, result.mime_type

        return await extract_bytes(content=content, mime_type=mime_type, force_ocr=True)

    except KreuzbergError as e:
        raise ValidationError(
            "Error extracting content from file",
            context={
                "mime_type": mime_type,
                "error": str(e),
            },
        ) from e


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
