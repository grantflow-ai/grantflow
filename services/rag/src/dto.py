from typing import Literal, NotRequired, TypedDict

from packages.db.src.json_objects import TableContext


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


class ResearchComponentGenerationDTO(TypedDict):
    number: str
    title: str
    description: str
    instructions: str
    guiding_questions: list[str]
    search_queries: list[str]
    relationships: list[tuple[str, str]]
    max_words: NotRequired[int]
    type: Literal["task", "objective"]
