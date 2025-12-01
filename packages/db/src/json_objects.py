from typing import Literal, NotRequired, TypedDict

import msgspec

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


class ResearchDeepDive(msgspec.Struct, tag="RESEARCH"):
    background_context: str | None = None
    hypothesis: str | None = None
    rationale: str | None = None
    novelty_and_innovation: str | None = None
    team_excellence: str | None = None
    preliminary_data: str | None = None
    research_feasibility: str | None = None
    impact: str | None = None
    scientific_infrastructure: str | None = None


class TranslationalResearchDeepDive(msgspec.Struct, tag="TRANSLATIONAL"):
    unmet_need_context: str | None = None
    core_concept: str | None = None
    translational_potential: str | None = None
    unique_approach: str | None = None
    translational_impact: str | None = None
    team_translation_capability: str | None = None
    commercialization_plan: str | None = None
    proof_of_concept: str | None = None


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
    activity_code: NotRequired[str | None]


class ArgumentElement(TypedDict):
    id: int
    text: str
    context: str
    type: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class EvidenceElement(TypedDict):
    id: int
    text: str
    type: str
    supports: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class HypothesisElement(TypedDict):
    id: int
    text: str
    type: str
    testable: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class ConclusionElement(TypedDict):
    id: int
    text: str
    type: str
    based_on: str
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class ExperimentResultElement(TypedDict):
    id: int
    text: str
    experiment: str
    outcome: str
    significance: NotRequired[str]
    source: str
    temporal_context: str
    temporal_order: float
    action_type: str
    pivot: bool
    rhetorical_action: str
    hierarchy: str


class SourceElement(TypedDict):
    id: int
    text: str
    type: str
    relevance: str


class ObjectiveElement(TypedDict):
    id: int
    text: str
    scope: str
    expected_outcome: str
    type: str
    temporal_context: str
    temporal_order: float
    hierarchy: str


class TaskElement(TypedDict):
    id: int
    text: str
    action: str
    deliverable: str
    supports_objective: int
    depends_on: list[int]
    temporal_context: str
    temporal_order: float
    hierarchy: str


class AnalysisMetadata(TypedDict):
    total_arguments: int
    total_evidence: int
    total_hypotheses: int
    total_conclusions: int
    total_results: int
    total_sources: int
    total_objectives: int
    total_tasks: int
    article_type: str


class ScientificAnalysisResult(TypedDict):
    arguments: list[ArgumentElement]
    evidence: list[EvidenceElement]
    hypotheses: list[HypothesisElement]
    conclusions: list[ConclusionElement]
    experiment_results: list[ExperimentResultElement]
    sources: list[SourceElement]
    objectives: list[ObjectiveElement]
    tasks: list[TaskElement]
    metadata: AnalysisMetadata
