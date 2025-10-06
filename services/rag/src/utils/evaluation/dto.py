from typing import TYPE_CHECKING, Literal, NotRequired, TypedDict

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.llm.evaluation import EvaluationToolResponse

from packages.db.src.json_objects import (
    CFPAnalysis,
    GrantLongFormSection,
    ResearchObjective,
)

from services.rag.src.dto import DocumentDTO

RecommendationType = Literal["accept", "llm_review", "reject"]
EvaluationPathType = Literal["nlp_only", "llm_only", "nlp_with_llm_fallback", "error"]
ContentType = Literal["text", "objectives", "relationships", "enrichment", "cfp_analysis"]
ComplexityLevel = Literal["simple", "moderate", "complex", "very_complex"]
QualityLevel = Literal["excellent", "good", "acceptable", "poor", "unacceptable"]

type RelationshipData = dict[str, list[list[str]]]


class BaseMetrics(TypedDict):
    overall: float


class StructuralMetrics(BaseMetrics):
    word_count_compliance: float
    paragraph_distribution: float
    section_organization: float
    academic_formatting: float
    header_structure: float


class GroundingMetrics(BaseMetrics):
    rouge_l_score: float
    rouge_2_score: float
    rouge_3_score: float
    ngram_overlap_weighted: float
    keyword_coverage: float
    search_query_integration: float
    context_citation_density: float


class QualityMetrics(BaseMetrics):
    term_density: float
    domain_vocabulary_accuracy: float
    methodology_language_score: float
    academic_register_score: float
    technical_precision: float
    evidence_based_claims_ratio: float
    hypothesis_methodology_alignment: float


class CoherenceMetrics(BaseMetrics):
    local_coherence: float
    global_coherence: float
    lexical_diversity: float
    sentence_transition_quality: float
    argument_flow_consistency: float
    paragraph_unity: float
    repetition_penalty: float


class ScientificAnalysis(TypedDict):
    domain_similarity: float
    methodology_completeness: float
    innovation_indicators: float
    field_alignment: float
    concept_sophistication: float


class ObjectiveQualityMetrics(BaseMetrics):
    scientific_rigor: float
    innovation_score: float
    coherence: float
    comprehensiveness: float
    keyword_alignment: float


class RelationshipQualityMetrics(BaseMetrics):
    validity: float
    coverage: float
    diversity: float
    description_quality: float
    bidirectionality: float


class EnrichmentQualityMetrics(BaseMetrics):
    value_added: float
    term_relevance: float
    question_utility: float
    context_depth: float
    search_query_quality: float


class CFPAnalysisQualityMetrics(BaseMetrics):
    requirement_clarity: float
    quote_accuracy: float
    completeness: float
    categorization: float


class EvaluationThresholds(TypedDict):
    accept_threshold: float
    llm_review_threshold: float
    component_weights: dict[str, float]
    minimum_component_scores: dict[str, float]


class EvaluationSettings(TypedDict, total=False):
    enable_nlp_evaluation: bool
    nlp_confidence_threshold: float
    nlp_accept_threshold: float
    nlp_review_threshold: float
    force_llm_evaluation: bool
    llm_timeout: float
    nlp_weight: float
    llm_weight: float
    json_confidence_threshold: float
    json_semantic_threshold: float


class EvaluationContext(TypedDict, total=False):
    section_config: GrantLongFormSection
    rag_context: list[DocumentDTO]
    research_objectives: list[ResearchObjective]
    reference_corpus: list[str]
    content_type: ContentType
    cfp_analysis: CFPAnalysis
    keywords: list[str]
    topics: list[str]


class JsonEvaluationContext(EvaluationContext):
    json_content: ResearchObjective | CFPAnalysis | RelationshipData


class EvaluationResult(TypedDict):
    success: bool
    overall_score: float
    confidence_score: float
    recommendation: RecommendationType
    detailed_feedback: list[str]
    evaluation_path: EvaluationPathType
    execution_time_ms: float

    structural_metrics: NotRequired[StructuralMetrics]
    grounding_metrics: NotRequired[GroundingMetrics]
    quality_metrics: NotRequired[QualityMetrics]
    coherence_metrics: NotRequired[CoherenceMetrics]
    scientific_analysis: NotRequired[ScientificAnalysis]

    objective_metrics: NotRequired[ObjectiveQualityMetrics]
    relationship_metrics: NotRequired[RelationshipQualityMetrics]
    enrichment_metrics: NotRequired[EnrichmentQualityMetrics]
    cfp_analysis_metrics: NotRequired[CFPAnalysisQualityMetrics]

    llm_result: NotRequired["EvaluationToolResponse"]
    fast_result: NotRequired["EvaluationResult"]


class EvaluationCriterion(TypedDict):
    name: str
    evaluation_instructions: str
    weight: float


class EvaluationScore(TypedDict):
    score: float
    instructions: str


class LLMEvaluationResponse(TypedDict):
    criteria: dict[str, EvaluationScore]


class FeedbackLoopSettings(TypedDict, total=False):
    max_iterations: int
    min_improvement_threshold: float
    target_quality_level: float
    enable_adaptive_thresholds: bool
    llm_timeout: float


class ImprovementResult(TypedDict):
    improved_content: str
    evaluation_result: EvaluationResult
    quality_level: QualityLevel
    iteration: int
    improvement_applied: bool
    execution_time_ms: float


class ScientificVocabulary(TypedDict):
    biomedical_terms: set[str]
    methodology_terms: set[str]
    academic_phrases: set[str]
    innovation_keywords: set[str]
