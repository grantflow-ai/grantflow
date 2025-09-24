from dataclasses import dataclass
from typing import TYPE_CHECKING, Final, NotRequired, TypedDict

from services.rag.src.constants import INITIAL_PASSING_SCORE, MAX_RETRIES, SCORE_INCREMENT
from services.rag.src.utils.evaluation import EvaluationCriterion

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager


GENERATE_WORK_PLAN_TIMEOUT: Final[float] = 480.0


def get_completeness_criterion(weight: float = 0.9) -> EvaluationCriterion:
    return EvaluationCriterion(
        name="Completeness",
        evaluation_instructions="""
        - Verify all required components and sections are present
        - Ensure content addresses all aspects within word/scope limits
        - Check that no critical information is missing or omitted
        - If information is unavailable, **MISSING INFORMATION** markers are acceptable
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


@dataclass
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
            get_scientific_accuracy_criterion(1.0),
            get_content_depth_criterion(0.9),
            get_source_grounding_criterion(0.8),
            get_structure_clarity_criterion(0.8),
            get_feasibility_innovation_criterion(0.7),
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


def get_evaluation_kwargs[T](stage_name: str, job_manager: "JobManager[T]") -> EvaluationKwargs[T]:
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

    return kwargs
