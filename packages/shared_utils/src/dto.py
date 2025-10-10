from typing import NotRequired, TypedDict

from packages.db.src.json_objects import CFPAnalysisRequirementWithQuote, CFPContentSection, Chunk, LengthConstraint


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
    guidelines: NotRequired[list[str]]
    length_constraint: NotRequired[LengthConstraint | None]
    definition: NotRequired[str | None]


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
    guidelines: NotRequired[list[str]]
    length_constraint: NotRequired[LengthConstraint | None]
    definition: NotRequired[str | None]
    needs_writing: NotRequired[bool | None]


class SectionMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    depends_on: list[str]
    search_queries: list[str]
