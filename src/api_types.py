from types import SimpleNamespace
from typing import Any, Literal, NotRequired, TypedDict

from sanic import Request, Sanic
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import UserRoleEnum
from src.db.json_objects import ResearchObjective


class RequestContext(SimpleNamespace):
    """The context of an API request."""

    firebase_uid: str
    """The Firebase User ID."""

    session_maker: async_sessionmaker[Any]
    """The session maker."""


APIRequest = Request[Sanic[Any, RequestContext], RequestContext]


class TableIdResponse(TypedDict):
    """A base response containing only a row ID."""

    id: str
    """The ID of the application."""


# Organization API Types
class CreateOrganizationRequestBody(TypedDict):
    """The request body for creating a funding organization."""

    full_name: str
    abbreviation: str | None


class UpdateOrganizationRequestBody(TypedDict):
    """The request body for updating a funding organization."""

    full_name: NotRequired[str]
    abbreviation: NotRequired[str | None]


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


class WorkspaceBaseResponse(TableIdResponse):
    """Base response for retrieving workspaces."""

    name: str
    """The name of the workspace."""
    description: str | None
    """The description of the workspace."""
    logo_url: str | None
    """The URL of the workspace logo."""
    role: UserRoleEnum
    """The role of the user in the workspace."""


# Application API Types
class CreateApplicationRequestBody(TypedDict):
    """The request body for creating an application."""

    title: str
    """The title of the application."""
    cfp_url: NotRequired[str]
    """Grant CFP URL."""


class UpdateApplicationRequestBody(TypedDict):
    """The request body for updating an application."""

    title: NotRequired[str]
    """The title of the application."""
    research_objectives: NotRequired[list[ResearchObjective]]
    """The research objectives of the application."""


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


# Auth API Types
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
