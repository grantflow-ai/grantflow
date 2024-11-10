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


class SignificanceAndInnovationDTO(TypedDict):
    """DTO for the significance and innovation sections."""

    significance_id: str
    """The ID of the research significance."""
    innovation_id: str
    """The ID of the research innovation."""
    significance_description: str
    """The user input describing the significance of the research."""
    innovation_description: str
    """The user input describing the innovation of the research."""


class SectionGenerationRequest(TypedDict):
    """DTO for a RAG request for the research-plan section."""

    workspace_id: str
    """The workspace ID"""
    application_title: str
    """The title of the grant application"""
    cfp_title: str
    """The CFP action code and title"""
    grant_funding_organization: str
    """The funding organization for the grant"""
    data: str | SignificanceAndInnovationDTO | list[ResearchAimDTO]
    """The user inputs"""


class FormPrefillRequest(TypedDict):
    """DTO for a form prefill request."""

    workspace_id: str
    """The workspace ID."""
    application_id: str
    """The application ID."""


class InnovationAndSignificanceGenerationResult(TypedDict):
    """DTO for the result of generating the innovation and significance sections."""

    innovation_text: str
    """The generated text for the innovation section."""
    significance_text: str
    """The generated text for the significance section."""


class ResearchPlanGenerationResult(TypedDict):
    """DTO for the result of generating the research plan."""

    research_plan_text: str
    """The generated text for the research plan."""


class ExecutiveSummaryGenerationResult(TypedDict):
    """DTO for the result of generating the executive summary."""

    executive_summary_text: str
    """The generated text for the executive summary."""


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
