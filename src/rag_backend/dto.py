from typing import NotRequired, TypedDict


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    details: str
    """The error details."""


class ResearchTaskDTO(TypedDict):
    """DTO for a research task."""

    id: str
    """The ID of the research task."""
    title: str
    """The title of the research task."""
    description: str
    """The description of the research task."""


class ResearchAimDTO(TypedDict):
    """DTO for a research aim."""

    id: str
    """The ID of the research aim."""
    title: str
    """The title of the research aim."""
    description: str
    """The description of the research aim."""
    requires_clinical_trials: bool
    """Whether the research aim requires clinical trials."""
    tasks: list[ResearchTaskDTO]
    """The tasks associated with the research aim."""


class DraftGenerationRequest(TypedDict):
    """DTO for a RAG request for the research-plan section."""

    workspace_id: str
    """The workspace ID"""
    application_id: str
    """The application ID"""
    application_title: str
    """The title of the grant application"""
    cfp_title: str
    """The CFP action code and title"""
    grant_funding_organization: str
    """The funding organization for the grant"""
    significance_description: str
    """The description of the research significance"""
    significance_id: str
    """The ID of the research significance"""
    innovation_description: str
    """The description of the research innovation"""
    innovation_id: str
    """The ID of the research innovation"""
    research_aims: list[ResearchAimDTO]
    """The research aims for the grant application"""


class DocumentDTO(TypedDict):
    """A DTO for a document."""

    filename: str
    """The filename of the document"""
    content: str
    """The text extracted from the document"""
    page_number: NotRequired[int]
    """Optional page number"""


class GenerationResult(TypedDict):
    """DTO for a text generation result."""

    text: str
    """The generated text."""
    is_complete: bool
    """Whether the section text is complete or not."""
