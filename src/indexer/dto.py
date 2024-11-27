from __future__ import annotations

from typing import TYPE_CHECKING, Literal, NamedTuple, TypedDict

if TYPE_CHECKING:
    from src.data_types import SectionName


class SearchSchema(TypedDict):
    """Schema for indexing in Azure Search."""

    id: str
    """The unique identifier for the content to be indexed."""
    workspace_id: str
    """The workspace id to which the document belongs."""
    application_id: str
    """The application id to which the document belongs."""
    section_name: SectionName
    """The section name to which the document belongs."""
    filename: str
    """The name of the file from which the content was extracted."""
    content: str
    """The text content of the document."""
    content_vector: list[float] | None
    """The vector representation of the document's content."""
    page_number: int | None
    """The page number of the document."""
    keywords: list[str]
    """The keywords extracted from the content."""
    labels: list[str]
    """The labels extracted from the content."""
    element_type: Literal["page", "paragraph", "table", None]
    """The type of element the content belongs to."""


class Chunk(TypedDict):
    """DTO for a chunk of text."""

    content: str
    """The content of the chunk."""
    page_number: int | None
    """The page number of the document."""
    element_type: Literal["page", "paragraph", "table", None]
    """The type of element the chunk belongs to."""


class FileMetadata(NamedTuple):
    """A named tuple to represent the components of a blob name."""

    workspace_id: str
    """The workspace id to which the document belongs."""
    application_id: str
    """The application id to which the document belongs."""
    section_name: SectionName
    """The section name to which the document belongs."""
    filename: str
    """The name of the file from which the content was extracted."""
