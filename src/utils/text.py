def strip_lines(text: str) -> str:
    """Strip lines of text.

    Args:
        text: The text to strip.

    Returns:
        The stripped text.
    """
    return "\n".join([line.strip() or "" for line in text.splitlines()])
