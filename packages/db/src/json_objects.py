from typing import NotRequired, TypedDict

from services.rag.src.enums import GrantTemplateStageEnum


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


class GrantElement(TypedDict):
    id: str
    order: int
    title: str
    parent_id: str | None


class GrantLongFormSection(GrantElement):
    depends_on: list[str]
    generation_instructions: str
    is_clinical_trial: bool | None
    is_detailed_research_plan: bool | None
    keywords: list[str]
    max_words: int
    search_queries: list[str]
    topics: list[str]


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


class CFPAnalysisRequirementWithQuote(TypedDict):
    requirement: str
    quote_from_source: str
    category: str


class CFPSectionRequirement(TypedDict):
    section_name: str
    definition: str
    requirements: list[CFPAnalysisRequirementWithQuote]
    dependencies: list[str]


class CFPSectionLengthConstraint(TypedDict):
    section_name: str
    measurement_type: str
    limit_description: str
    quote_from_source: str
    exclusions: list[str]


class CFPAnalysisEvaluationCriterion(TypedDict):
    criterion_name: str
    description: str
    weight_percentage: NotRequired[int | None]
    quote_from_source: str


class CategorizationAnalysisResult(TypedDict):
    money: list[str]
    date_time: list[str]
    writing_related: list[str]
    other_numbers: list[str]
    recommendations: list[str]
    orders: list[str]
    positive_instructions: list[str]
    negative_instructions: list[str]
    evaluation_criteria: list[str]


class CFPAnalysisMetadata(TypedDict):
    content_length: int
    categories_found: int
    total_sentences: int


class CFPSectionAnalysis(TypedDict):
    required_sections: list[CFPSectionRequirement]
    length_constraints: list[CFPSectionLengthConstraint]
    evaluation_criteria: list[CFPAnalysisEvaluationCriterion]
    additional_requirements: list[CFPAnalysisRequirementWithQuote]
    sections_count: int
    length_constraints_found: int
    evaluation_criteria_count: int
    error: NotRequired[str | None]


class CFPAnalysisResult(TypedDict):
    cfp_analysis: CFPSectionAnalysis
    nlp_analysis: CategorizationAnalysisResult
    analysis_metadata: CFPAnalysisMetadata
