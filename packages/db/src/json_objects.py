from typing import Literal, NotRequired, TypedDict

from packages.db.src.enums import GrantTemplateStageEnum


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


class ResearchObjective(TypedDict):
    number: int
    title: str
    description: NotRequired[str]
    research_tasks: list[ResearchTask]


class OrganizationNamespace(TypedDict):
    id: str
    full_name: str
    abbreviation: str


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class CFPAnalysisRequirementWithQuote(TypedDict):
    requirement: str
    quote_from_source: str
    category: str


class CFPConstraint(TypedDict):
    constraint_type: str
    constraint_value: str
    source_quote: str


class GrantElement(TypedDict):
    id: str
    order: int
    title: str
    evidence: str
    parent_id: str | None
    needs_applicant_writing: NotRequired[bool]


class GrantLongFormSection(GrantElement):
    depends_on: list[str]
    generation_instructions: str
    is_clinical_trial: bool | None
    is_detailed_research_plan: bool | None
    keywords: list[str]
    max_words: int
    search_queries: list[str]
    topics: list[str]
    requirements: NotRequired[list["CFPAnalysisRequirementWithQuote"]]
    guidelines: NotRequired[list[str]]
    length_limit: NotRequired[int | None]
    length_source: NotRequired[str | None]
    other_limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]


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


class GrantTemplateRagJobCheckpoint(TypedDict):
    stage: GrantTemplateStageEnum
    cfp_subject: str
    title: str
    subtitles: list[str]
    organization_id: NotRequired[str | None]
    submission_date: NotRequired[str | None]


class CFPAnalysisConstraint(TypedDict):
    type: str
    value: str


class CFPSection(TypedDict):
    id: str
    title: str
    parent_id: NotRequired[str | None]
    constraints: NotRequired[list[CFPAnalysisConstraint]]


class CFPAnalysis(TypedDict):
    subject: str
    content: list[CFPSection]
    deadlines: list[str]
    global_constraints: list[CFPAnalysisConstraint]
    organization: NotRequired[OrganizationNamespace | None]
