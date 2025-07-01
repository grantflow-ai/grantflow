from __future__ import annotations

from typing import TYPE_CHECKING, Final

from bs4 import Comment, Tag

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

HTML_ATTRIBUTES_TO_KEEP: Final[set[str]] = {
    "href",
    "alt",
    "desc",
    "description",
    "title",
    "value",
}


def sanitize_html(soup: BeautifulSoup) -> BeautifulSoup:
    """Remove unwanted HTML tags and attributes from BeautifulSoup object.

    Args:
        soup: BeautifulSoup object to sanitize

    Returns:
        Sanitized BeautifulSoup object
    """
    for tag in [el for el in soup.find_all() if isinstance(el, Tag)]:
        if tag.name in HTML_TAGS_TO_DECOMPOSE:
            tag.decompose()
            continue

        for attr in [
            t for t in list(tag.attrs or []) if t not in HTML_ATTRIBUTES_TO_KEEP
        ]:
            del tag[attr]

    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    return soup
