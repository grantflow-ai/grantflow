from typing import NotRequired, TypedDict

from src.db.json_objects import Chunk


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    detail: NotRequired[str]
    """The error details."""


class VectorDTO(TypedDict):
    """DTO for embeddings and metadata."""

    embedding: list[float]
    """The embeddings of the content."""
    rag_file_id: str
    """The ID of the file from which the content is derived."""
    chunk: Chunk
    """The chunk of text from which the embeddings are generated."""


class GrantSectionDTO(TypedDict):
    """DTO for a grant section."""

    name: str
    """The name of the section."""
    content: str
    """The content of the section."""
