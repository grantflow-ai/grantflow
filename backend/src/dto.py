from typing import NotRequired, TypedDict

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
