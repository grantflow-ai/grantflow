from typing_extensions import TypedDict


class FileDTO(TypedDict):
    """DTO for a file."""

    content: bytes
    """The content of the file."""
    filename: str
    """The name of the file."""


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


class VectorDTO(TypedDict):
    """DTO for embeddings and metadata."""

    chunk_index: int
    """The index of the chunk."""
    content: str
    """The text content of the document."""
    element_type: str | None
    """The type of element the content belongs to."""
    embedding: list[float]
    """The embeddings of the content."""
    file_id: str
    """The ID of the file from which the content is derived."""
    page_number: int | None
    """The page number of the document."""
