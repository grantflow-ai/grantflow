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

from services.rag.src.constants import MISSING_INFO_FORMAT, MISSING_INFO_PREFIX, MISSING_INFO_SUFFIX
from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.completion import make_google_completions_request
from services.rag.src.utils.evaluation.dto import FastEvaluationResult
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content
from services.rag.src.utils.evaluation.quality_standards import (
    COMPONENT_REQUIREMENTS,
    MINIMAL_THRESHOLD,
    ContentType,
    QualityAssessment,
    assess_content_quality,
    detect_content_type,
    evaluate_missing_information,
    get_target_threshold,
)
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


MISSING_INFO_GENERATION_PROMPT = PromptTemplate(
    name="missing_info_generation",
    template="""
    ## Task
    Analyze the provided scientific content and context to identify what critical information is missing.
    Generate a comprehensive MISSING INFORMATION report explaining what is needed.

    ### Content Attempted:
    <content>
    ${content}
    </content>

    ### Quality Issues Identified:
    ${quality_issues}

    ### Context Provided:
    ${rag_context}

    ### Section Requirements:
    - Section: ${section_title}
    - Content Type: ${content_type}
    - Target Word Count: ${target_words} words
    - Keywords Expected: ${keywords}

    ## Instructions:
    1. **Identify** what specific information is missing to meet quality standards
    2. **Explain** why this information is critical for the section
    3. **Specify** what sources or data would be needed
    4. **Format** the output with clear ${missing_info_format} markers (where description is replaced with specific details)

    Generate a structured report of missing information that explains to the user what additional context or sources are needed to produce quality content.

    The report should be formatted as:
    ${missing_info_prefix} Overall Assessment${missing_info_suffix}
    <Brief overview of why content quality is insufficient>

    ${missing_info_prefix} Specific Data Needed${missing_info_suffix}
    - <Specific data point 1>
    - <Specific data point 2>
    ...

    ${missing_info_prefix} Required Sources${missing_info_suffix}
    - <Type of source needed 1>
    - <Type of source needed 2>
    ...

    ${missing_info_prefix} Context Gaps${missing_info_suffix}
    - <Missing contextual information 1>
    - <Missing contextual information 2>
    ...
    """,
)

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
    - If information is insufficient, indicate with `${missing_info_format}`
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
    "max_iterations": 2,  # Only 2 improvement attempts
    "min_improvement_threshold": 0.05,  # 5% minimum improvement
    "target_quality_level": 0.80,  # 80% target for research plans
    "enable_adaptive_thresholds": False,  # Strict thresholds
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


