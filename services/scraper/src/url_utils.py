from __future__ import annotations


def get_identifier_from_nih_url(url: str) -> str:
    """Extract the grant identifier from the NIH page URL.

    Args:
        url: The URL of the result.

    Returns:
        The name of the result.
    """
    return url.split("/")[-1].replace(".html", "")


def get_identifier_from_filename(filename: str) -> str:
    """Extract the identifier from the filename.

    Args:
        filename: The filename to extract the identifier from.

    Returns:
        The identifier extracted from the filename.
    """
    return filename.split(".")[0].replace("grant_search_result_", "")
