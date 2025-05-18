from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING, Final
from urllib.parse import urlparse

from bs4 import Comment, Tag
from httpx import AsyncClient

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

client = AsyncClient()


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
    html = await client.get(url, timeout=15)
    return html.text


async def download_file(url: str) -> bytes:
    response = await client.get(url, timeout=30)
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
