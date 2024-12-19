from dataclasses import dataclass
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


@dataclass
class ResearchTaskDTO:
    """DTO for a research task data."""

    id: str
    """The ID of the task."""
    task_number: str
    """The task number in the format of <aim_number>.<task_number>."""
    title: str
    """The title of the task."""
    description: str | None
    """The description of the task."""
    relations: list[str] | None
    """The relations of the task."""


@dataclass
class ResearchAimDTO:
    """DTO for a research aim data."""

    id: str
    """The ID of the aim."""
    aim_number: int
    """The aim number."""
    title: str
    """The title of the aim."""
    description: str | None
    """The description of the aim."""
    preliminary_results: str | None
    """The preliminary results of the aim."""
    risks_and_alternatives: str | None
    """The risks and alternatives of the aim."""
    requires_clinical_trials: bool
    """Whether the aim requires clinical trials."""
    research_tasks: list[ResearchTaskDTO]
    """The research tasks for the aim."""
    relations: list[str] | None
    """The relations of the aim."""
