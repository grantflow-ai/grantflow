from __future__ import annotations

from typing import TYPE_CHECKING, Final

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


async def download_page_html(url: str) -> str:
    """Download the HTML content of a page.

    Args:
        url: The URL of the page to download.

    Returns:
        The HTML content of the page.
    """
    client = AsyncClient()
    html = await client.get(url)
    return html.text


def sanitize_html(soup: BeautifulSoup) -> str:
    """Sanitize the HTML markup.

    Args:
        soup: The BeautifulSoup object
        markup: The markup to sanitize.

    Returns:
        The sanitized markup.
    """
    from bs4 import Comment, Tag

    for tag in [el for el in soup.find_all(recursive=True) if isinstance(el, Tag)]:
        if tag.name in HTML_TAGS_TO_DECOMPOSE:
            tag.decompose()
            continue

        for attr in [t for t in list(tag.attrs or []) if t not in HTML_ATTRIBUTES_TO_KEEP]:
            del tag[attr]

    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    return soup.prettify()
