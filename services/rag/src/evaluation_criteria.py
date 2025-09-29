from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Final, NotRequired, TypedDict

from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.constants import INITIAL_PASSING_SCORE, MAX_RETRIES, MISSING_INFO_INSTRUCTION, SCORE_INCREMENT
from services.rag.src.utils.evaluation import EvaluationCriterion
from services.rag.src.utils.evaluation.context_builder import (
    build_evaluation_context,
    build_evaluation_settings,
)
from services.rag.src.utils.evaluation.dto import EvaluationContext, EvaluationSettings

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager


GENERATE_WORK_PLAN_TIMEOUT: Final[float] = 480.0


def get_completeness_criterion(weight: float = 0.9) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Completeness",
        evaluation_instructions=f"""
        - Verify all required components and sections are present
        - Ensure content addresses all aspects within word/scope limits
        - Check that no critical information is missing or omitted
        - {MISSING_INFO_INSTRUCTION}
        """,
        weight=weight,
    )


def get_scientific_accuracy_criterion(weight: float = 1.0) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Scientific Accuracy",
        evaluation_instructions="""
        - Verify use of precise, field-specific technical terminology
        - Ensure all facts, methodologies, and data are accurate
        - Check that no hallucinated information is present (invented facts, people, terms)
        - Confirm scientific concepts are correctly explained and applied
        """,
        weight=weight,
    )


def get_source_grounding_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Source Grounding",
        evaluation_instructions="""
        - Confirm content is firmly grounded in provided source materials
        - Verify accurate reflection of source information without distortion
        - Check proper synthesis of multiple sources when applicable
        - Ensure no information contradicts or goes beyond available sources
        """,
        weight=weight,
    )


def get_structure_clarity_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Structure & Clarity",
        evaluation_instructions="""
        - Ensure logical organization and flow of content
        - Verify clear transitions between sections and concepts
        - Check appropriate use of academic tone and formal writing style
        - Confirm proper formatting and structural coherence
        """,
        weight=weight,
    )


def get_strategic_value_criterion(weight: float = 0.7) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Strategic Value",
        evaluation_instructions="""
        - Evaluate content's contribution to grant application strength
        - Check emphasis on aspects likely to impress reviewers
        - Verify alignment with funding agency priorities and expectations
        - Ensure content supports persuasive, competitive narrative
        """,
        weight=weight,
    )


def get_extraction_quality_criterion(weight: float = 0.9) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Extraction Quality",
        evaluation_instructions="""
        - Verify accurate identification and extraction of required information
        - Check proper prioritization of mandatory vs optional content
        - Ensure structural elements (deadlines, limits, requirements) are captured
        - Confirm filtering of irrelevant administrative details
        """,
        weight=weight,
    )


def get_synthesis_coherence_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Synthesis & Coherence",
        evaluation_instructions="""
        - Evaluate coherent integration of multiple concepts or sources
        - Check logical relationships and dependencies between components
        - Verify consistent narrative flow and conceptual alignment
        - Ensure proper handling of conflicting or complex information
        """,
        weight=weight,
    )


def get_compliance_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Compliance",
        evaluation_instructions="""
        - Verify adherence to specified formatting and structural requirements
        - Check compliance with organizational or funding agency guidelines
        - Ensure proper handling of word limits, section requirements, and constraints
        - Confirm alignment with evaluation criteria and submission standards
        """,
        weight=weight,
    )


def get_information_density_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Information Density",
        evaluation_instructions="""
        - Ensure high information density with minimal redundancy
        - Confirm use of expert terminology to convey complex concepts effectively
        - Verify content maximizes value within word/space constraints
        - Check that all information contributes meaningfully to the objective
        """,
        weight=weight,
    )


def get_multi_source_synthesis_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Multi-Source Synthesis",
        evaluation_instructions="""
        - Assess whether information from all available sources has been properly synthesized
        - Verify conflicts between sources are resolved appropriately
        - Check that diverse perspectives are integrated coherently
        - Ensure no critical source material is overlooked or dismissed
        """,
        weight=weight,
    )


def get_content_depth_criterion(weight: float = 0.9) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Content Depth",
        evaluation_instructions="""
        - Verify content provides sufficient detail and depth for the context
        - Check that technical concepts are explained with appropriate rigor
        - Ensure methodological descriptions are comprehensive and precise
        - Confirm content demonstrates expertise and thorough understanding
        """,
        weight=weight,
    )


