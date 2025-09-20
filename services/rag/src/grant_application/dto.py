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


class SectionText(TypedDict):
    section_id: str
    text: str


class GenerateSectionsStageDTO(TypedDict):
    """Contains only the generated section texts, not the input data"""
    section_texts: list[SectionText]  # Generated texts for all sections except research plan
    work_plan_section: GrantLongFormSection  # The research plan section to generate later


class ExtractRelationshipsStageDTO(GenerateSectionsStageDTO):
    """Adds extracted relationships to the previous stage data"""
    relationships: dict[str, list[tuple[str, str]]]  # Relationships between objectives/tasks


class ObjectiveEnrichmentResponse(TypedDict):
    research_objective: EnrichmentDataDTO
    research_tasks: list[EnrichmentDataDTO]


class EnrichObjectivesStageDTO(ExtractRelationshipsStageDTO):
    """Adds enrichment responses to the previous stage data"""
    enrichment_responses: list[ObjectiveEnrichmentResponse]  # Enriched objectives and tasks data


class EnrichTerminologyStageDTO(EnrichObjectivesStageDTO):
    """Adds Wikidata enrichments to the previous stage data"""
    wikidata_enrichments: list[EnrichmentDataDTO]  # Scientific terminology enrichments


class GenerateResearchPlanStageDTO(EnrichTerminologyStageDTO):
    """Final stage with complete application text"""
    research_plan_text: str  # The generated research plan/work plan text
