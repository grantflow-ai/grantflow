from __future__ import annotations

from asyncio import gather
from typing import TYPE_CHECKING

from bs4 import BeautifulSoup
from html_to_markdown import convert_to_markdown
from mdformat import text
from packages.shared_utils.src.logger import get_logger
from services.scraper.src.gcs_utils import upload_blob
from services.scraper.src.html_utils import download_page_html
from services.scraper.src.url_utils import get_identifier_from_nih_url

if TYPE_CHECKING:
    from services.scraper.src.dtos import GrantInfo

logger = get_logger(__name__)


async def download_and_save_pages(*, urls: list[str]) -> None:
    """Download HTML pages from the provided URLs and save them as markdown files.

    Args:
        urls (list[str]): A list of URLs to download and process.

    Returns:
        None
    """
    html_pages = await gather(*(download_page_html(url=url) for url in urls))

    save_tasks = []
    for result, url in zip(html_pages, urls, strict=False):
        soup = BeautifulSoup(result, features="lxml")

        result_name = get_identifier_from_nih_url(url=url)
        save_tasks.append(save_markdown_page(soup=soup, result_name=result_name))

    await gather(*save_tasks)
    logger.info("Finished processing %d pages", len(urls))


async def save_markdown_page(*, soup: BeautifulSoup, result_name: str) -> None:
    """Convert HTML content to markdown and save it to the storage.

    Args:
        soup (BeautifulSoup): The BeautifulSoup object representing the HTML content.
        result_name (str): The name of the result used to name the saved file.

    Returns:
        None
    """
    markdown = convert_to_markdown(soup)
    formatted_markdown = text(markdown)

    blob_path = f"scraper-results/grant_search_result_{result_name}.md"
    await upload_blob(blob_path, formatted_markdown.encode("utf-8"))
    logger.debug("Saved markdown page to GCS", blob_path=blob_path, result_name=result_name)


async def download_grant_pages(*, search_results: list[GrantInfo], existing_file_identifiers: set[str]) -> int:
    """Download grant pages from search results and save them as markdown files.

    Args:
        search_results (list[dict]): A list of grant search results. Each result should include a "url" field.
        existing_file_identifiers (set[str]): A set of existing identifiers already in storage.

    Returns:
        Number of new files downloaded
    """
    all_urls = [result["url"] for result in search_results]
    logger.info("Found %d total search results", len(all_urls))

    search_result_item_urls = [
        url for url in all_urls if get_identifier_from_nih_url(url) not in existing_file_identifiers
    ]
    logger.info("Will download %d new search results not in storage", len(search_result_item_urls))

    for i in range(0, len(search_result_item_urls), 100):
        chunk = search_result_item_urls[i : i + 100]
        logger.info("Downloading chunk starting at index %d", i + 1)
        await download_and_save_pages(urls=chunk)

    logger.info("Finished downloading")
    logger.info("Downloaded %d pages", len(search_result_item_urls))

    return len(search_result_item_urls)
