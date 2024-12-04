from types import SimpleNamespace
from typing import Any, NotRequired, TypedDict

from sanic import Request, Sanic
from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]


class RequestContext(SimpleNamespace):
    """The context of an API request."""

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
