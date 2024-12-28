from typing import NotRequired

from typing_extensions import TypedDict


class DocumentDTO(TypedDict):
    """A DTO for a document."""

    source: str
    """The name of the source document."""
    content: str
    """The text extracted from the document"""
    page_number: NotRequired[int]
    """Optional page number"""
    element_type: NotRequired[str | None]
    """The type of element the content belongs to."""


class GenerationResultDTO(TypedDict):
    """DTO for a text generation result."""

    text: str
    """The generated text."""
    is_complete: bool
    """Whether the section text is complete or not."""
