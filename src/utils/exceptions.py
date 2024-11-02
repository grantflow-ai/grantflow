from __future__ import annotations

from json import dumps
from typing import Any


class BackendError(Exception):
    """Raised when an internal error occurs."""


class OperationError(BackendError):
    """Base class for custom exceptions."""

    context: dict[str, Any] | str | None
    """The context of the error."""

    def __init__(self, message: str, context: dict[str, Any] | str | None = None) -> None:
        self.context = context
        super().__init__(message)

    def __str__(self) -> str:
        """Return a string representation of the exception."""
        return f"{self.__class__.__name__}: {super().__str__()}\n\nContext: {dumps(self.context, indent=2)}"

    def __repr__(self) -> str:
        """Return a string representation of the exception."""
        return f"{self.__class__.__name__}({super().__repr__()})\n\nContext: {dumps(self.context, indent=2)}"


class RequestFailureError(OperationError):
    """Raised when an HTTP request to a remote system fails."""

    status_code: int
    """The status code of the HTTP response."""

    def __init__(self, message: str, status_code: int, context: dict[str, Any] | str | None = None) -> None:
        self.status_code = status_code
        self.context = context
        super().__init__(message)


class MissingEnvVariableError(ValueError):
    """Raised when an environment variable is unset."""


class ValidationError(BackendError):
    """Raised when a validation error occurs."""


class OpenAIFailureError(OperationError):
    """Raised when an error occurs during an OpenAI API request."""


class DeserializationError(OperationError):
    """Raised when an error occurs during deserialization."""
