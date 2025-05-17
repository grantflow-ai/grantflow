import re
from pathlib import Path
from urllib.parse import urlparse


def safe_filename_from_url(url: str, default_extension: str = ".md") -> str:
    """
    Extracts a safe filename from a URL.

    Args:
        url (str): The URL to extract or generate a safe filename from.
        default_extension (str): Extension to use if none is present in the URL.

    Returns:
        str: A filesystem-safe filename derived from the URL.
    """
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
