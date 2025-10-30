from typing import Literal, NotRequired, TypedDict

from packages.db.src.json_objects import LengthConstraint, TableContext


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
    length_constraint: NotRequired[LengthConstraint | None]
    type: Literal["task", "objective"]


class RelationshipPair(TypedDict):
    relation_type: str
    target_entity: str


class RelationshipsData(TypedDict):
    relationships: dict[str, list[RelationshipPair]]


class EnrichmentData(TypedDict):
    technical_terms: NotRequired[list[str]]
    research_questions: NotRequired[list[str]]
    context: NotRequired[str]
    search_queries: NotRequired[list[str]]


class RedTeamReviewDTO(TypedDict):
    review: str


class SentenceChangeDTO(TypedDict):
    original: str
    revised: str
    reason: str
    section: str


class SelectiveEditsDTO(TypedDict):
    changes: list[SentenceChangeDTO]
    rejected: int
    summary: str


class EditorialTimingDTO(TypedDict):
    elapsed_ms: int
    review_ms: int
    editing_ms: int
    apply_ms: int


class EditorialStatsDTO(TypedDict):
    review_words: int
    original_words: int
    edited_words: int
    word_change: int
    approved: int
    rejected: int
    total: int
    approval_rate: float


class EditorialMetadataDTO(TypedDict):
    review: str
    edits: SelectiveEditsDTO
    timing: EditorialTimingDTO
    stats: EditorialStatsDTO
