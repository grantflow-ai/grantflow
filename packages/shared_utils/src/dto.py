from typing import NotRequired, TypedDict
from uuid import UUID

from packages.db.src.json_objects import (
    CFPAnalysisRequirementWithQuote,
    CFPConstraint,
    CFPContentSection,
    Chunk,
    OrganizationNamespace,
)


class VectorDTO(TypedDict):
    chunk: Chunk
    embedding: list[float]
    rag_source_id: str


class ExtractedCFPData(TypedDict):
    org_id: str | None
    subject: str
    deadline: str | None
    content: list[CFPContentSection]
    text: str
    error: NotRequired[str | None]


class ExtractedSectionDTO(TypedDict):
    title: str
    id: str
    order: int
    parent: NotRequired[str | None]
    is_plan: NotRequired[bool | None]
    title_only: NotRequired[bool | None]
    clinical: NotRequired[bool | None]
    long_form: bool
    needs_writing: NotRequired[bool | None]


class ProcessedSectionDTO(TypedDict):
    title: str
    id: str
    order: int
    evidence: str
    parent: NotRequired[str | None]
    is_plan: NotRequired[bool | None]
    title_only: NotRequired[bool | None]
    clinical: NotRequired[bool | None]
    long_form: bool
    requirements: NotRequired[list[CFPAnalysisRequirementWithQuote]]
    max_words: NotRequired[int | None]
    source: NotRequired[str | None]
    limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]
    needs_writing: NotRequired[bool | None]


class SectionMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    depends_on: list[str]
    max_words: int
    search_queries: list[str]
