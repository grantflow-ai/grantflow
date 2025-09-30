import asyncio
import time
from typing import Final, cast

from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.logger import get_logger

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.dto import (
    CoherenceMetrics,
    EvaluationResult,
    EvaluationThresholds,
    GroundingMetrics,
    QualityMetrics,
    RecommendationType,
    ScientificAnalysis,
    StructuralMetrics,
)
from services.rag.src.utils.evaluation.quality_standards import (
    evaluate_missing_information,
)
from services.rag.src.utils.evaluation.text.coherence import evaluate_coherence
from services.rag.src.utils.evaluation.text.grounding import evaluate_source_grounding
from services.rag.src.utils.evaluation.text.quality import evaluate_scientific_quality
from services.rag.src.utils.evaluation.text.scientific import analyze_scientific_content
from services.rag.src.utils.evaluation.text.structure import evaluate_structure

logger = get_logger(__name__)

DEFAULT_THRESHOLDS: Final[EvaluationThresholds] = EvaluationThresholds(
    accept_threshold=85.0,
    llm_review_threshold=65.0,
    component_weights={
        "structural": 0.15,
        "source_grounding": 0.25,
        "scientific_quality": 0.30,
        "coherence": 0.20,
        "cpu_scientific": 0.10,
    },
    minimum_component_scores={
        "scientific_quality": 70.0,
        "source_grounding": 60.0,
        "coherence": 65.0,
        "structural": 60.0,
    },
)


def calculate_weighted_overall_score(
    structural_score: float,
    grounding_score: float,
    quality_score: float,
    coherence_score: float,
    cpu_analysis_score: float,
    thresholds: EvaluationThresholds = DEFAULT_THRESHOLDS,
) -> float:
    weights = thresholds["component_weights"]

    overall_score = (
        structural_score * weights["structural"]
        + grounding_score * weights["source_grounding"]
        + quality_score * weights["scientific_quality"]
        + coherence_score * weights["coherence"]
        + cpu_analysis_score * weights["cpu_scientific"]
    )

    return overall_score * 100


def calculate_cpu_analysis_score(
    domain_similarity: float,
    methodology_completeness: float,
    innovation_indicators: float,
    field_alignment: float,
    concept_sophistication: float,
) -> float:
    return (
        domain_similarity * 0.25
        + methodology_completeness * 0.25
        + innovation_indicators * 0.20
        + field_alignment * 0.20
        + concept_sophistication * 0.10
    )


def assess_research_objective_alignment(content: str, research_objectives: list[ResearchObjective]) -> float:
    if not content.strip() or not research_objectives:
        return 0.5

    content_lower = content.lower()
    total_alignment = 0.0

    for objective in research_objectives:
        objective_alignment = 0.0

        obj_title_words = set(objective["title"].lower().split())
        obj_desc_words = set(objective["description"].lower().split()) if objective.get("description") else set()
        content_words = set(content_lower.split())

        title_overlap = len(obj_title_words.intersection(content_words)) / max(len(obj_title_words), 1)
        desc_overlap = (
            len(obj_desc_words.intersection(content_words)) / max(len(obj_desc_words), 1) if obj_desc_words else 0
        )

        objective_alignment += (title_overlap * 0.6 + desc_overlap * 0.4) * 0.7

        research_tasks = objective["research_tasks"]
        if research_tasks:
            task_alignment = 0.0
            for task in research_tasks:
                task_words = set(task["title"].lower().split())
                task_overlap = len(task_words.intersection(content_words)) / max(len(task_words), 1)
                task_alignment += task_overlap

            objective_alignment += (task_alignment / len(research_tasks)) * 0.3

        total_alignment += objective_alignment

    return total_alignment / len(research_objectives) if research_objectives else 0.5


