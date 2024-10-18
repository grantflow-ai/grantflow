from __future__ import annotations

from typing import TypedDict


class SearchSchema(TypedDict):
    """Schema for indexing in Azure Search."""

    id: str
    """The unique identifier for the content to be indexed."""

    workspace_id: str
    """The workspace id to which the document belongs."""

    parent_id: str
    """The database entity to which this document is attached"""

    filename: str
    """The name of the file from which the content was extracted."""

    content: str
    """The text content of the document."""

    content_vector: list[float] | None
    """The vector representation of the document's content."""

    chunk_id: str
    """The chunk id of the document."""

    page_number: int | None
    """The page number of the document."""

    content_hash: str
    """The hash of the content."""
