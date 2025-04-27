from dataclasses import dataclass
from typing import Any, Literal, TypedDict


class GrantSectionDTO(TypedDict):
    name: str
    content: str


@dataclass
class WebsocketInfoMessage:
    event: str
    type: Literal["info"]
    content: str


@dataclass
class WebsocketErrorMessage:
    event: str
    type: Literal["error"]
    content: str
    context: dict[str, Any] | str | None = None


@dataclass
class WebsocketDataMessage:
    event: str
    type: Literal["data"]
    content: dict[str, Any]
    message: str | None = None
