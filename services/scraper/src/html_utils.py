from __future__ import annotations

from typing import TYPE_CHECKING

from httpx import AsyncClient, Timeout
from packages.shared_utils.src.html import sanitize_html as shared_sanitize_html
from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from bs4 import BeautifulSoup

logger = get_logger(__name__)
client = AsyncClient(timeout=Timeout(15))


async def download_page_html(url: str) -> str:
    """Download the HTML content of a page.

    Args:
        url: The URL of the page to download.

    Returns:
        The HTML content of the page.
    """
    response = await client.get(url, follow_redirects=True)
    response.raise_for_status()

    logger.debug(
        "Downloaded page HTML",
        url=url,
        status_code=response.status_code,
        content_type=response.headers.get("content-type", "unknown"),
        content_length=len(response.content),
    )

    return response.text


def sanitize_html(soup: BeautifulSoup) -> str:
    """Sanitize the HTML markup using shared utilities.

    Args:
        soup: The BeautifulSoup object

    Returns:
        The sanitized markup.
    """
    sanitized_soup = shared_sanitize_html(soup)
    return str(sanitized_soup.prettify())
