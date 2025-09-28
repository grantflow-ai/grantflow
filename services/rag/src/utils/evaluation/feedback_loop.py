"""Feedback loop system for scientific content evaluation and improvement.

This module implements an iterative feedback system that:
1. Evaluates content using fast CPU-based metrics
2. Identifies specific quality issues
3. Generates targeted improvement instructions
4. Uses LLM to improve content based on feedback
5. Re-evaluates until quality standards are met
"""

import time
from typing import TypedDict, cast

from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.logger import get_logger

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.completion import make_google_completions_request
from services.rag.src.utils.evaluation.dto import FastEvaluationResult
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content
from services.rag.src.utils.evaluation.quality_standards import (
    COMPONENT_REQUIREMENTS,
    ContentType,
    QualityAssessment,
    assess_content_quality,
)
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


CONTENT_IMPROVEMENT_PROMPT = PromptTemplate(
    name="content_improvement",
    template="""
    ## Task
    Your task is to improve the following scientific content based on specific quality feedback:

    ### Original Content:
    <content>
    ${content}
    </content>

    ### Quality Issues Identified:
    ${improvement_instructions}

    ### Content Requirements:
    - Content Type: ${content_type}
    - Target Word Count: ${target_words} words
    - Section: ${section_title}

    ### Context and Sources:
    ${rag_context}

    ### Research Objectives:
    ${research_objectives}

    ## Instructions:
    1. **Analyze** the quality issues identified above
    2. **Preserve** all factual information and key concepts from the original
    3. **Improve** the content to address each specific issue:
       - Enhance scientific rigor and technical precision
       - Strengthen evidence-based claims and citations
       - Improve logical flow and coherence
       - Better organize structure and formatting
    4. **Maintain** appropriate academic tone and register
    5. **Ensure** content aligns with research objectives and section requirements

    **IMPORTANT**:
    - Keep the same factual content but improve quality and presentation
    - Use evidence from the provided context where relevant
    - If information is insufficient, indicate with `**[MISSING INFORMATION: specific description]**`
    - Aim for the target word count while maintaining quality

    Generate the improved content:
    """,
)


class ImprovementResult(TypedDict):
    """Result of content improvement attempt."""

    improved_content: str
    evaluation_result: FastEvaluationResult
    quality_assessment: QualityAssessment
    iteration: int
    improvement_applied: bool
    execution_time_ms: float


class FeedbackLoopSettings(TypedDict, total=False):
    """Settings for feedback loop behavior."""

    max_iterations: int  # Maximum improvement attempts
    min_improvement_threshold: float  # Minimum score improvement to continue
    target_quality_level: float  # Target overall score to achieve
    enable_adaptive_thresholds: bool  # Lower thresholds if no improvement
    llm_timeout: float  # Timeout for LLM improvement calls


DEFAULT_FEEDBACK_SETTINGS: FeedbackLoopSettings = {
    "max_iterations": 3,
    "min_improvement_threshold": 0.05,  # 5% minimum improvement
    "target_quality_level": 0.70,  # 70% target
    "enable_adaptive_thresholds": True,
    "llm_timeout": 45.0,
}


def _generate_improvement_instructions(
    evaluation_result: FastEvaluationResult,
    content_type: ContentType,
) -> list[str]:
    """Generate specific improvement instructions based on evaluation results."""
    instructions = []

    # Get component requirements for this content type
    requirements = COMPONENT_REQUIREMENTS[content_type]

    # Check structural issues
    structural = evaluation_result["structural_metrics"]
    if structural["overall"] < requirements.get("structural", 0.5):
        if structural["word_count_compliance"] < 0.8:
            instructions.append("Adjust content length to meet word count requirements while maintaining quality")
        if structural["paragraph_distribution"] < 0.5:
            instructions.append(
                "Improve paragraph structure - ensure balanced distribution of content across paragraphs"
            )
        if structural["section_organization"] < 0.6:
            instructions.append("Better organize content with clear logical sections and subsections")
        if structural["academic_formatting"] < 0.5:
            instructions.append("Enhance academic formatting with proper headers, lists, and structured presentation")
        if structural["header_structure"] < 0.4:
            instructions.append("Add clear hierarchical headers to improve content structure")

    # Check scientific quality issues
    quality = evaluation_result["scientific_quality_metrics"]
    if quality["overall"] < requirements.get("scientific_quality", 0.6):
        if quality["scientific_term_density"] < 0.5:
            instructions.append("Increase use of precise scientific terminology appropriate for the field")
        if quality["methodology_language_score"] < 0.5:
            instructions.append("Strengthen methodology descriptions with more technical precision")
        if quality["academic_register_score"] < 0.4:
            instructions.append("Elevate academic tone - use formal scholarly language and avoid colloquialisms")
        if quality["technical_precision"] < 0.5:
            instructions.append("Improve technical precision - be more specific with measurements, methods, and claims")
        if quality["evidence_based_claims_ratio"] < 0.4:
            instructions.append("Support more claims with evidence, data, or citations to strengthen credibility")

    # Check source grounding issues
    grounding = evaluation_result["source_grounding_metrics"]
    if grounding["overall"] < requirements.get("source_grounding", 0.5):
        if grounding["keyword_coverage"] < 0.5:
            instructions.append("Better incorporate key terms and concepts from the source materials")
        if grounding["context_citation_density"] < 0.3:
            instructions.append("Add more references to source materials and evidence where appropriate")
        if grounding["search_query_integration"] < 0.4:
            instructions.append("Better address the core research questions and search objectives")

    # Check coherence issues
    coherence = evaluation_result["coherence_metrics"]
    if coherence["overall"] < requirements.get("coherence", 0.5):
        if coherence["sentence_transition_quality"] < 0.5:
            instructions.append("Improve transitions between sentences and ideas for better flow")
        if coherence["argument_flow_consistency"] < 0.5:
            instructions.append("Ensure logical progression of arguments and ideas throughout the content")
        if coherence["paragraph_unity"] < 0.5:
            instructions.append("Strengthen paragraph unity - each paragraph should focus on one main idea")
        if coherence["lexical_diversity"] < 0.4:
            instructions.append("Improve vocabulary variety while maintaining scientific precision")

    # Overall quality guidance
    overall_score = evaluation_result["overall_score"]
    if overall_score < 50:
        instructions.append("Fundamental revision needed - focus on scientific accuracy and clarity")
    elif overall_score < 65:
        instructions.append("Moderate improvements needed - enhance rigor and evidence support")
    elif overall_score < 80:
        instructions.append("Minor refinements needed - polish for publication-level quality")

    return instructions


