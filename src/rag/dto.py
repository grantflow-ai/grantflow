from typing import TypedDict


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
    files: dict[str, str] | None
    """Mapping of file names to file URLs that the user uploaded for the research task."""


class ResearchAimDTO(TypedDict):
    """DTO for a research aim."""

    aim_title: str
    """The title of the research aim."""
    description: str
    """The description of the research aim."""
    requires_clinical_trials: bool
    """Whether the research aim requires clinical trials."""
    files: dict[str, str] | None
    """Mapping of file names to file URLs that the user uploaded for the research aim."""
    tasks: list[ResearchTaskDTO]
    """The tasks associated with the research aim."""


class RagRequest(TypedDict):
    """DTO for a RAG request."""

    funding_organization_name: str
    """The name of the funding organization."""
    cfp_action_code: str
    """The call for proposals action code."""
    application_title: str
    """The title of the application."""
    significance_text: str
    """The input the user gave for application significance."""
    significance_files: dict[str, str] | None
    """Mapping of file names to file URLs that the user uploaded for application significance."""
    innovation_text: str
    """The input the user gave for application innovation."""
    innovation_files: dict[str, str] | None
    """Mapping of file names to file URLs that the user uploaded for application innovation."""
    research_aims: list[ResearchAimDTO]
    """The research aims associated with the application."""


class RagResponse(TypedDict):
    """DTO for an API response."""

    data: str
    """The data of the response."""
