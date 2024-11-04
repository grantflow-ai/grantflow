from typing import NotRequired, TypedDict

from src.rag.prompts.section_generation import SectionName


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    details: str
    """The error details."""


class ResearchTaskDTO(TypedDict):
    """DTO for a research task."""

    task_title: str
    """The title of the research task."""
    description: str
    """The description of the research task."""


class ResearchAimDTO(TypedDict):
    """DTO for a research aim."""

    aim_title: str
    """The title of the research aim."""
    description: str
    """The description of the research aim."""
    requires_clinical_trials: bool
    """Whether the research aim requires clinical trials."""
    tasks: list[ResearchTaskDTO]
    """The tasks associated with the research aim."""


class RagRequest(TypedDict):
    """DTO for a RAG request for the research-plan section."""

    workspace_id: str
    """The workspace ID"""
    parent_id: str
    """The parent ID"""
    section_name: SectionName
    """The name of the section to generate"""
    inputs: str | list[ResearchAimDTO]
    """The user inputs"""
    file_names: list[str] | None
    """The file names for the section"""


class RagResponse(TypedDict):
    """DTO for an API response."""

    section_name: SectionName
    """The name of the section that was generated."""
    text: str
    """Markdown text of the section."""


class DocumentDTO(TypedDict):
    """A DTO for a document."""

    filename: str
    """The filename of the document"""
    content: str
    """The text extracted from the document"""
    page_number: NotRequired[int]
    """Optional page number"""


class SectionGenerationResult(TypedDict):
    """DTO for a section generation result."""

    text: str
    """The generated text."""
    is_complete: bool
    """Whether the section text is complete or not."""
