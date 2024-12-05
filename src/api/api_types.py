from types import SimpleNamespace
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from sanic import Request, Sanic
from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]


class RequestContext(SimpleNamespace):
    """The context of an API request."""

    firebase_uid: str
    """The Firebase User ID."""

    session_maker: async_sessionmaker[Any]
    """The session maker."""


APIRequest = Request[Sanic[Any, RequestContext], RequestContext]


class ApplicationDraftGenerationResponse(TypedDict):
    """The body of a message containing the result of generating a grant application draft."""

    content: str
    """The generated content."""
    duration: int
    """The total duration of the generation process."""


class CreateWorkspaceRequestBody(TypedDict):
    """The request body for creating a workspace."""

    name: str
    """The name of the workspace."""
    description: NotRequired[str | None]
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class CreateWorkspaceResponse(TypedDict):
    """The response body for creating a workspace."""

    workspace_id: str
    """The ID of the created workspace."""


class RetrieveWorkspaceBaseResponse(TypedDict):
    """The response body for retrieving a workspace."""

    id: str
    """The ID of the workspace."""
    name: str
    """The name of the workspace."""
    description: NotRequired[str | None]
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class UpdateWorkspaceRequestBody(TypedDict):
    """The request body for creating a workspace."""

    name: NotRequired[str]
    """The name of the workspace."""
    description: NotRequired[str | None]
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class RetrieveCfpResponse(TypedDict):
    """Response schema for retrieving a CFP."""

    id: str
    """The ID of the CFP."""
    allow_clinical_trials: bool
    """Whether clinical trials are allowed."""
    allow_resubmissions: bool
    """Whether resubmissions are allowed."""
    category: str | None
    """The category of the CFP."""
    code: str
    """The code of the CFP."""
    description: str | None
    """The description of the CFP."""
    title: str
    """The title of the CFP."""
    url: str | None
    """The URL of the CFP."""
    funding_organization_id: str
    """The ID of the funding organization."""
    funding_organization_name: str
    """The name of the funding organization."""


class CreateApplicationRequestBody(TypedDict):
    """The request body for creating an application."""

    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: NotRequired[str | None]
    """The significance of the innovation."""
    innovation: NotRequired[str | None]
    """The innovation."""


class CreateApplicationResponse(TypedDict):
    """The response body for creating an application."""

    application_id: str
    """The ID of the application."""


class UpdateApplicationRequestBody(TypedDict):
    """The request body for updating an application."""

    title: NotRequired[str]
    """The title of the application."""
    cfp_id: NotRequired[str]
    """The ID of the CFP."""
    significance: NotRequired[str | None]
    """The significance of the innovation."""
    innovation: NotRequired[str | None]
    """The innovation."""


class RetrieveApplicationBaseResponseBody(TypedDict):
    """The base response body for retrieving an application."""

    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: str | None
    """The significance of the innovation."""
    innovation: str | None
    """The innovation."""


class CreateResearchTaskRequestBody(TypedDict):
    """The request body for creating a research_task."""

    description: str
    """The description of the task."""
    task_number: int
    """The number of the task."""
    title: str
    """The title of the task."""


class CreateResearchAimRequestBody(TypedDict):
    """The request body for creating a research_aim."""

    aim_number: int
    """The number of the aim."""
    description: str
    """The description of the aim."""
    requires_clinical_trials: bool
    """Whether the aim requires clinical trials."""
    research_tasks: list[CreateResearchTaskRequestBody]
    """The research tasks of the aim."""
    title: str
    """The title of the aim."""


class ResearchTaskResponse(CreateResearchTaskRequestBody):
    """The response body for creating a research_task."""

    id: UUID
    """The ID of the research_task."""


class ResearchAimResponse(CreateResearchAimRequestBody):
    """The response body for creating a research_aim."""

    id: UUID
    """The ID of the research_aim."""
    research_tasks: list[ResearchTaskResponse]  # type: ignore[misc]


class UpdateResearchTaskRequestBody(TypedDict):
    """The request body for updating a research_task."""

    task_number: NotRequired[int]
    """The number of the task."""
    description: NotRequired[str]
    """The description of the task."""
    title: NotRequired[str]
    """The title of the task."""


class UpdateResearchAimRequestBody(TypedDict):
    """The request body for updating a research_aim."""

    aim_number: NotRequired[int]
    """The number of the aim."""
    description: NotRequired[str]
    """The description of the aim."""
    requires_clinical_trials: NotRequired[bool]
    """Whether the aim requires clinical trials."""
    title: NotRequired[str]
    """The title of the aim."""
