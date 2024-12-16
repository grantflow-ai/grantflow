from types import SimpleNamespace
from typing import Any, Literal, NotRequired, TypedDict

from sanic import Request, Sanic
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import UserRoleEnum


class RequestContext(SimpleNamespace):
    """The context of an API request."""

    firebase_uid: str
    """The Firebase User ID."""

    session_maker: async_sessionmaker[Any]
    """The session maker."""


APIRequest = Request[Sanic[Any, RequestContext], RequestContext]


# Drafts API Types


class ApplicationDraftCreateResponse(TypedDict):
    """The response schema for creating an application draft."""

    id: str
    """The ID of the grant application draft."""


class ApplicationDraftProcessingResponse(TypedDict):
    """The response schema for creating an application draft."""

    id: str
    """The ID of the grant application draft."""
    status: Literal["generating"]
    """The status of the grant application draft."""


class ApplicationDraftCompleteResponse(TypedDict):
    """The response schema for creating an application draft."""

    id: str
    """The ID of the grant application draft."""
    status: Literal["complete"]
    """The status of the grant application draft."""
    text: str


# ApplicationFiles API Types


class ApplicationFileResponse(TypedDict):
    """The response schema for retrieving an application file."""

    id: str
    """The ID of the file."""
    name: str
    """The name of the file."""
    type: str
    """The type of the file."""
    size: int
    """The size of the file."""


# CFP API Types


class CfpResponse(TypedDict):
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


# Workspace API Types


class CreateWorkspaceRequestBody(TypedDict):
    """The request body for creating a workspace."""

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


class WorkspaceResponse(TypedDict):
    """The response body for creating a workspace."""

    id: str
    """The ID of the created workspace."""
    name: str
    """The name of the workspace."""
    description: str | None
    """The description of the workspace."""
    logo_url: str | None
    """The URL of the workspace logo."""
    role: UserRoleEnum
    """The role of the user in the workspace."""


# Application API Types


class CreateGrantApplicationRequestBody(TypedDict):
    """The request body for creating an application."""

    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: NotRequired[str | None]
    """The significance of the innovation."""
    innovation: NotRequired[str | None]
    """The innovation."""


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


class GrantApplicationResponse(TypedDict):
    """The response body for creating an application."""

    id: str
    """The ID of the application."""
    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: str | None
    """The significance of the innovation."""
    innovation: str | None
    """The innovation."""


class GrantApplicationDetailResponse(TypedDict):
    """The response body for retrieving an application."""

    id: str
    """The ID of the application."""
    title: str
    """The title of the application."""
    significance: str | None
    """The significance of the innovation."""
    innovation: str | None
    """The innovation."""
    cfp: CfpResponse
    """The CFP of the application."""
    research_aims: list["ResearchAimResponse"]
    """The research aims of the application."""
    application_files: list[ApplicationFileResponse]
    """The application files of the application."""


# Research Aims API Types


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


class ResearchTaskResponse(TypedDict):
    """The response body for creating a research_task."""

    id: str
    """The ID of the research_task."""
    task_number: int
    """The number of the task."""
    description: str
    """The description of the task."""
    title: str
    """The title of the task."""


class ResearchAimResponse(TypedDict):
    """The response body for creating a research_aim."""

    id: str
    """The ID of the research_aim."""
    aim_number: int
    """The number of the aim."""
    description: str
    """The description of the aim."""
    requires_clinical_trials: bool
    """Whether the aim requires clinical trials."""
    title: str
    """The title of the aim."""
    research_tasks: list[ResearchTaskResponse]
    """The research tasks of the aim."""


class LoginRequestBody(TypedDict):
    """The request body for the login endpoint."""

    id_token: str
    """The ID token from Firebase."""


class LoginResponse(TypedDict):
    """The request body for the login endpoint."""

    jwt_token: str
    """The JWT token identifying the user."""


class OTPResponse(TypedDict):
    """The request body for the login endpoint."""

    otp: str
    """The otp identifying the user."""
