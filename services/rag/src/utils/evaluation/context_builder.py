"""Context builder for evaluation - ensures all available context is properly passed."""

from typing import Any

from packages.db.src.json_objects import (
    CFPAnalysisResult,
    GrantLongFormSection,
    ResearchObjective,
)

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.dto import EvaluationContext, EvaluationSettings


def build_evaluation_context(
    *,
    section_config: GrantLongFormSection | None = None,
    rag_context: str | list[DocumentDTO] | None = None,
    research_objectives: list[ResearchObjective] | None = None,
    cfp_analysis: CFPAnalysisResult | None = None,
    reference_corpus: list[str] | None = None,
    **additional_context: Any,
) -> EvaluationContext:
    """Build evaluation context from available data sources.

    Args:
        section_config: Section configuration with keywords, topics, etc.
        rag_context: RAG retrieval context (string or documents)
        research_objectives: Research objectives for the grant
        cfp_analysis: CFP requirements analysis
        reference_corpus: Additional reference texts
        **additional_context: Any additional context to include

    Returns:
        Properly formatted EvaluationContext
    """
    context = EvaluationContext()

    # Add section configuration if available
    if section_config:
        context["section_config"] = section_config

    # Handle RAG context - convert string to DocumentDTO if needed
    if rag_context:
        if isinstance(rag_context, str):
            # Convert string context to DocumentDTO list
            context["rag_context"] = [
                DocumentDTO(content=rag_context)
            ]
        elif isinstance(rag_context, list):
            context["rag_context"] = rag_context

    # Add research objectives
    if research_objectives:
        context["research_objectives"] = research_objectives

    # Add reference corpus
    if reference_corpus:
        context["reference_corpus"] = reference_corpus

    # Add CFP analysis as additional context
    if cfp_analysis:
        # Store in additional context for now
        # Could extend EvaluationContext to include cfp_analysis field
        context.update({"cfp_analysis": cfp_analysis})

    # Add any additional context
    context.update(additional_context)

    return context


def build_evaluation_settings(
    *,
    enable_fast_evaluation: bool = True,
    force_llm_evaluation: bool = False,
    is_clinical_trial: bool = False,
    is_detailed_research_plan: bool = False,
    is_json_content: bool = False,
    **additional_settings: Any,
) -> EvaluationSettings:
    """Build evaluation settings based on content type.

    Args:
        enable_fast_evaluation: Whether to use fast evaluation
        force_llm_evaluation: Whether to force LLM evaluation
        is_clinical_trial: Whether this is clinical trial content
        is_detailed_research_plan: Whether this is a research plan
        is_json_content: Whether evaluating JSON content
        **additional_settings: Any additional settings

    Returns:
        Properly configured EvaluationSettings
    """
    settings = EvaluationSettings(
        enable_fast_evaluation=enable_fast_evaluation,
        force_llm_evaluation=force_llm_evaluation,
    )

    # Adjust thresholds based on content type
    if is_clinical_trial:
        # Higher standards for clinical trials
        settings["fast_confidence_threshold"] = 0.85
        settings["fast_accept_threshold"] = 90.0

    if is_detailed_research_plan:
        # Higher standards for research plans
        settings["fast_confidence_threshold"] = 0.8
        settings["fast_accept_threshold"] = 85.0

    if is_json_content:
        # Use JSON-specific thresholds
        settings["json_confidence_threshold"] = 0.95
        settings["json_semantic_threshold"] = 0.6
        # Adjust weights for JSON evaluation
        settings["fast_weight"] = 0.5
        settings["llm_weight"] = 0.5

    # Add any additional settings
    settings.update(additional_settings)

    return settings
