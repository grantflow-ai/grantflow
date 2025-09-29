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
            context["rag_context"] = [DocumentDTO(content=rag_context)]
        elif isinstance(rag_context, list):
            context["rag_context"] = rag_context

    # Add research objectives
    if research_objectives:
        context["research_objectives"] = research_objectives

    # Add reference corpus
    if reference_corpus:
        context["reference_corpus"] = reference_corpus

    # Add CFP analysis
    if cfp_analysis:
        context["cfp_analysis"] = cfp_analysis

    # Add any additional context (only for compatible keys)
    if "content_type" in additional_context:
        context["content_type"] = additional_context["content_type"]
    if "keywords" in additional_context:
        context["keywords"] = additional_context["keywords"]
    if "topics" in additional_context:
        context["topics"] = additional_context["topics"]

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

    # Adjust thresholds based on content type - clinical trial has precedence
    if is_clinical_trial and is_detailed_research_plan:
        # Both flags - use clinical trial settings (higher standards)
        settings["fast_confidence_threshold"] = 0.85
        settings["fast_accept_threshold"] = 90.0
    elif is_clinical_trial:
        # Clinical trial only
        settings["fast_confidence_threshold"] = 0.85
        settings["fast_accept_threshold"] = 90.0
    elif is_detailed_research_plan:
        # Research plan only
        settings["fast_confidence_threshold"] = 0.8
        settings["fast_accept_threshold"] = 85.0

    if is_json_content:
        # Use JSON-specific thresholds
        settings["json_confidence_threshold"] = 0.95
        settings["json_semantic_threshold"] = 0.6
        # Adjust weights for JSON evaluation
        settings["fast_weight"] = 0.5
        settings["llm_weight"] = 0.5

    # Add any additional settings (only for compatible keys)
    for key, value in additional_settings.items():
        if key == "enable_fast_evaluation" and isinstance(value, bool):
            settings["enable_fast_evaluation"] = value
        elif key == "fast_confidence_threshold" and isinstance(value, (int, float)):
            settings["fast_confidence_threshold"] = float(value)
        elif key == "fast_accept_threshold" and isinstance(value, (int, float)):
            settings["fast_accept_threshold"] = float(value)
        elif key == "fast_review_threshold" and isinstance(value, (int, float)):
            settings["fast_review_threshold"] = float(value)
        elif key == "force_llm_evaluation" and isinstance(value, bool):
            settings["force_llm_evaluation"] = value
        elif key == "llm_timeout" and isinstance(value, (int, float)):
            settings["llm_timeout"] = float(value)
        elif key == "fast_weight" and isinstance(value, (int, float)):
            settings["fast_weight"] = float(value)
        elif key == "llm_weight" and isinstance(value, (int, float)):
            settings["llm_weight"] = float(value)
        elif key == "json_confidence_threshold" and isinstance(value, (int, float)):
            settings["json_confidence_threshold"] = float(value)
        elif key == "json_semantic_threshold" and isinstance(value, (int, float)):
            settings["json_semantic_threshold"] = float(value)

    return settings
