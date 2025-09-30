from typing import Any


class ErrorCategory:
    USER_ERROR = "user_error"
    RETRIABLE = "retriable"
    INFRASTRUCTURE = "infrastructure"


class BackendError(Exception):
    context: Any
    category: str = ErrorCategory.RETRIABLE

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
    category = ErrorCategory.USER_ERROR


class UrlParsingError(BackendError):
    category = ErrorCategory.USER_ERROR


class ExternalOperationError(BackendError):
    category = ErrorCategory.RETRIABLE


class ValidationError(BackendError):
    category = ErrorCategory.USER_ERROR


class InsufficientContextError(BackendError):
    category = ErrorCategory.USER_ERROR


class EvaluationError(BackendError):
    category = ErrorCategory.INFRASTRUCTURE


class SerializationError(BackendError):
    category = ErrorCategory.INFRASTRUCTURE


class DeserializationError(BackendError):
    category = ErrorCategory.USER_ERROR


class DatabaseError(BackendError):
    category = ErrorCategory.RETRIABLE


class RagError(BackendError):
    category = ErrorCategory.RETRIABLE


class RagJobCancelledError(BackendError):
    category = ErrorCategory.USER_ERROR


class LLMTimeoutError(BackendError):
    category = ErrorCategory.RETRIABLE
