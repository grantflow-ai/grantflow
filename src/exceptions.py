from typing import Any


class BackendError(Exception):
    """Raised when an internal error occurs."""

    context: Any
    """The context of the error."""

    def __init__(self, message: str, context: Any = None) -> None:
        self.context = context
        super().__init__(message)

    def __str__(self) -> str:
        """Return a string representation of the exception."""
        from src.utils.serialization import serialize

        ctx = f"\n\nContext: {serialize(self.context).decode()}" if self.context else ""

        return f"{self.__class__.__name__}: {super().__str__()}{ctx}"

    def __repr__(self) -> str:
        """Return a string representation of the exception."""
        return self.__str__()


class FileParsingError(BackendError):
    """Raised when an error occurs during parsing."""


class InternalOperationError(BackendError):
    """Raised when an internal operation fails."""


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


class RagProcessingError(BackendError):
    """Raised when an error occurs during RAG processing."""

    def __init__(self, message: str, context: Any = None, *, step: str | None = None) -> None:
        if step and context:
            if isinstance(context, dict):
                context["rag_processing_step"] = step
            else:
                context = {"original_context": context, "rag_processing_step": step}
        elif step:
            context = {"rag_processing_step": step}

        super().__init__(message, context)
