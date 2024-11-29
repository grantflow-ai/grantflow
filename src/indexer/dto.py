from __future__ import annotations

from typing import TYPE_CHECKING, NamedTuple

from typing_extensions import TypedDict

if TYPE_CHECKING:
    from src.data_types import SectionName


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


class FileMetadata(NamedTuple):
    """A named tuple to represent the components of a blob name."""

    section_name: SectionName
    """The section name to which the document belongs."""
    filename: str
    """The name of the file from which the content was extracted."""


class VectorDTO(TypedDict):
    """DTO for embeddings and metadata."""

    chunk_index: int
    """The index of the chunk."""
    content: str
    """The text content of the document."""
    element_type: str | None
    """The type of element the content belongs to."""
    embeddings: list[list[float]]
    """The embeddings of the content."""
    file_id: str
    """The ID of the file from which the content is derived."""
    page_number: int | None
    """The page number of the document."""
    section_name: SectionName
    """The section name to which the document belongs."""
