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
    context = EvaluationContext()

    if section_config:
        context["section_config"] = section_config

    if rag_context:
        if isinstance(rag_context, str):
            context["rag_context"] = [DocumentDTO(content=rag_context)]
        elif isinstance(rag_context, list):
            context["rag_context"] = rag_context

    if research_objectives:
        context["research_objectives"] = research_objectives

    if reference_corpus:
        context["reference_corpus"] = reference_corpus

    if cfp_analysis:
        context["cfp_analysis"] = cfp_analysis

    if "content_type" in additional_context:
        context["content_type"] = additional_context["content_type"]
    if "keywords" in additional_context:
        context["keywords"] = additional_context["keywords"]
    if "topics" in additional_context:
        context["topics"] = additional_context["topics"]

    return context


def build_evaluation_settings(
    *,
    enable_nlp_evaluation: bool = True,
    force_llm_evaluation: bool = False,
    is_clinical_trial: bool = False,
    is_detailed_research_plan: bool = False,
    is_json_content: bool = False,
    **additional_settings: Any,
) -> EvaluationSettings:
    settings = EvaluationSettings(
        enable_nlp_evaluation=enable_nlp_evaluation,
        force_llm_evaluation=force_llm_evaluation,
    )

    if (is_clinical_trial and is_detailed_research_plan) or is_clinical_trial:
        settings["nlp_confidence_threshold"] = 0.85
        settings["nlp_accept_threshold"] = 90.0
    elif is_detailed_research_plan:
        settings["nlp_confidence_threshold"] = 0.8
        settings["nlp_accept_threshold"] = 85.0

    if is_json_content:
        settings["json_confidence_threshold"] = 0.95
        settings["json_semantic_threshold"] = 0.6
        settings["nlp_weight"] = 0.5
        settings["llm_weight"] = 0.5

    for key, value in additional_settings.items():
        match key:
            case "enable_nlp_evaluation" if isinstance(value, bool):
                settings["enable_nlp_evaluation"] = value
            case "nlp_confidence_threshold" if isinstance(value, (int, float)):
                settings["nlp_confidence_threshold"] = float(value)
            case "nlp_accept_threshold" if isinstance(value, (int, float)):
                settings["nlp_accept_threshold"] = float(value)
            case "nlp_review_threshold" if isinstance(value, (int, float)):
                settings["nlp_review_threshold"] = float(value)
            case "force_llm_evaluation" if isinstance(value, bool):
                settings["force_llm_evaluation"] = value
            case "llm_timeout" if isinstance(value, (int, float)):
                settings["llm_timeout"] = float(value)
            case "nlp_weight" if isinstance(value, (int, float)):
                settings["nlp_weight"] = float(value)
            case "llm_weight" if isinstance(value, (int, float)):
                settings["llm_weight"] = float(value)
            case "json_confidence_threshold" if isinstance(value, (int, float)):
                settings["json_confidence_threshold"] = float(value)
            case "json_semantic_threshold" if isinstance(value, (int, float)):
                settings["json_semantic_threshold"] = float(value)

    return settings
