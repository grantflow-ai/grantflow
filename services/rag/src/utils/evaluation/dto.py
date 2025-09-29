"""Unified type definitions for the evaluation system.

This module contains all TypedDict definitions used across the evaluation system.
No "Fast", "Advanced", or "Enhanced" prefixes - just clean, descriptive names.
"""

from typing import TYPE_CHECKING, Literal, NotRequired, TypedDict

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.llm.evaluation import EvaluationToolResponse

from packages.db.src.json_objects import (
    CFPAnalysisResult,
    GrantLongFormSection,
    ResearchObjective,
)

from services.rag.src.dto import DocumentDTO

# Type aliases for clarity
RecommendationType = Literal["accept", "llm_review", "reject"]
EvaluationPathType = Literal["fast_only", "llm_only", "fast_with_llm_fallback", "error"]
ContentType = Literal["text", "objectives", "relationships", "enrichment", "cfp_analysis"]
ComplexityLevel = Literal["simple", "moderate", "complex", "very_complex"]
QualityLevel = Literal["excellent", "good", "acceptable", "poor", "unacceptable"]


# Base metrics that all evaluation metrics inherit from
class BaseMetrics(TypedDict):
    """Base class for all evaluation metrics."""

    overall: float  # 0.0 to 1.0


# Text evaluation metrics
class StructuralMetrics(BaseMetrics):
    """Metrics for structural quality of text content."""

    word_count_compliance: float
    paragraph_distribution: float
    section_organization: float
    academic_formatting: float
    header_structure: float


class GroundingMetrics(BaseMetrics):
    """Metrics for source grounding quality."""

    rouge_l_score: float
    rouge_2_score: float
    rouge_3_score: float
    ngram_overlap_weighted: float
    keyword_coverage: float
    search_query_integration: float
    context_citation_density: float


class QualityMetrics(BaseMetrics):
    """Metrics for scientific quality."""

    term_density: float
    domain_vocabulary_accuracy: float
    methodology_language_score: float
    academic_register_score: float
    technical_precision: float
    evidence_based_claims_ratio: float
    hypothesis_methodology_alignment: float


class CoherenceMetrics(BaseMetrics):
    """Metrics for text coherence."""

    local_coherence: float
    global_coherence: float
    lexical_diversity: float
    sentence_transition_quality: float
    argument_flow_consistency: float
    paragraph_unity: float
    repetition_penalty: float


class ScientificAnalysis(TypedDict):
    """CPU-based scientific analysis metrics."""

    domain_similarity: float
    methodology_completeness: float
    innovation_indicators: float
    field_alignment: float
    concept_sophistication: float


# JSON evaluation metrics
class ObjectiveQualityMetrics(BaseMetrics):
    """Quality metrics for research objectives."""

    scientific_rigor: float
    innovation_score: float
    coherence: float
    comprehensiveness: float
    keyword_alignment: float


class RelationshipQualityMetrics(BaseMetrics):
    """Quality metrics for extracted relationships."""

    validity: float
    coverage: float
    diversity: float
    description_quality: float
    bidirectionality: float


class EnrichmentQualityMetrics(BaseMetrics):
    """Quality metrics for objective enrichment."""

    value_added: float
    term_relevance: float
    question_utility: float
    context_depth: float
    search_query_quality: float


class CFPAnalysisQualityMetrics(BaseMetrics):
    """Quality metrics for CFP analysis extraction."""

    requirement_clarity: float
    quote_accuracy: float
    completeness: float
    categorization: float


# Evaluation configuration
class EvaluationThresholds(TypedDict):
    """Configurable thresholds for evaluation."""

    accept_threshold: float
    llm_review_threshold: float
    component_weights: dict[str, float]
    minimum_component_scores: dict[str, float]


class EvaluationSettings(TypedDict, total=False):
    """Settings for controlling evaluation behavior."""

    enable_fast_evaluation: bool
    fast_confidence_threshold: float
    fast_accept_threshold: float
    fast_review_threshold: float
    force_llm_evaluation: bool
    llm_timeout: float
    fast_weight: float
    llm_weight: float
    json_confidence_threshold: float  # Higher threshold for JSON structural evaluation
    json_semantic_threshold: float  # Lower threshold for JSON semantic content


class EvaluationContext(TypedDict, total=False):
    """Context provided to evaluation functions."""

    section_config: GrantLongFormSection
    rag_context: list[DocumentDTO]
    research_objectives: list[ResearchObjective]
    reference_corpus: list[str]
    content_type: ContentType


class JsonEvaluationContext(EvaluationContext):
    """Extended context for JSON evaluation."""

    json_content: ResearchObjective | CFPAnalysisResult | dict[str, list[list[str]]]


# Unified evaluation result
class EvaluationResult(TypedDict):
    """Unified result from any evaluation path."""

    success: bool
    overall_score: float  # 0-100
    confidence_score: float  # 0.0-1.0
    recommendation: RecommendationType
    detailed_feedback: list[str]
    evaluation_path: EvaluationPathType
    execution_time_ms: float

    # Detailed metrics (present based on content type)
    structural_metrics: NotRequired[StructuralMetrics]
    grounding_metrics: NotRequired[GroundingMetrics]
    quality_metrics: NotRequired[QualityMetrics]
    coherence_metrics: NotRequired[CoherenceMetrics]
    scientific_analysis: NotRequired[ScientificAnalysis]

    # JSON-specific metrics
    objective_metrics: NotRequired[ObjectiveQualityMetrics]
    relationship_metrics: NotRequired[RelationshipQualityMetrics]
    enrichment_metrics: NotRequired[EnrichmentQualityMetrics]
    cfp_analysis_metrics: NotRequired[CFPAnalysisQualityMetrics]

    # Additional evaluation data
    llm_result: NotRequired["EvaluationToolResponse"]
    fast_result: NotRequired["EvaluationResult"]


# LLM evaluation types
class EvaluationCriterion(TypedDict):
    """Definition of an evaluation criterion for LLM evaluation."""

    name: str
    evaluation_instructions: str
    weight: float


class EvaluationScore(TypedDict):
    """Score result for a single criterion."""

    score: float
    instructions: str


class LLMEvaluationResponse(TypedDict):
    """Response from LLM evaluation."""

    criteria: dict[str, EvaluationScore]


# Feedback loop types
class FeedbackLoopSettings(TypedDict, total=False):
    """Settings for the feedback loop system."""

    max_iterations: int
    min_improvement_threshold: float
    target_quality_level: float
    enable_adaptive_thresholds: bool
    llm_timeout: float


class ImprovementResult(TypedDict):
    """Result from the improvement feedback loop."""

    improved_content: str
    evaluation_result: EvaluationResult
    quality_level: QualityLevel
    iteration: int
    improvement_applied: bool
    execution_time_ms: float


# Scientific vocabulary type (used across multiple modules)
class ScientificVocabulary(TypedDict):
    """Collection of scientific terms and phrases."""

    biomedical_terms: set[str]
    methodology_terms: set[str]
    academic_phrases: set[str]
    innovation_keywords: set[str]
