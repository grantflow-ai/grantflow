from typing import Any


class BackendError(Exception):
    context: Any

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
    pass


class UrlParsingError(BackendError):
    pass


class ExternalOperationError(BackendError):
    pass


class ValidationError(BackendError):
    pass


class InsufficientContextError(BackendError):
    pass


class EvaluationError(BackendError):
    pass


class SerializationError(BackendError):
    pass


class DeserializationError(BackendError):
    pass


class DatabaseError(BackendError):
    pass


class RagError(BackendError):
    pass


class RagJobCancelledError(BackendError):
    pass


class LLMTimeoutError(BackendError):
    """Raised when LLM API calls timeout."""
    pass
