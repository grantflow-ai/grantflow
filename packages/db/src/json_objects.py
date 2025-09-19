from typing import Any, NotRequired, TypedDict


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


class RequirementWithQuote(TypedDict):
    requirement: str
    quote: str


class SectionRequirement(TypedDict):
    section: str
    requirements: list[RequirementWithQuote]


class LengthConstraint(TypedDict):
    description: str
    quote: str


class EvaluationCriterion(TypedDict):
    criterion: str
    quote: str


class CFPSectionAnalysis(TypedDict):
    section_requirements: list[SectionRequirement]
    length_constraints: list[LengthConstraint]
    evaluation_criteria: list[EvaluationCriterion]
    additional_requirements: list[RequirementWithQuote]


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    cfp_subject: str
    submission_date: str | None
    content: list[CFPContentSection]
    error: NotRequired[str | None]


class CFPAnalysisSnapshot(TypedDict):
    cfp_analysis: NotRequired[dict[str, Any] | None]
    nlp_analysis: NotRequired[dict[str, Any] | None]
    analysis_metadata: NotRequired[dict[str, Any] | None]


class GrantTemplateGenerationMetadata(TypedDict):
    extraction: ExtractedCFPData
    analysis: NotRequired[CFPAnalysisSnapshot]
    sections: NotRequired[list[GrantElement | GrantLongFormSection]]


class GrantApplicationGenerationMetadata(TypedDict):
    section_texts: NotRequired[dict[str, str]]
    application_text: NotRequired[str]


class RagJobCheckpoint(TypedDict):
    stage: str
    trace_id: NotRequired[str]
    template_metadata: NotRequired[GrantTemplateGenerationMetadata]
    application_metadata: NotRequired[GrantApplicationGenerationMetadata]
