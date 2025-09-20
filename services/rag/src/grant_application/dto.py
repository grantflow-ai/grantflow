from typing import Literal, NotRequired, TypedDict
from uuid import UUID

from packages.db.src.json_objects import (
    CFPSectionAnalysis,
    GrantElement,
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


class EnrichmentDataDTO(TypedDict):
    enriched_objective: str
    search_queries: list[str]
    core_scientific_terms: list[str]
    scientific_context: str
    instructions: NotRequired[str]
    description: NotRequired[str]
    guiding_questions: NotRequired[list[str]]


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


class GenerateSectionsStageDTO(
    TypedDict
):  # TODO: this is bad. We have all of the data here on the GrantApplication type itself, WE DO NOT NEED to duplicate it here. We should use the GrantApplication directly in the handle
    application_id: UUID
    cfp_analysis: CFPSectionAnalysis
    form_inputs: ResearchDeepDive
    grant_sections: list[GrantElement | GrantLongFormSection]
    research_objectives: list[ResearchObjective]
    section_texts: dict[str, str]  # TODO: this is the only value we should keep here! but it should be properly typed.
    template_id: UUID
    title: str
    work_plan_section: GrantLongFormSection  # The research plan section to generate later


class ExtractRelationshipsStageDTO(GenerateSectionsStageDTO):
    relationships: dict[str, list[tuple[str, str]]]  # Relationships between objectives/tasks


class ObjectiveEnrichmentResponse(TypedDict):
    research_objective: EnrichmentDataDTO
    research_tasks: list[EnrichmentDataDTO]


class EnrichObjectivesStageDTO(ExtractRelationshipsStageDTO):
    enrichment_responses: list[ObjectiveEnrichmentResponse]  # Enriched objectives and tasks data


class EnrichTerminologyStageDTO(EnrichObjectivesStageDTO):
    wikidata_enrichments: list[EnrichmentDataDTO]  # Scientific terminology enrichments


class GenerateResearchPlanStageDTO(EnrichTerminologyStageDTO):
    research_plan_text: str  # The generated research plan/work plan text
    complete_section_texts: dict[str, str]  # All sections including research plan
