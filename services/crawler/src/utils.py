from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import urlparse

from httpx import AsyncClient, Timeout
from packages.shared_utils.src.logger import get_logger

from services.crawler.src.constants import SKIP_DOMAINS

if TYPE_CHECKING:
    pass


client = AsyncClient(timeout=Timeout(15))
logger = get_logger(__name__)


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


def filter_url(url: str) -> bool:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    if domain in SKIP_DOMAINS:
        return True

    return parsed.scheme not in {"http", "https"}