def determine_recommendation_with_confidence(
    overall_score: float,
    structural_score: float,
    grounding_score: float,
    quality_score: float,
    coherence_score: float,
    thresholds: EvaluationThresholds = DEFAULT_THRESHOLDS,
) -> tuple[RecommendationType, float]:
    component_scores = {
        "structural": structural_score * 100,
        "source_grounding": grounding_score * 100,
        "scientific_quality": quality_score * 100,
        "coherence": coherence_score * 100,
    }

    minimum_scores = thresholds["minimum_component_scores"]
    failed_components = []

    for component, score in component_scores.items():
        if component in minimum_scores and score < minimum_scores[component]:
            failed_components.append(component)

    if failed_components:
        if "scientific_quality" in failed_components or len(failed_components) >= 2:
            return "reject", 0.2
        return "llm_review", 0.4

    if overall_score >= thresholds["accept_threshold"]:
        if all(score >= 80 for score in component_scores.values()):
            confidence = 0.95
        elif all(score >= 70 for score in component_scores.values()):
            confidence = 0.85
        else:
            confidence = 0.75
        return "accept", min(0.99, confidence)
    if overall_score >= thresholds["llm_review_threshold"]:
        confidence = 0.6 + (overall_score - thresholds["llm_review_threshold"]) / 100
        return "llm_review", min(0.99, confidence)
    return "reject", 0.3


def generate_detailed_feedback(
    overall_score: float,
    structural_score: float,
    grounding_score: float,
    quality_score: float,
    coherence_score: float,
    recommendation: str,
) -> list[str]:
    feedback = []

    if recommendation == "accept":
        feedback.append("Content meets high quality standards for scientific writing.")
        if overall_score >= 90:
            feedback.append("Excellent overall quality with strong performance across all metrics.")
    elif recommendation == "llm_review":
        feedback.append("Content shows promise but requires detailed review for improvement.")
    else:
        feedback.append("Content requires significant improvement before acceptance.")

    component_scores = {
        "Structural Quality": structural_score * 100,
        "Source Grounding": grounding_score * 100,
        "Scientific Quality": quality_score * 100,
        "Coherence": coherence_score * 100,
    }

    for component, score in component_scores.items():
        if score < 60:
            feedback.append(f"⚠️ {component}: Below acceptable standards ({score:.1f}/100)")
        elif score < 75:
            feedback.append(f"⚡ {component}: Room for improvement ({score:.1f}/100)")
        elif score >= 85:
            feedback.append(f"✅ {component}: Strong performance ({score:.1f}/100)")

    return feedback


