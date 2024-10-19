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

    page_number: int | None
    """The page number of the document."""

    content_hash: str
    """The hash of the content."""


class Chunk(TypedDict):
    """DTO for a chunk of text."""

    content: str
    """The content of the chunk."""
    page_number: int | None
    """The page number of the document."""


class Line(TypedDict):
    """DTO for a line of text."""

    content: str
    """The content of the line."""


class Page(TypedDict):
    """DTO for a page of text."""

    pageNumber: int
    """The page number. The camel case is what the Azure Document Intelligence API outputs."""
    lines: list[Line]
    """The lines of the page."""


class OCROutput(TypedDict):
    """Dto for OCR output."""

    content: str
    """The content of the document."""
    pages: list[Page]
    """The pages of the document."""