def get_content_depth_detail_criterion(weight: float = 1.0) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Content Depth and Detail",
        evaluation_instructions="""
        Evaluate whether the content provides sufficient depth, specific details, and comprehensive coverage of the topic.
            - Content should be substantive (600+ words for major sections)
            - Include specific examples, methodologies, and timelines
            - Demonstrate expert knowledge with concrete details
            - Avoid generic statements in favor of specific, actionable content
        """,
        weight=weight,
    )


def get_structural_completeness_criterion(weight: float = 0.95) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Structural Completeness",
        evaluation_instructions="""
        Assess whether the content includes key structural elements and proper organization.
            - Clear objectives and research questions
            - Methodological approaches and experimental designs
            - Work plan elements with timelines
            - Expected outcomes and success metrics
            - Proper section organization with headers and subheadings
        """,
        weight=weight,
    )


def get_context_integration_evidence_criterion(weight: float = 0.85) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Context Integration and Evidence",
        evaluation_instructions="""
        Evaluate how effectively the content integrates information from the provided research context.
            - Clear use of provided research context and retrieval data
            - Specific evidence from context incorporated naturally
            - Strong connections to stated research objectives
            - Relevant citations and references to context material
            - Claims supported by context evidence
            - Research objectives clearly addressed
            - Context information woven into narrative seamlessly
            - No contradictions with provided context
        """,
        weight=weight,
    )


def get_academic_quality_rigor_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Academic Quality and Rigor",
        evaluation_instructions="""
        Assess the professional quality, scientific accuracy, and academic appropriateness of the writing.
            - Professional, scholarly tone throughout
            - Precise scientific terminology used correctly
            - Clear, concise writing with proper grammar
            - Appropriate academic register and style
            - Demonstrates understanding of research methodologies
            - Uses appropriate statistical and analytical approaches
            - Shows awareness of field standards and best practices
            - Maintains objectivity and scientific rigor
        """,
        weight=weight,
    )


def get_rag_data_integration_criterion(weight: float = 0.85) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="RAG Data Integration and N-gram Usage",
        evaluation_instructions="""
        Assess the extensive use of RAG scientific data and effective n-gram integration.
            - **MAXIMIZES USE OF RAG CONTEXT** - quotes, references, and incorporates provided scientific data extensively
            - Demonstrates clear evidence of pre-identifying n-grams (1-grams, 2-grams, 3-grams, 4-grams) from RAG sources
            - Integrates identified scientific terms naturally throughout the text
            - Shows extensive quoting and paraphrasing from provided research context
            - Uses RAG data as primary source material rather than generic statements
            - Incorporates specific findings, methodologies, and results from RAG context
            - Maintains scientific rigor by grounding claims in provided research data
            - Demonstrates that the text is built FROM the RAG context, not just supplemented by it
        """,
        weight=weight,
    )


def get_feasibility_innovation_criterion(weight: float = 0.7) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Feasibility & Innovation",
        evaluation_instructions="""
        - Assess practical feasibility of proposed approaches and methodologies
        - Evaluate innovative aspects and novel contributions
        - Check realistic resource requirements and timeline considerations
        - Verify balance between ambition and achievability
        """,
        weight=weight,
    )


def get_context_integration_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Context Integration",
        evaluation_instructions="""
        - Assess how well content incorporates provided contextual information
        - Check effective integration of keywords, topics, and background material
        - Verify appropriate use of domain-specific knowledge and terminology
        - Ensure content builds appropriately on existing research and frameworks
        """,
        weight=weight,
    )


def get_relationship_coherence_criterion(weight: float = 0.9) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Relationship Coherence",
        evaluation_instructions="""
        - Evaluate accuracy of identified relationships and dependencies
        - Check logical consistency between related components
        - Verify bidirectional considerations are properly addressed
        - Ensure relationship descriptions enhance overall narrative coherence
        """,
        weight=weight,
    )


def get_filtering_accuracy_criterion(weight: float = 0.8) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Filtering Accuracy",
        evaluation_instructions="""
        - Validate removal of unnecessary administrative and general information
        - Ensure retention of all essential and mandatory requirements
        - Check proper categorization of optional vs required content
        - Verify focus on substantive content relevant to grant applications
        """,
        weight=weight,
    )


@dataclass(slots=True)
class StageConfig:
    criteria: list[EvaluationCriterion]
    passing_score: int = INITIAL_PASSING_SCORE
    increment: int = SCORE_INCREMENT
    retries: int = MAX_RETRIES
    timeout_override: float | None = None


def get_extract_cfp_data_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_extraction_quality_criterion(0.9),
            get_multi_source_synthesis_criterion(0.8),
            get_filtering_accuracy_criterion(0.8),
            get_scientific_accuracy_criterion(1.0),
            get_completeness_criterion(0.8),
        ]
    )


