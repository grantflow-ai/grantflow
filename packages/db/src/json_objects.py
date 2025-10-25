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
    guidelines: NotRequired[str]


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class CFPAnalysisRequirementWithQuote(TypedDict):
    requirement: str
    quote_from_source: str
    category: str


class LengthConstraint(TypedDict):
    type: Literal["words", "characters"]
    value: int
    source: str | None


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
    search_queries: list[str]
    topics: list[str]
    requirements: NotRequired[list["CFPAnalysisRequirementWithQuote"]]
    guidelines: NotRequired[list[str]]
    length_constraint: NotRequired[LengthConstraint | None]
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


class TranslationalResearchDeepDive(TypedDict):
    unmet_need_context: NotRequired[str]
    core_concept: NotRequired[str]
    translational_potential: NotRequired[str]
    unique_approach: NotRequired[str]
    translational_impact: NotRequired[str]
    team_translation_capability: NotRequired[str]
    commercialization_plan: NotRequired[str]
    proof_of_concept: NotRequired[str]


class GrantTemplateRagJobCheckpoint(TypedDict):
    stage: GrantTemplateStageEnum
    cfp_subject: str
    title: str
    subtitles: list[str]
    organization_id: NotRequired[str | None]
    submission_date: NotRequired[str | None]


CFPAnalysisCategory = Literal["research", "budget", "team", "compliance", "other"]


class CFPSection(TypedDict):
    id: str
    title: str
    parent_id: NotRequired[str | None]
    length_constraint: NotRequired[LengthConstraint | None]
    categories: NotRequired[list[CFPAnalysisCategory]]


class CFPAnalysis(TypedDict):
    subject: str
    sections: list[CFPSection]
    deadlines: list[str]
    global_constraints: list[LengthConstraint]
    organization: NotRequired[OrganizationNamespace | None]
