from typing import NotRequired, TypedDict

from db.src.json_objects import TableContext


class DocumentDTO(TypedDict):
    content: str
    page_number: NotRequired[int]
    element_type: NotRequired[str]
    parent: NotRequired[str]
    table_context: NotRequired[TableContext]
    role: NotRequired[str]
    languages: NotRequired[list[str]]
    confidence: NotRequired[float]


class GenerationResultDTO(TypedDict):
    text: str
    is_complete: bool
