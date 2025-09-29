from typing import Literal, NotRequired, TypedDict

from packages.db.src.json_objects import (
    CFPAnalysisEvaluationCriterion,
    CFPAnalysisRequirementWithQuote,
    CFPSectionLengthConstraint,
    CFPSectionRequirement,
    TableContext,
)


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


# JSON Evaluation TypedDicts
class RelationshipPair(TypedDict):
    """Single relationship between entities."""

    relation_type: str
    target_entity: str


class RelationshipsData(TypedDict):
    """Relationships extracted from content."""

    relationships: dict[str, list[RelationshipPair]]


class EnrichmentData(TypedDict):
    """Enrichment data for objectives."""

    technical_terms: NotRequired[list[str]]
    research_questions: NotRequired[list[str]]
    context: NotRequired[str]
    search_queries: NotRequired[list[str]]


class CFPAnalysisData(TypedDict):
    """CFP analysis structured data."""

    requirements: NotRequired[list[CFPAnalysisRequirementWithQuote]]
    sections: NotRequired[list[CFPSectionRequirement]]
    evaluation_criteria: NotRequired[list[CFPAnalysisEvaluationCriterion]]
    length_constraints: NotRequired[list[CFPSectionLengthConstraint]]
