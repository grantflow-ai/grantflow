from dataclasses import dataclass
from typing import Any, Literal, NotRequired, TypedDict

from src.db.json_objects import Chunk


class APIError(TypedDict):
    message: str
    detail: NotRequired[str]


class VectorDTO(TypedDict):
    embedding: list[float]
    rag_file_id: str
    chunk: Chunk


class GrantSectionDTO(TypedDict):
    name: str
    content: str


@dataclass
class WebsocketMessage:
    """A message sent over a WebSocket connection."""

    type: Literal["data", "error", "info", "debug"]
    """The type of the message."""
    content: dict[str, Any] | str
    """The content of the message."""
    event: str
    """The event that triggered the message."""
    context: dict[str, Any] | str | None = None
    """Additional context."""

    def __post_init__(self) -> None:
        if self.type == "data" and isinstance(self.content, str):
            raise ValueError("Content must be a dictionary when type is 'data'")
