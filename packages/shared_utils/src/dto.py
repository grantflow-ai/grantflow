from typing import NotRequired, TypedDict
from uuid import UUID

from packages.db.src.json_objects import (
    CFPAnalysisRequirementWithQuote,
    CFPConstraint,
    Chunk,
)


class VectorDTO(TypedDict):
    chunk: Chunk
    embedding: list[float]
    rag_source_id: str


class OrganizationNamespace(TypedDict):
    full_name: str
    abbreviation: str
    organization_id: UUID


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    """Optimized CFP extraction DTO with short property names for Gemini."""

    org_id: str | None  # Optimized from organization_id
    subject: str  # Optimized from cfp_subject
    deadline: str | None  # Optimized from submission_date
    content: list[CFPContentSection]
    full_text: str
    error: NotRequired[str | None]


class ExtractedSectionDTO(TypedDict):
    """Optimized section extraction DTO with short property names for Gemini."""

    title: str
    id: str
    order: int
    evidence: str
    parent: NotRequired[str | None]  # Optimized from parent_id
    is_plan: NotRequired[bool | None]  # Optimized from is_detailed_research_plan
    title_only: NotRequired[bool | None]  # Optimized from is_title_only
    clinical: NotRequired[bool | None]  # Optimized from is_clinical_trial
    long_form: bool  # Optimized from is_long_form
    requirements: NotRequired[list[CFPAnalysisRequirementWithQuote]]
    max_words: NotRequired[int | None]  # Optimized from length_limit
    source: NotRequired[str | None]  # Optimized from length_source
    limits: NotRequired[list[CFPConstraint]]  # Optimized from other_limits
    definition: NotRequired[str | None]
    needs_writing: NotRequired[bool | None]  # Optimized from needs_applicant_writing


class SectionMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    depends_on: list[str]
    max_words: int
    search_queries: list[str]
