from __future__ import annotations

from typing import NotRequired

from typing_extensions import TypedDict


class APIError(TypedDict):
    """DTO for an API error."""

    message: str
    """The error message."""
    details: NotRequired[str]
    """The error details."""
