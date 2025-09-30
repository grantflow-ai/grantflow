from typing import NotRequired, TypedDict
from uuid import UUID

from packages.db.src.json_objects import Chunk


class VectorDTO(TypedDict):
    chunk: Chunk
    embedding: list[float]
    rag_source_id: str


class ExtractedSectionDTO(TypedDict):
    title: str
    id: str
    order: int
    parent_id: NotRequired[str | None]
    is_detailed_research_plan: NotRequired[bool | None]
    is_title_only: NotRequired[bool | None]
    is_clinical_trial: NotRequired[bool | None]
    is_long_form: bool
    cfp_source_reference: NotRequired[str | None]
    cfp_requirements: NotRequired[list[dict[str, str]] | None]
    cfp_length_limit: NotRequired[int | None]
    cfp_length_source: NotRequired[str | None]
    cfp_other_limits: NotRequired[list[dict[str, str]] | None]
    cfp_definition: NotRequired[str | None]
    needs_applicant_writing: NotRequired[bool | None]


class SectionMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    depends_on: list[str]
    max_words: int
    search_queries: list[str]


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    cfp_subject: str
    submission_date: str | None
    content: list[CFPContentSection]
    error: NotRequired[str | None]


class OrganizationNamespace(TypedDict):
    full_name: str
    abbreviation: str
    organization_id: UUID
