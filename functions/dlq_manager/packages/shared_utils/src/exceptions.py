from typing import Any


class ErrorCategory:
    """Error categories for DLQ manager decision making."""

    USER_ERROR = "user_error"  # Not retriable, already communicated to user
    RETRIABLE = "retriable"  # Temporary failure, should retry
    INFRASTRUCTURE = "infrastructure"  # Needs alert and manual intervention


class BackendError(Exception):
    """Base exception for all backend errors."""

    context: Any
    category: str = ErrorCategory.RETRIABLE  # Default to retriable for safety

    def __init__(self, message: str, context: Any = None) -> None:
        self.context = context
        super().__init__(message)

    def __str__(self) -> str:
        from packages.shared_utils.src.serialization import serialize

        ctx = f"\n\nContext: {serialize(self.context).decode()}" if self.context else ""

        return f"{self.__class__.__name__}: {super().__str__()}{ctx}"

    def __repr__(self) -> str:
        return self.__str__()


class FileParsingError(BackendError):
    """File parsing errors - user uploaded invalid/corrupted file."""

    category = ErrorCategory.USER_ERROR


class UrlParsingError(BackendError):
    """URL parsing errors - user provided invalid URL."""

    category = ErrorCategory.USER_ERROR


class ExternalOperationError(BackendError):
    """External service failures - GCS, embeddings API, etc."""

    category = ErrorCategory.RETRIABLE


class ValidationError(BackendError):
    """Validation errors - missing data, invalid state."""

    category = ErrorCategory.USER_ERROR


class InsufficientContextError(BackendError):
    """Insufficient context for RAG - user needs to upload more documents."""

    category = ErrorCategory.USER_ERROR


class EvaluationError(BackendError):
    """Quality evaluation errors - potentially infrastructure."""

    category = ErrorCategory.INFRASTRUCTURE


class SerializationError(BackendError):
    """Serialization errors - code bug."""

    category = ErrorCategory.INFRASTRUCTURE


class DeserializationError(BackendError):
    """Deserialization errors - invalid message format."""

    category = ErrorCategory.USER_ERROR


class DatabaseError(BackendError):
    """Database errors - connection issues, constraints."""

    category = ErrorCategory.RETRIABLE


class RagError(BackendError):
    """Generic RAG processing errors."""

    category = ErrorCategory.RETRIABLE


class RagJobCancelledError(BackendError):
    """User cancelled RAG job."""

    category = ErrorCategory.USER_ERROR


class LLMTimeoutError(BackendError):
    """LLM API timeout - OpenAI, Anthropic, Vertex."""

    category = ErrorCategory.RETRIABLE