async def _improve_content_with_llm(
    content: str,
    improvement_instructions: list[str],
    section_config: GrantLongFormSection,
    rag_context: list[DocumentDTO],
    research_objectives: list[ResearchObjective],
    content_type: ContentType,
    trace_id: str,
    timeout: float = 45.0,
) -> str:
    """Use LLM to improve content based on feedback."""

    # Format improvement instructions
    formatted_instructions = "\n".join([f"• {instruction}" for instruction in improvement_instructions])

    # Format RAG context
    rag_text = "\n".join([f"Source {i + 1}: {doc['content'][:500]}..." for i, doc in enumerate(rag_context[:3])])

    # Format research objectives
    objectives_text = "\n".join([f"- {obj['title']}: {obj.get('description', '')}" for obj in research_objectives[:3]])

    prompt_text = CONTENT_IMPROVEMENT_PROMPT.to_string(
        content=content,
        improvement_instructions=formatted_instructions,
        content_type=content_type.value,
        target_words=section_config.get("max_words", 500),
        section_title=section_config["title"],
        rag_context=rag_text if rag_context else "No additional context provided",
        research_objectives=objectives_text if research_objectives else "No specific objectives provided",
    )

    try:
        improved_content = await make_google_completions_request(
            prompt_identifier="content_improvement",
            response_type=str,
            system_prompt="You are an expert scientific writer specializing in academic content improvement.",
            messages=prompt_text,
            temperature=0.3,
            top_p=0.8,
            trace_id=trace_id,
            timeout=timeout,
        )

        return improved_content.strip()

    except Exception as e:
        logger.warning("Content improvement failed", error=str(e), trace_id=trace_id)
        # Return original content if improvement fails
        return content


