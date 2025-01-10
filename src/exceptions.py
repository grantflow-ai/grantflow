from json import dumps
from typing import Any


class BackendError(Exception):
    """Raised when an internal error occurs."""

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


class FileParsingError(BackendError):
    """Raised when an error occurs during parsing."""


class ExternalOperationError(BackendError):
    """Raised when an HTTP request to a remote system fails."""


class ValidationError(BackendError):
    """Raised when a validation error occurs."""


class SerializationError(BackendError):
    """Raised when an error occurs during serialization."""


class DeserializationError(BackendError):
    """Raised when an error occurs during deserialization."""


class DatabaseError(BackendError):
    """Raised when an error occurs during database operations."""