async def evaluate_scientific_content(
    content: str,
    section_config: GrantLongFormSection,
    rag_context: list[DocumentDTO],
    research_objectives: list[ResearchObjective],
    trace_id: str,
    reference_corpus: list[str] | None = None,
    thresholds: EvaluationThresholds | None = None,
) -> EvaluationResult:
    start_time = time.time()
    eval_thresholds = thresholds or DEFAULT_THRESHOLDS

    if not content or not content.strip():
        logger.warning("Empty content provided for evaluation", trace_id=trace_id)
        execution_time = (time.time() - start_time) * 1000
        return EvaluationResult(
            success=False,
            overall_score=0.0,
            evaluation_path="error",
            structural_metrics=StructuralMetrics(
                word_count_compliance=0.0,
                paragraph_distribution=0.0,
                section_organization=0.0,
                academic_formatting=0.0,
                header_structure=0.0,
                overall=0.0,
            ),
            grounding_metrics=GroundingMetrics(
                rouge_l_score=0.0,
                rouge_2_score=0.0,
                rouge_3_score=0.0,
                ngram_overlap_weighted=0.0,
                keyword_coverage=0.0,
                search_query_integration=0.0,
                context_citation_density=0.0,
                overall=0.0,
            ),
            quality_metrics=QualityMetrics(
                term_density=0.0,
                domain_vocabulary_accuracy=0.0,
                methodology_language_score=0.0,
                academic_register_score=0.0,
                technical_precision=0.0,
                evidence_based_claims_ratio=0.0,
                hypothesis_methodology_alignment=0.0,
                overall=0.0,
            ),
            coherence_metrics=CoherenceMetrics(
                local_coherence=0.0,
                global_coherence=0.0,
                lexical_diversity=0.0,
                sentence_transition_quality=0.0,
                argument_flow_consistency=0.0,
                paragraph_unity=0.0,
                repetition_penalty=0.0,
                overall=0.0,
            ),
            scientific_analysis=ScientificAnalysis(
                domain_similarity=0.0,
                methodology_completeness=0.0,
                innovation_indicators=0.0,
                field_alignment=0.0,
                concept_sophistication=0.0,
            ),
            execution_time_ms=execution_time,
            recommendation="reject",
            confidence_score=0.0,
            detailed_feedback=["Content is empty or contains only whitespace"],
        )

    if not section_config or not section_config.get("id"):
        logger.warning("Invalid section config provided", trace_id=trace_id)
        execution_time = (time.time() - start_time) * 1000
        return EvaluationResult(
            success=False,
            overall_score=0.0,
            evaluation_path="error",
            structural_metrics=StructuralMetrics(
                word_count_compliance=0.0,
                paragraph_distribution=0.0,
                section_organization=0.0,
                academic_formatting=0.0,
                header_structure=0.0,
                overall=0.0,
            ),
            grounding_metrics=GroundingMetrics(
                rouge_l_score=0.0,
                rouge_2_score=0.0,
                rouge_3_score=0.0,
                ngram_overlap_weighted=0.0,
                keyword_coverage=0.0,
                search_query_integration=0.0,
                context_citation_density=0.0,
                overall=0.0,
            ),
            quality_metrics=QualityMetrics(
                term_density=0.0,
                domain_vocabulary_accuracy=0.0,
                methodology_language_score=0.0,
                academic_register_score=0.0,
                technical_precision=0.0,
                evidence_based_claims_ratio=0.0,
                hypothesis_methodology_alignment=0.0,
                overall=0.0,
            ),
            coherence_metrics=CoherenceMetrics(
                local_coherence=0.0,
                global_coherence=0.0,
                lexical_diversity=0.0,
                sentence_transition_quality=0.0,
                argument_flow_consistency=0.0,
                paragraph_unity=0.0,
                repetition_penalty=0.0,
                overall=0.0,
            ),
            scientific_analysis=ScientificAnalysis(
                domain_similarity=0.0,
                methodology_completeness=0.0,
                innovation_indicators=0.0,
                field_alignment=0.0,
                concept_sophistication=0.0,
            ),
            execution_time_ms=execution_time,
            recommendation="reject",
            confidence_score=0.0,
            detailed_feedback=["Invalid section configuration provided"],
        )

    logger.info(
        "Starting fast scientific evaluation",
        content_length=len(content),
        section_id=section_config["id"],
        rag_documents=len(rag_context),
        trace_id=trace_id,
    )

    try:
        evaluation_tasks = [
            evaluate_structure(content, section_config),
            evaluate_source_grounding(content, rag_context, section_config),
            evaluate_scientific_quality(content, rag_context, section_config),
            evaluate_coherence(content),
            analyze_scientific_content(content, reference_corpus or []),
        ]

        results = await asyncio.gather(*evaluation_tasks)

        (
            structural_metrics,
            grounding_metrics,
            quality_metrics,
            coherence_metrics,
            cpu_analysis,
        ) = cast(
            "tuple[StructuralMetrics, GroundingMetrics, QualityMetrics, CoherenceMetrics, ScientificAnalysis]",
            results,
        )

        cpu_analysis_score = calculate_cpu_analysis_score(
            cpu_analysis["domain_similarity"],
            cpu_analysis["methodology_completeness"],
            cpu_analysis["innovation_indicators"],
            cpu_analysis["field_alignment"],
            cpu_analysis["concept_sophistication"],
        )

        objective_alignment = assess_research_objective_alignment(content, research_objectives)

        base_overall_score = calculate_weighted_overall_score(
            structural_metrics["overall"],
            grounding_metrics["overall"],
            quality_metrics["overall"],
            coherence_metrics["overall"],
            cpu_analysis_score,
            eval_thresholds,
        )

        alignment_modifier = (objective_alignment - 0.5) * 0.1
        overall_score = base_overall_score * (1 + alignment_modifier)

        missing_info_metrics = evaluate_missing_information(content)
        if missing_info_metrics["quality_bonus"] > 0:
            overall_score = min(100.0, overall_score + missing_info_metrics["quality_bonus"] * 100)
            logger.debug(
                "Applied MISSING INFO quality bonus",
                original_score=base_overall_score,
                bonus=missing_info_metrics["quality_bonus"],
                adjusted_score=overall_score,
                missing_info_count=missing_info_metrics["count"],
                trace_id=trace_id,
            )

        recommendation, confidence = determine_recommendation_with_confidence(
            overall_score,
            structural_metrics["overall"],
            grounding_metrics["overall"],
            quality_metrics["overall"],
            coherence_metrics["overall"],
            eval_thresholds,
        )

        detailed_feedback = generate_detailed_feedback(
            overall_score,
            structural_metrics["overall"],
            grounding_metrics["overall"],
            quality_metrics["overall"],
            coherence_metrics["overall"],
            recommendation,
        )

        execution_time = (time.time() - start_time) * 1000

        logger.info(
            "Fast scientific evaluation completed",
            overall_score=overall_score,
            recommendation=recommendation,
            confidence=confidence,
            execution_time_ms=execution_time,
            trace_id=trace_id,
        )

        return EvaluationResult(
            success=True,
            overall_score=overall_score,
            evaluation_path="nlp_only",
            structural_metrics=structural_metrics,
            grounding_metrics=grounding_metrics,
            quality_metrics=quality_metrics,
            coherence_metrics=coherence_metrics,
            scientific_analysis=cpu_analysis,
            execution_time_ms=execution_time,
            recommendation=recommendation,
            confidence_score=confidence,
            detailed_feedback=detailed_feedback,
        )

    except Exception as e:
        execution_time = (time.time() - start_time) * 1000

        logger.error(
            "Fast scientific evaluation failed", error=str(e), execution_time_ms=execution_time, trace_id=trace_id
        )

        return EvaluationResult(
            success=False,
            overall_score=0.0,
            evaluation_path="error",
            structural_metrics=StructuralMetrics(
                word_count_compliance=0.0,
                paragraph_distribution=0.0,
                section_organization=0.0,
                academic_formatting=0.0,
                header_structure=0.0,
                overall=0.0,
            ),
            grounding_metrics=GroundingMetrics(
                rouge_l_score=0.0,
                rouge_2_score=0.0,
                rouge_3_score=0.0,
                ngram_overlap_weighted=0.0,
                keyword_coverage=0.0,
                search_query_integration=0.0,
                context_citation_density=0.0,
                overall=0.0,
            ),
            quality_metrics=QualityMetrics(
                term_density=0.0,
                domain_vocabulary_accuracy=0.0,
                methodology_language_score=0.0,
                academic_register_score=0.0,
                technical_precision=0.0,
                evidence_based_claims_ratio=0.0,
                hypothesis_methodology_alignment=0.0,
                overall=0.0,
            ),
            coherence_metrics=CoherenceMetrics(
                local_coherence=0.0,
                global_coherence=0.0,
                lexical_diversity=0.0,
                sentence_transition_quality=0.0,
                argument_flow_consistency=0.0,
                paragraph_unity=0.0,
                repetition_penalty=0.0,
                overall=0.0,
            ),
            scientific_analysis=ScientificAnalysis(
                domain_similarity=0.0,
                methodology_completeness=0.0,
                innovation_indicators=0.0,
                field_alignment=0.0,
                concept_sophistication=0.0,
            ),
            execution_time_ms=execution_time,
            recommendation="reject",
            confidence_score=0.1,
            detailed_feedback=[f"Evaluation failed: {e!s}"],
        )