def get_extract_sections_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_extraction_quality_criterion(0.9),
            get_structure_clarity_criterion(0.8),
            get_source_grounding_criterion(0.8),
            get_completeness_criterion(0.8),
            get_compliance_criterion(0.8),
        ]
    )


def get_generate_metadata_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_structure_clarity_criterion(0.8),
            get_completeness_criterion(0.8),
            get_compliance_criterion(0.7),
        ]
    )


def get_extract_relationships_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_relationship_coherence_criterion(0.9),
            get_scientific_accuracy_criterion(1.0),
            get_source_grounding_criterion(0.8),
            get_completeness_criterion(0.8),
            get_strategic_value_criterion(0.7),
        ],
    )


def get_enrich_objectives_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_scientific_accuracy_criterion(1.0),
            get_context_integration_criterion(0.9),
            get_completeness_criterion(0.8),
            get_source_grounding_criterion(0.8),
            get_strategic_value_criterion(0.7),
        ]
    )


def get_generate_section_text_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_content_depth_detail_criterion(1.0),
            get_structural_completeness_criterion(0.95),
            get_context_integration_evidence_criterion(0.85),
            get_rag_data_integration_criterion(0.85),
            get_academic_quality_rigor_criterion(0.8),
            get_feasibility_innovation_criterion(0.75),
        ],
    )


def get_generate_work_plan_config() -> StageConfig:
    return StageConfig(
        criteria=[
            get_scientific_accuracy_criterion(1.0),
            get_completeness_criterion(0.9),
            get_information_density_criterion(0.8),
            get_source_grounding_criterion(0.8),
            get_strategic_value_criterion(0.7),
        ],
        timeout_override=GENERATE_WORK_PLAN_TIMEOUT,
    )


STAGE_CONFIGS: Final[dict[str, StageConfig]] = {
    "extract_cfp_data": get_extract_cfp_data_config(),
    "extract_sections": get_extract_sections_config(),
    "generate_metadata": get_generate_metadata_config(),
    "extract_relationships": get_extract_relationships_config(),
    "enrich_objectives": get_enrich_objectives_config(),
    "generate_section_text": get_generate_section_text_config(),
    "generate_work_plan": get_generate_work_plan_config(),
}


def get_stage_config(stage_name: str) -> StageConfig:
    if stage_name not in STAGE_CONFIGS:
        available_stages = ", ".join(STAGE_CONFIGS.keys())
        raise KeyError(f"Unknown stage '{stage_name}'. Available stages: {available_stages}")

    return STAGE_CONFIGS[stage_name]


class EvaluationKwargs[T](TypedDict):
    criteria: list[EvaluationCriterion]
    passing_score: int
    increment: int
    retries: int
    job_manager: "JobManager[T]"
    timeout: NotRequired[float]
    context: NotRequired[EvaluationContext]
    settings: NotRequired[EvaluationSettings]


def get_evaluation_kwargs[T](
    stage_name: str,
    job_manager: "JobManager[T]",
    *,
    section_config: GrantLongFormSection | None = None,
    rag_context: Any | None = None,
    research_objectives: Any | None = None,
    cfp_analysis: Any | None = None,
    is_json_content: bool = False,
    **additional_context: Any,
) -> EvaluationKwargs[T]:
    """Get evaluation kwargs with proper context.

    Args:
        stage_name: Name of the evaluation stage
        job_manager: Job manager instance
        section_config: Section configuration with keywords, topics
        rag_context: RAG retrieval context
        research_objectives: Research objectives
        cfp_analysis: CFP analysis data
        is_json_content: Whether evaluating JSON content
        **additional_context: Additional context to pass

    Returns:
        Complete evaluation kwargs including context
    """
    config = get_stage_config(stage_name)

    kwargs = EvaluationKwargs[T](
        criteria=config.criteria,
        passing_score=config.passing_score,
        increment=config.increment,
        retries=config.retries,
        job_manager=job_manager,
    )

    if config.timeout_override:
        kwargs["timeout"] = config.timeout_override

    # Build evaluation context from available data
    if section_config or rag_context or research_objectives or cfp_analysis:
        context = build_evaluation_context(
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=research_objectives,
            cfp_analysis=cfp_analysis,
            **additional_context,
        )
        kwargs["context"] = context

    # Build evaluation settings based on content type
    if section_config:
        settings = build_evaluation_settings(
            is_clinical_trial=bool(section_config.get("is_clinical_trial")),
            is_detailed_research_plan=bool(section_config.get("is_detailed_research_plan")),
            is_json_content=is_json_content,
        )
        kwargs["settings"] = settings

    return kwargs
