from typing import NotRequired, TypedDict


class TableContext(TypedDict):
    row_index: int | None
    column_index: int | None
    table_dimensions: str | None


class Chunk(TypedDict):
    content: str
    page_number: NotRequired[int]


class ResearchTask(TypedDict):
    number: int
    title: str
    description: NotRequired[str]
    relationships: NotRequired[list[dict[str, str]]]


class ResearchObjective(TypedDict):
    number: int
    title: str
    description: NotRequired[str]
    research_tasks: list[ResearchTask]


class GrantElement(TypedDict):
    id: str
    order: int
    title: str
    parent_id: str | None


class GrantLongFormSection(GrantElement):
    depends_on: list[str]
    generation_instructions: str
    is_clinical_trial: bool | None
    is_detailed_workplan: bool | None
    keywords: list[str]
    max_words: int
    search_queries: list[str]
    topics: list[str]


class ResearchDeepDive(TypedDict):
    background_context: NotRequired[str]
    hypothesis: NotRequired[str]
    rationale: NotRequired[str]
    novelty_and_innovation: NotRequired[str]
    team_excellence: NotRequired[str]
    preliminary_data: NotRequired[str]
    research_feasibility: NotRequired[str]
    impact: NotRequired[str]
    scientific_infrastructure: NotRequired[str]
