from typing import cast

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
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.retry import with_exponential_backoff_retry

logger = get_logger(__name__)


async def extract_with_azure_document_intelligence(file_content: bytes, mime_type: str) -> AnalyzeResult:
    client = DocumentIntelligenceClient(
        endpoint=get_env("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"),
        credential=AzureKeyCredential(get_env("AZURE_DOCUMENT_INTELLIGENCE_KEY")),
    )
    try:
        poller = await client.begin_analyze_document(
            model_id="prebuilt-read",
            body=AnalyzeDocumentRequest(bytes_source=file_content),
            output_content_format=DocumentContentFormat.MARKDOWN,
            features=[DocumentAnalysisFeature.FORMULAS, DocumentAnalysisFeature.LANGUAGES]
            if mime_type == "application/pdf"
            else None,
        )
        result = await poller.result()
        return cast("AnalyzeResult", result.as_dict())
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
    try:
        if use_azure:
            return await extract_with_azure_document_intelligence(
                file_content=content, mime_type=mime_type
            ), "text/markdown"

        result = await extract_bytes(content=content, mime_type=mime_type)
        return result.content, result.mime_type

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
    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            result = await crawler.arun(url=url)
            return cast("str", result.markdown)
    except ValueError as e:
        raise ExternalOperationError("Failed to get markdown from URL") from e