async def _generate_missing_info_error(
    content: str,
    quality_issues: list[str],
    section_config: GrantLongFormSection,
    rag_context: list[DocumentDTO],
    content_type: ContentType,
    trace_id: str,
    timeout: float = 45.0,
) -> str:
    """Generate MISSING INFORMATION error message explaining what's needed."""

    # Format quality issues
    formatted_issues = "\n".join([f"• {issue}" for issue in quality_issues])

    # Format RAG context
    rag_text = "\n".join([f"Source {i + 1}: {doc['content'][:300]}..." for i, doc in enumerate(rag_context[:3])])

    # Format keywords
    keywords_text = ", ".join(section_config.get("keywords", []))

    prompt_text = MISSING_INFO_GENERATION_PROMPT.to_string(
        content=content,
        quality_issues=formatted_issues,
        rag_context=rag_text if rag_context else "No additional context provided",
        missing_info_format=MISSING_INFO_FORMAT,
        missing_info_prefix=MISSING_INFO_PREFIX,
        missing_info_suffix=MISSING_INFO_SUFFIX,
        section_title=section_config["title"],
        content_type=content_type.value,
        target_words=section_config.get("max_words", 500),
        keywords=keywords_text if keywords_text else "None specified",
    )

    try:
        missing_info_report = await make_google_completions_request(
            prompt_identifier="missing_info_generation",
            response_type=str,
            system_prompt="You are an expert scientific content analyst identifying missing information.",
            messages=prompt_text,
            temperature=0.3,
            top_p=0.8,
            trace_id=trace_id,
            timeout=timeout,
        )

        return missing_info_report.strip()

    except Exception as e:
        logger.error("Failed to generate missing information report", error=str(e), trace_id=trace_id)
        # Return a basic error message
        return f"""{MISSING_INFO_PREFIX} Critical Information Gaps{MISSING_INFO_SUFFIX}

Unable to generate content meeting quality standards (minimum {MINIMAL_THRESHOLD * 100:.0f}%).

{MISSING_INFO_PREFIX} Quality Issues{MISSING_INFO_SUFFIX}
{formatted_issues}

{MISSING_INFO_PREFIX} Action Required{MISSING_INFO_SUFFIX}
Please provide additional context, sources, or data to support content generation."""


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
        missing_info_format=MISSING_INFO_FORMAT,
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
    content_type: ContentType | None = None,
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

    # Auto-detect content type if not provided
    if content_type is None:
        content_type = detect_content_type(section_config)

    # Get target threshold for this content type
    target_threshold = get_target_threshold(content_type)

    current_content = content
    best_score = 0.0
    best_content = content
    best_evaluation: FastEvaluationResult | None = None
    iteration = 1

    logger.info(
        "Starting evaluation with feedback loop",
        content_type=content_type.value,
        target_threshold=target_threshold,
        minimal_threshold=MINIMAL_THRESHOLD,
        max_iterations=eval_settings.get("max_iterations", 2),
        trace_id=trace_id,
    )

    max_iterations_val = eval_settings.get("max_iterations")
    max_iterations: int = 2 if max_iterations_val is None else cast("int", max_iterations_val)

    # Main improvement loop - try to reach target threshold
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

        # Check for MISSING INFORMATION markers and apply quality bonus
        missing_info_metrics = evaluate_missing_information(current_content)
        current_score = evaluation_result["overall_score"] / 100.0

        # Apply quality bonus for proper MISSING INFO usage
        adjusted_score = min(1.0, current_score + missing_info_metrics["quality_bonus"])

        # Track best result (content + evaluation)
        if adjusted_score > best_score:
            best_score = adjusted_score
            best_content = current_content
            best_evaluation = evaluation_result

        logger.info(
            "Feedback loop iteration completed",
            iteration=iteration,
            original_score=current_score,
            adjusted_score=adjusted_score,
            missing_info_count=missing_info_metrics["count"],
            quality_bonus=missing_info_metrics["quality_bonus"],
            trace_id=trace_id,
        )

        # Check if we've achieved target threshold
        if adjusted_score >= target_threshold:
            execution_time = (time.time() - start_time) * 1000
            logger.info(
                "Target threshold achieved",
                iteration=iteration,
                final_score=adjusted_score,
                target_threshold=target_threshold,
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

        # Check if we've hit max iterations
        if iteration >= max_iterations:
            break

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

    # After improvement attempts, check if best score meets minimal threshold
    if best_score >= MINIMAL_THRESHOLD and best_evaluation is not None:
        # Return best result even if below target
        execution_time = (time.time() - start_time) * 1000

        final_quality = assess_content_quality(
            overall_score=best_score,
            component_scores={
                "structural": best_evaluation["structural_metrics"]["overall"],
                "scientific_quality": best_evaluation["scientific_quality_metrics"]["overall"],
                "source_grounding": best_evaluation["source_grounding_metrics"]["overall"],
                "coherence": best_evaluation["coherence_metrics"]["overall"],
            },
            content_type=content_type,
        )

        logger.info(
            "Returning best result above minimal threshold",
            best_score=best_score,
            minimal_threshold=MINIMAL_THRESHOLD,
            target_threshold=target_threshold,
            iterations_used=iteration - 1,
            execution_time_ms=execution_time,
            trace_id=trace_id,
        )

        return ImprovementResult(
            improved_content=best_content,
            evaluation_result=best_evaluation,
            quality_assessment=final_quality,
            iteration=iteration - 1,
            improvement_applied=True,
            execution_time_ms=execution_time,
        )

    # Best score is below minimal threshold - generate MISSING INFO error
    logger.warning(
        "Content below minimal threshold, generating missing information report",
        best_score=best_score,
        minimal_threshold=MINIMAL_THRESHOLD,
        trace_id=trace_id,
    )

    # If we never got any evaluation, do a quick one for error reporting
    if best_evaluation is None:
        best_evaluation = await evaluate_scientific_content(
            content=best_content,
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=research_objectives,
            trace_id=f"{trace_id}_error_eval",
        )

    # Generate detailed missing information report
    quality_issues = _generate_improvement_instructions(best_evaluation, content_type)
    missing_info_report = await _generate_missing_info_error(
        content=best_content,
        quality_issues=quality_issues,
        section_config=section_config,
        rag_context=rag_context,
        content_type=content_type,
        trace_id=f"{trace_id}_missing_info",
        timeout=cast("float", eval_settings.get("llm_timeout"))
        if eval_settings.get("llm_timeout") is not None
        else 45.0,
    )

    # Determine if we should replace content entirely or insert localized markers
    missing_info_metrics = evaluate_missing_information(missing_info_report)

    if missing_info_metrics["content_ratio"] > 0.60:
        # More than 60% would be MISSING INFO - replace entirely
        final_content = missing_info_report
    else:
        # Less than 60% - try to preserve some content with localized markers
        final_content = f"{best_content}\n\n{missing_info_report}"

    execution_time = (time.time() - start_time) * 1000

    # Use the best evaluation we have (it was ensured to exist above)
    final_evaluation_result = best_evaluation

    final_quality = assess_content_quality(
        overall_score=best_score,
        component_scores={
            "structural": best_evaluation["structural_metrics"]["overall"],
            "scientific_quality": best_evaluation["scientific_quality_metrics"]["overall"],
            "source_grounding": best_evaluation["source_grounding_metrics"]["overall"],
            "coherence": best_evaluation["coherence_metrics"]["overall"],
        },
        content_type=content_type,
    )

    logger.info(
        "Feedback loop completed with missing information report",
        best_score=best_score,
        content_replaced_entirely=missing_info_metrics["content_ratio"] > 0.60,
        execution_time_ms=execution_time,
        trace_id=trace_id,
    )

    return ImprovementResult(
        improved_content=final_content,
        evaluation_result=final_evaluation_result,
        quality_assessment=final_quality,
        iteration=iteration - 1,
        improvement_applied=True,
        execution_time_ms=execution_time,
    )
