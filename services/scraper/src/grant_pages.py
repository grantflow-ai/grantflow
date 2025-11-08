from asyncio import gather

from html_to_markdown import PreprocessingOptions, convert
from mdformat import text
from packages.shared_utils.src.logger import get_logger
from services.scraper.src.db_utils import save_grant_page_content
from services.scraper.src.dtos import GrantInfo
from services.scraper.src.html_utils import download_page_html

logger = get_logger(__name__)


async def download_and_save_pages(*, grants_info: list[tuple[str, str]]) -> None:
    urls = [url for url, _ in grants_info]
    html_pages = await gather(*(download_page_html(url=url) for url in urls))

    save_tasks = []
    for result, (url, document_number) in zip(html_pages, grants_info, strict=False):
        save_tasks.append(save_markdown_page(html=result, url=url, document_number=document_number))

    await gather(*save_tasks)
    logger.info("Finished processing %d pages", len(urls))


async def save_markdown_page(*, html: str, url: str, document_number: str) -> None:
    markdown = convert(
        html,
        preprocessing=PreprocessingOptions(
            enabled=True,
        ),
    )
    formatted_markdown = text(markdown)

    await save_grant_page_content(url=url, document_number=document_number, content=formatted_markdown)
    logger.debug("Saved markdown page to PostgreSQL", document_number=document_number, url=url)


async def download_grant_pages(*, search_results: list[GrantInfo], existing_file_identifiers: set[str]) -> int:
    grants_to_download: list[tuple[str, str]] = []
    for result in search_results:
        url = result.get("url", "")
        document_number = result.get("document_number", "")

        if not url or not document_number or document_number in existing_file_identifiers:
            continue

        grants_to_download.append((url, document_number))

    logger.info("Found %d total search results", len(search_results))
    logger.info("Will download %d new search results not in storage", len(grants_to_download))

    for i in range(0, len(grants_to_download), 100):
        chunk = grants_to_download[i : i + 100]
        logger.info("Downloading chunk starting at index %d", i + 1)
        await download_and_save_pages(grants_info=chunk)

    logger.info("Finished downloading")
    logger.info("Downloaded %d pages", len(grants_to_download))

    return len(grants_to_download)
