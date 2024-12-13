from typing_extensions import TypedDict


class Chunk(TypedDict):
    """DTO for a chunk of text."""

    content: str
    """The content of the chunk."""
    index: int
    """The index of the chunk."""
    page_number: int | None
    """The page number of the document."""
    element_type: str | None
    """The type of element the chunk belongs to."""
