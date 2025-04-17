from typing import Any


class BackendError(Exception):
    """Raised when an internal error occurs."""

    context: Any

    def __init__(self, message: str, context: Any = None) -> None:
        self.context = context
        super().__init__(message)

    def __str__(self) -> str:
        from src.utils.serialization import serialize

        ctx = f"\n\nContext: {serialize(self.context).decode()}" if self.context else ""

        return f"{self.__class__.__name__}: {super().__str__()}{ctx}"

    def __repr__(self) -> str:
        return self.__str__()


class FileParsingError(BackendError):
    """Raised when an error occurs during parsing."""


class ExternalOperationError(BackendError):
    """Raised when an HTTP request to a remote system fails."""


class ValidationError(BackendError):
    """Raised when a validation error occurs."""


class InsufficientContextError(BackendError):
    """Raised when a insufficient input error occurs."""


class EvaluationError(BackendError):
    """Raised when an LLM response's evaluation fails."""


class SerializationError(BackendError):
    """Raised when an error occurs during serialization."""


class DeserializationError(BackendError):
    """Raised when an error occurs during deserialization."""


class DatabaseError(BackendError):
    """Raised when an error occurs during database operations."""


class RagError(BackendError):
    """Raised when an error occurs during RAG operations."""
