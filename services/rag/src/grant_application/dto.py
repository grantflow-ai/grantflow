from typing import Literal, NotRequired, TypedDict

from packages.db.src.json_objects import (
    GrantLongFormSection,
    ResearchDeepDive,
    ResearchObjective,
)


class ResearchComponentGenerationDTO(TypedDict):
    number: str
    title: str
    description: str
    instructions: str
    guiding_questions: list[str]
    search_queries: list[str]
    relationships: list[tuple[str, str]]
    max_words: NotRequired[int]
    type: Literal["task", "objective"]


class EnrichObjectiveInputDTO(TypedDict):
    application_id: str
    grant_section: GrantLongFormSection
    research_objective: ResearchObjective
    form_inputs: ResearchDeepDive
    retrieval_context: str
    keywords: list[str]
    topics: list[str]
    trace_id: str


class EnrichmentDataDTO(TypedDict):
    enriched: str
    queries: list[str]
    terms: list[str]
    context: str
    instructions: str
    description: str
    questions: list[str]


class WikidataExpansionResult(TypedDict):
    term: str
    expanded_terms: list[str]
    scientific_context: str
    confidence_score: float


class WikidataBatchResponse(TypedDict):
    results: list[WikidataExpansionResult]
    total_terms_processed: int
    successful_expansions: int
    failed_expansions: int


class SectionText(TypedDict):
    section_id: str
    text: str


class ExtractRelationshipsStageDTO(TypedDict):
    work_plan_section: GrantLongFormSection
    relationships: dict[str, list[tuple[str, str]]]


class ObjectiveEnrichmentResponse(TypedDict):
    research_objective: EnrichmentDataDTO
    research_tasks: list[EnrichmentDataDTO]


class EnrichObjectivesStageDTO(ExtractRelationshipsStageDTO):
    enrichment_responses: list[ObjectiveEnrichmentResponse]


class EnrichTerminologyStageDTO(EnrichObjectivesStageDTO):
    wikidata_enrichments: list[EnrichmentDataDTO]


class GenerateResearchPlanStageDTO(EnrichTerminologyStageDTO):
    research_plan_text: str


class GenerateSectionsStageDTO(GenerateResearchPlanStageDTO):
    section_texts: list[SectionText]


StageDTO = (
    ExtractRelationshipsStageDTO
    | EnrichObjectivesStageDTO
    | EnrichTerminologyStageDTO
    | GenerateResearchPlanStageDTO
    | GenerateSectionsStageDTO
)
