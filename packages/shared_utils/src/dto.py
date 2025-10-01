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
    organization_id: str | None
    cfp_subject: str
    submission_date: str | None
    content: list[CFPContentSection]
    error: NotRequired[str | None]


class ExtractedSectionDTO(TypedDict):
    title: str
    id: str
    order: int
    evidence: str
    parent_id: NotRequired[str | None]
    is_detailed_research_plan: NotRequired[bool | None]
    is_title_only: NotRequired[bool | None]
    is_clinical_trial: NotRequired[bool | None]
    is_long_form: bool
    requirements: NotRequired[list[CFPAnalysisRequirementWithQuote]]
    length_limit: NotRequired[int | None]
    length_source: NotRequired[str | None]
    other_limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]
    needs_applicant_writing: NotRequired[bool | None]


class SectionMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    depends_on: list[str]
    max_words: int
    search_queries: list[str]
