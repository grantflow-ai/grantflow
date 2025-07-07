from typing import Any, Literal, NotRequired, TypedDict

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


class AutofillRequestDTO(TypedDict):
    parent_type: Literal["grant_application"]
    parent_id: str
    autofill_type: Literal["research_plan", "research_deep_dive"]
    field_name: NotRequired[str]
    context: NotRequired[dict[str, Any]]
    trace_id: NotRequired[str]


class AutofillResponseDTO(TypedDict):
    success: bool
    data: dict[str, Any]
    field_name: NotRequired[str]
    error: NotRequired[str]
