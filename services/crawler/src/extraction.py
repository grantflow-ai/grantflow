from typing import cast

from crawl4ai import AsyncWebCrawler
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.retry import with_exponential_backoff_retry


@with_exponential_backoff_retry(ExternalOperationError, max_retries=3)
async def extract_webpage_content(url: str) -> str:
    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            result = await crawler.arun(url=url)
            return cast("str", result.markdown)
    except ValueError as e:
        raise ExternalOperationError("Failed to get markdown from URL") from e
