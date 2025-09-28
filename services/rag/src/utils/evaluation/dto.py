from typing import NotRequired, TypedDict

from services.rag.src.utils.evaluation.types import RecommendationType


class StructuralMetrics(TypedDict):
    word_count_compliance: float
    paragraph_distribution: float
    section_organization: float
    academic_formatting: float
    header_structure: float
    overall: float


class SourceGroundingMetrics(TypedDict):
    rouge_l_score: float
    rouge_2_score: float
    rouge_3_score: float
    ngram_overlap_weighted: float
    keyword_coverage: float
    search_query_integration: float
    context_citation_density: float
    overall: float


class ScientificQualityMetrics(TypedDict):
    scientific_term_density: float
    domain_vocabulary_accuracy: float
    methodology_language_score: float
    academic_register_score: float
    technical_precision: float
    evidence_based_claims_ratio: float
    hypothesis_methodology_alignment: float
    overall: float


class CoherenceMetrics(TypedDict):
    local_coherence: float
    global_coherence: float
    lexical_diversity: float
    sentence_transition_quality: float
    argument_flow_consistency: float
    paragraph_unity: float
    repetition_penalty: float
    overall: float


class CPUScientificAnalysis(TypedDict):
    domain_similarity: float
    methodology_completeness: float
    innovation_indicators: float
    field_alignment: float
    concept_sophistication: float


class SciSpacyAnalysis(TypedDict):
    biomedical_entities: list[str]
    chemical_compounds: list[str]
    diseases_conditions: list[str]
    research_methods: list[str]
    entity_density: float
    domain_specificity: float
    terminology_accuracy: float


class FastEvaluationResult(TypedDict):
    overall_score: float
    structural_metrics: StructuralMetrics
    source_grounding_metrics: SourceGroundingMetrics
    scientific_quality_metrics: ScientificQualityMetrics
    coherence_metrics: CoherenceMetrics
    cpu_scientific_analysis: CPUScientificAnalysis
    scispacy_analysis: NotRequired[SciSpacyAnalysis]
    execution_time_ms: float
    recommendation: RecommendationType
    confidence_score: float
    detailed_feedback: NotRequired[list[str]]


class EvaluationThresholds(TypedDict):
    accept_threshold: float
    llm_review_threshold: float
    component_weights: dict[str, float]
    minimum_component_scores: dict[str, float]


class ScientificVocabulary(TypedDict):
    biomedical_terms: set[str]
    methodology_terms: set[str]
    academic_phrases: set[str]
    innovation_keywords: set[str]
