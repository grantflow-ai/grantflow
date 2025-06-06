from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING, Final
from urllib.parse import urlparse

from bs4 import Comment, Tag
from httpx import AsyncClient, Timeout
from packages.shared_utils.src.logger import get_logger
from services.crawler.src.constants import SKIP_DOMAINS, SKIP_URL_PATTERNS

if TYPE_CHECKING:
    from bs4 import BeautifulSoup

HTML_TAGS_TO_DECOMPOSE: Final[set[str]] = {
    "script",
    "style",
    "map",
    "area",
    "noscript",
    "iframe",
    "object",
    "embed",
    "applet",
    "link",
}
HTML_ATTRIBUTES_TO_KEEP: Final[set[str]] = {"href", "alt", "desc", "description", "title", "value"}

client = AsyncClient(timeout=Timeout(15))
logger = get_logger(__name__)


def should_skip_url(url: str) -> bool:
    parsed = urlparse(url)

    if parsed.netloc in SKIP_DOMAINS:
        logger.debug("Skipping URL due to domain", url=url, domain=parsed.netloc)
        return True

    for pattern in SKIP_URL_PATTERNS:
        if pattern in url.lower():
            logger.debug("Skipping URL due to pattern match", url=url, pattern=pattern)
            return True

    return False


def safe_filename_from_url(url: str, default_extension: str = ".md") -> str:
    parsed = urlparse(url)
    path = parsed.path
    filename = Path(path).name

    if filename:
        if Path(path).suffix:
            return filename
        return filename + default_extension

    base = parsed.netloc + parsed.path
    safe = re.sub(r"[^0-9A-Za-z._-]", "_", base)

    return safe + default_extension


async def download_page_html(url: str) -> str:
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


async def download_file(url: str) -> bytes:
    response = await client.get(url, timeout=30, follow_redirects=True)
    response.raise_for_status()

    logger.debug(
        "Downloaded file",
        url=url,
        status_code=response.status_code,
        content_type=response.headers.get("content-type", "unknown"),
        content_length=len(response.content),
    )

    return response.content


def sanitize_html(soup: BeautifulSoup) -> BeautifulSoup:
    for tag in [el for el in soup.find_all() if isinstance(el, Tag)]:
        if tag.name in HTML_TAGS_TO_DECOMPOSE:
            tag.decompose()
            continue

        for attr in [t for t in list(tag.attrs or []) if t not in HTML_ATTRIBUTES_TO_KEEP]:
            del tag[attr]

    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    return soup
