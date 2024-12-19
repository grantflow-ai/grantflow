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


class ApplicationDraftProcessingResponse(TypedDict):
    """The response schema for an application draft in processing state."""

    id: str
    """The ID of the grant application draft."""
    status: Literal["generating"]
    """The status of the grant application draft."""


class ApplicationDraftCompleteResponse(TypedDict):
    """The response schema for a completed application draft."""

    id: str
    """The ID of the grant application draft."""
    status: Literal["complete"]
    """The status of the grant application draft."""
    text: str


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
    description: str | None
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class UpdateWorkspaceRequestBody(TypedDict):
    """The request body for updating a workspace."""

    name: NotRequired[str]
    """The name of the workspace."""
    description: NotRequired[str | None]
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class WorkspaceIdResponse(TypedDict):
    """The response schema for retrieving a workspace ID."""

    id: str
    """The ID of the workspace."""


class WorkspaceBaseResponse(WorkspaceIdResponse):
    """Base response for retrieving workspaces."""

    name: str
    """The name of the workspace."""
    description: str | None
    """The description of the workspace."""
    logo_url: str | None
    """The URL of the workspace logo."""
    role: UserRoleEnum
    """The role of the user in the workspace."""


class WorkspaceFullResponse(WorkspaceBaseResponse):
    """The response body for retrieving a workspace with applications."""

    applications: list["ApplicationBaseResponse"]


# Application API Types
class CreateApplicationRequestBody(TypedDict):
    """The request body for creating an application."""

    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: str | None
    """The significance of the innovation."""
    innovation: str | None
    """The innovation."""
    research_aims: list["CreateResearchAimRequestBody"]
    """The research aims of the application."""


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
    research_aims: NotRequired[list["CreateResearchAimRequestBody"]]
    """The research aims of the application."""


class ApplicationIdResponse(TypedDict):
    """The base response containing only the application ID."""

    id: str
    """The ID of the application."""


class ApplicationBaseResponse(ApplicationIdResponse):
    """The base response body for application endpoints, extending ApplicationIdResponse with title and CFP details."""

    title: str
    """The title of the application."""
    cfp: CfpResponse
    """The CFP of the application."""
    text: str | None


class ApplicationFullResponse(ApplicationBaseResponse):
    """The detailed response body for retrieving a complete application."""

    significance: str | None
    """The significance of the innovation."""
    innovation: str | None
    """The innovation."""
    research_aims: list["ResearchAimResponse"]
    """The research aims of the application."""
    files: list["ApplicationFileResponse"]
    """The application files of the application."""


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


# Research Aims and Tasks API Types


class CreateResearchTaskRequestBody(TypedDict):
    """The request body for creating a research task."""

    description: str | None
    """The description of the task."""
    task_number: int
    """The number of the task."""
    title: str
    """The title of the task."""


class CreateResearchAimRequestBody(TypedDict):
    """The request body for creating a research aim."""

    aim_number: int
    """The number of the aim."""
    description: str | None
    """The description of the aim."""
    requires_clinical_trials: bool
    """Whether the aim requires clinical trials."""
    research_tasks: list[CreateResearchTaskRequestBody]
    """The research tasks of the aim."""
    title: str
    """The title of the aim."""


class UpdateResearchTaskRequestBody(TypedDict):
    """The request body for updating a research task."""

    task_number: NotRequired[int]
    """The number of the task."""
    description: NotRequired[str | None]
    """The description of the task."""
    title: NotRequired[str]
    """The title of the task."""


class UpdateResearchAimRequestBody(TypedDict):
    """The request body for updating a research aim."""

    aim_number: NotRequired[int]
    """The number of the aim."""
    description: NotRequired[str | None]
    """The description of the aim."""
    requires_clinical_trials: NotRequired[bool]
    """Whether the aim requires clinical trials."""
    title: NotRequired[str]
    """The title of the aim."""


class ResearchTaskResponse(TypedDict):
    """The response body for retrieving a research task."""

    id: str
    """The ID of the research task."""
    task_number: int
    """The number of the task."""
    description: str
    """The description of the task."""
    title: str
    """The title of the task."""


class ResearchAimResponse(TypedDict):
    """The response body for retrieving a research aim."""

    id: str
    """The ID of the research aim."""
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


# User API Types
class OTPResponse(TypedDict):
    """The response body for the OTP endpoint."""

    otp: str
    """The otp identifying the user."""


class LoginRequestBody(TypedDict):
    """The request body for the login endpoint."""

    id_token: str
    """The ID token from Firebase."""


class LoginResponse(TypedDict):
    """The response body for the login endpoint."""

    jwt_token: str
    """The JWT token identifying the user."""
