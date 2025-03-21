from typing import NotRequired, TypedDict

from src.db.json_objects import TableContext


class DocumentDTO(TypedDict):
    """A DTO for a document."""

    content: str
    """The text content of the chunk."""
    page_number: NotRequired[int]
    """Page number where the chunk appears"""
    element_type: NotRequired[str]
    """Type of document element (page, table_cell, paragraph, figure, formula)."""
    parent: NotRequired[str]
    """The parent element name or other identifier (e.g., table_1, para_2, formula_3)."""
    table_context: NotRequired[TableContext]
    """Additional context for table cells."""
    role: NotRequired[str]
    """Role or type of the content (e.g., paragraph role, cell kind, formula kind)."""
    languages: NotRequired[list[str]]
    """Detected language for the chunk."""
    confidence: NotRequired[float]
    """Confidence score for the extracted chunk."""


class GenerationResultDTO(TypedDict):
    """DTO for a text generation result."""

    text: str
    """The generated text."""
    is_complete: bool
    """Whether the section text is complete or not."""