async def evaluate_with_feedback_loop(
    content: str,
    section_config: GrantLongFormSection,
    rag_context: list[DocumentDTO],
    research_objectives: list[ResearchObjective],
    trace_id: str,
    content_type: ContentType = ContentType.BIOMEDICAL_RESEARCH,
    settings: FeedbackLoopSettings | None = None,
) -> ImprovementResult:
    """Evaluate content with iterative improvement feedback loop.

    This function implements a sophisticated feedback system that:
    1. Evaluates content quality using fast metrics
    2. Identifies specific improvement areas
    3. Uses LLM to improve content based on targeted feedback
    4. Re-evaluates until quality standards are met or max iterations reached

    Args:
        content: Scientific content to evaluate and improve
        section_config: Configuration for the content section
        rag_context: Relevant source documents for context
        research_objectives: Research objectives to align with
        trace_id: Unique identifier for tracking
        content_type: Type of scientific content for appropriate standards
        settings: Configuration for feedback loop behavior

    Returns:
        Result containing improved content and evaluation metrics
    """
    start_time = time.time()
    eval_settings = {**DEFAULT_FEEDBACK_SETTINGS, **(settings or {})}

    current_content = content
    best_score = 0.0
    iteration = 1

    logger.info(
        "Starting evaluation with feedback loop",
        content_type=content_type.value,
        target_quality=eval_settings.get("target_quality_level", 0.70),
        max_iterations=eval_settings.get("max_iterations", 3),
        trace_id=trace_id,
    )

    max_iterations_val = eval_settings.get("max_iterations")
    max_iterations: int = 3 if max_iterations_val is None else cast("int", max_iterations_val)
    while iteration <= max_iterations:
        # Evaluate current content
        evaluation_result = await evaluate_scientific_content(
            content=current_content,
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=research_objectives,
            trace_id=f"{trace_id}_iter_{iteration}",
        )

        # Assess quality against standards
        quality_assessment = assess_content_quality(
            overall_score=evaluation_result["overall_score"] / 100.0,
            component_scores={
                "structural": evaluation_result["structural_metrics"]["overall"],
                "scientific_quality": evaluation_result["scientific_quality_metrics"]["overall"],
                "source_grounding": evaluation_result["source_grounding_metrics"]["overall"],
                "coherence": evaluation_result["coherence_metrics"]["overall"],
            },
            content_type=content_type,
        )

        current_score = evaluation_result["overall_score"] / 100.0

        logger.info(
            "Feedback loop iteration completed",
            iteration=iteration,
            overall_score=current_score,
            quality_level=quality_assessment["quality_level"].value,
            meets_requirements=quality_assessment["meets_requirements"],
            trace_id=trace_id,
        )

        # Check if we've achieved target quality
        target_quality_val = eval_settings.get("target_quality_level")
        target_quality: float = 0.70 if target_quality_val is None else cast("float", target_quality_val)
        if quality_assessment["meets_requirements"] and current_score >= target_quality:
            execution_time = (time.time() - start_time) * 1000
            logger.info(
                "Target quality achieved",
                iteration=iteration,
                final_score=current_score,
                execution_time_ms=execution_time,
                trace_id=trace_id,
            )

            return ImprovementResult(
                improved_content=current_content,
                evaluation_result=evaluation_result,
                quality_assessment=quality_assessment,
                iteration=iteration,
                improvement_applied=iteration > 1,
                execution_time_ms=execution_time,
            )

        # Check if we should continue iterating
        if iteration >= max_iterations:
            break

        improvement_threshold_val = eval_settings.get("min_improvement_threshold")
        improvement_threshold: float = (
            0.05 if improvement_threshold_val is None else cast("float", improvement_threshold_val)
        )
        if iteration > 1 and (current_score - best_score) < improvement_threshold:
            logger.info(
                "Insufficient improvement, stopping iterations",
                current_score=current_score,
                best_score=best_score,
                improvement=current_score - best_score,
                threshold=improvement_threshold,
                trace_id=trace_id,
            )
            break

        best_score = max(best_score, current_score)

        # Generate improvement instructions
        improvement_instructions = _generate_improvement_instructions(evaluation_result, content_type)

        if not improvement_instructions:
            logger.info(
                "No specific improvements identified, stopping iterations",
                iteration=iteration,
                current_score=current_score,
                trace_id=trace_id,
            )
            break

        # Improve content using LLM
        logger.info(
            "Applying content improvements",
            iteration=iteration,
            improvement_count=len(improvement_instructions),
            trace_id=trace_id,
        )

        try:
            improved_content = await _improve_content_with_llm(
                content=current_content,
                improvement_instructions=improvement_instructions,
                section_config=section_config,
                rag_context=rag_context,
                research_objectives=research_objectives,
                content_type=content_type,
                trace_id=f"{trace_id}_improve_{iteration}",
                timeout=cast("float", eval_settings.get("llm_timeout"))
                if eval_settings.get("llm_timeout") is not None
                else 45.0,
            )

            # Only use improved content if it's actually different
            if improved_content != current_content and len(improved_content.strip()) > 50:
                current_content = improved_content
            else:
                logger.warning(
                    "Content improvement produced no meaningful change",
                    iteration=iteration,
                    trace_id=trace_id,
                )
                break

        except Exception as e:
            logger.error(
                "Content improvement failed",
                iteration=iteration,
                error=str(e),
                trace_id=trace_id,
            )
            break

        iteration += 1

    # Return final result
    execution_time = (time.time() - start_time) * 1000

    # Final evaluation if we exited the loop
    final_evaluation = await evaluate_scientific_content(
        content=current_content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=research_objectives,
        trace_id=f"{trace_id}_final",
    )

    final_quality = assess_content_quality(
        overall_score=final_evaluation["overall_score"] / 100.0,
        component_scores={
            "structural": final_evaluation["structural_metrics"]["overall"],
            "scientific_quality": final_evaluation["scientific_quality_metrics"]["overall"],
            "source_grounding": final_evaluation["source_grounding_metrics"]["overall"],
            "coherence": final_evaluation["coherence_metrics"]["overall"],
        },
        content_type=content_type,
    )

    logger.info(
        "Feedback loop completed",
        total_iterations=iteration - 1,
        final_score=final_evaluation["overall_score"] / 100.0,
        quality_level=final_quality["quality_level"].value,
        execution_time_ms=execution_time,
        trace_id=trace_id,
    )

    return ImprovementResult(
        improved_content=current_content,
        evaluation_result=final_evaluation,
        quality_assessment=final_quality,
        iteration=iteration - 1,
        improvement_applied=iteration > 2,
        execution_time_ms=execution_time,
    )
