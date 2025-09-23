"""URL normalization utilities for deduplication."""

from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    """
    Normalize a URL for deduplication purposes.

    - Converts scheme to lowercase
    - Converts domain to lowercase
    - Removes trailing slashes from path
    - Removes query parameters
    - Removes URL fragments
    - Removes default ports (80 for http, 443 for https)

    Args:
        url: The URL to normalize

    Returns:
        Normalized URL string

    Examples:
        >>> normalize_url("HTTPS://Example.COM/path/?param=1#section")
        'https://example.com/path'
        >>> normalize_url("http://example.com:80/")
        'http://example.com'
    """
    if not url or not isinstance(url, str):
        return url

    try:
        parsed = urlparse(url.strip())

        # Normalize scheme to lowercase
        scheme = parsed.scheme.lower() if parsed.scheme else ""

        # Normalize domain to lowercase
        netloc = parsed.netloc.lower() if parsed.netloc else ""

        # Remove default ports
        if netloc:
            if netloc.endswith(":80") and scheme == "http":
                netloc = netloc[:-3]
            elif netloc.endswith(":443") and scheme == "https":
                netloc = netloc[:-4]

        # Normalize path - remove trailing slash unless it's the root path
        path = parsed.path
        if path and path != "/" and path.endswith("/"):
            path = path.rstrip("/")
        elif not path:
            path = "/"

        # Remove query parameters and fragments for deduplication
        # (keeping them would make URLs with tracking params appear different)

        return urlunparse((scheme, netloc, path, "", "", ""))

    except Exception:
        # If URL parsing fails, return original URL
        return url
