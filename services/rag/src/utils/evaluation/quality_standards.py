import re
from enum import Enum
from typing import TYPE_CHECKING, Final, TypedDict

from services.rag.src.constants import MISSING_INFO_FORMAT, MISSING_INFO_PATTERN

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection


class QualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    UNACCEPTABLE = "unacceptable"


class ContentType(Enum):
    RESEARCH_PLAN = "research_plan"
    CLINICAL_TRIAL = "clinical_trial"
    BIOMEDICAL_RESEARCH = "biomedical_research"
    METHODOLOGY = "methodology"
    LITERATURE_REVIEW = "literature_review"
    PRELIMINARY_DATA = "preliminary_data"
    GENERAL_SCIENTIFIC = "general_scientific"
    ADMINISTRATIVE = "administrative"


QUALITY_THRESHOLDS: Final[dict[QualityLevel, float]] = {
    QualityLevel.EXCELLENT: 0.80,
    QualityLevel.GOOD: 0.65,
    QualityLevel.ACCEPTABLE: 0.50,
    QualityLevel.POOR: 0.35,
    QualityLevel.UNACCEPTABLE: 0.0,
}

COMPONENT_REQUIREMENTS: Final[dict[ContentType, dict[str, float]]] = {
    ContentType.CLINICAL_TRIAL: {
        "scientific_quality": 0.70,
        "source_grounding": 0.65,
        "coherence": 0.60,
        "structural": 0.55,
    },
    ContentType.RESEARCH_PLAN: {
        "scientific_quality": 0.75,
        "source_grounding": 0.70,
        "coherence": 0.70,
        "structural": 0.65,
    },
    ContentType.BIOMEDICAL_RESEARCH: {
        "scientific_quality": 0.65,
        "source_grounding": 0.60,
        "coherence": 0.60,
        "structural": 0.55,
    },
    ContentType.METHODOLOGY: {
        "scientific_quality": 0.65,
        "source_grounding": 0.55,
        "coherence": 0.65,
        "structural": 0.60,
    },
    ContentType.LITERATURE_REVIEW: {
        "scientific_quality": 0.60,
        "source_grounding": 0.70,
        "coherence": 0.60,
        "structural": 0.55,
    },
    ContentType.PRELIMINARY_DATA: {
        "scientific_quality": 0.55,
        "source_grounding": 0.50,
        "coherence": 0.55,
        "structural": 0.50,
    },
    ContentType.GENERAL_SCIENTIFIC: {
        "scientific_quality": 0.60,
        "source_grounding": 0.55,
        "coherence": 0.55,
        "structural": 0.50,
    },
    ContentType.ADMINISTRATIVE: {
        "scientific_quality": 0.45,
        "source_grounding": 0.40,
        "coherence": 0.50,
        "structural": 0.45,
    },
}

TARGET_THRESHOLDS: Final[dict[ContentType, float]] = {
    ContentType.RESEARCH_PLAN: 0.80,
    ContentType.CLINICAL_TRIAL: 0.70,
    ContentType.BIOMEDICAL_RESEARCH: 0.65,
    ContentType.METHODOLOGY: 0.65,
    ContentType.LITERATURE_REVIEW: 0.60,
    ContentType.PRELIMINARY_DATA: 0.55,
    ContentType.GENERAL_SCIENTIFIC: 0.65,
    ContentType.ADMINISTRATIVE: 0.60,
}

MINIMAL_THRESHOLD: Final[float] = 0.60

ACCEPTANCE_THRESHOLDS = TARGET_THRESHOLDS


class QualityAssessment(TypedDict):
    quality_level: QualityLevel
    overall_score: float
    meets_requirements: bool
    component_scores: dict[str, float]
    failing_components: list[str]
    recommendation: str
    improvement_areas: list[str]


def assess_content_quality(
    overall_score: float,
    component_scores: dict[str, float],
    content_type: ContentType = ContentType.GENERAL_SCIENTIFIC,
) -> QualityAssessment:
    quality_level = QualityLevel.UNACCEPTABLE
    for level in [QualityLevel.EXCELLENT, QualityLevel.GOOD, QualityLevel.ACCEPTABLE, QualityLevel.POOR]:
        if overall_score >= QUALITY_THRESHOLDS[level]:
            quality_level = level
            break

    requirements = COMPONENT_REQUIREMENTS[content_type]
    failing_components = []

    for component, min_score in requirements.items():
        if component in component_scores and component_scores[component] < min_score:
            failing_components.append(component)

    target_threshold = TARGET_THRESHOLDS.get(content_type, 0.65)
    meets_target = overall_score >= target_threshold and not failing_components

    meets_minimal = overall_score >= MINIMAL_THRESHOLD

    if meets_target:
        recommendation = "Accept - Meets target quality standards"
    elif meets_minimal:
        recommendation = "Accept with reservations - Meets minimal threshold"
    else:
        recommendation = "Reject - Below minimal acceptable threshold"

    meets_requirements = meets_target

    improvement_areas = []

    if overall_score < QUALITY_THRESHOLDS[QualityLevel.GOOD]:
        if "scientific_quality" in failing_components:
            improvement_areas.append("Enhance scientific rigor and technical precision")
        if "source_grounding" in failing_components:
            improvement_areas.append("Strengthen evidence base and citation support")
        if "coherence" in failing_components:
            improvement_areas.append("Improve logical flow and argument structure")
        if "structural" in failing_components:
            improvement_areas.append("Better organize content with clear sections")

    if not improvement_areas and overall_score < QUALITY_THRESHOLDS[QualityLevel.EXCELLENT]:
        improvement_areas.append("Polish for publication-level quality")

    return QualityAssessment(
        quality_level=quality_level,
        overall_score=overall_score,
        meets_requirements=meets_requirements,
        component_scores=component_scores,
        failing_components=failing_components,
        recommendation=recommendation,
        improvement_areas=improvement_areas,
    )


def detect_content_type(section_config: "GrantLongFormSection") -> ContentType:
    if section_config.get("is_detailed_research_plan"):
        return ContentType.RESEARCH_PLAN

    if section_config.get("is_clinical_trial"):
        return ContentType.CLINICAL_TRIAL

    title = section_config.get("title", "").lower()

    if any(term in title for term in ["letter", "team", "personnel", "resources", "facilities", "budget"]):
        return ContentType.ADMINISTRATIVE

    return ContentType.GENERAL_SCIENTIFIC


def evaluate_missing_information(content: str) -> dict[str, float]:
    markers = re.findall(MISSING_INFO_PATTERN, content)

    if not markers:
        return {
            "count": 0,
            "quality_bonus": 0.0,
            "content_ratio": 0.0,
        }

    marker_chars = sum(len(MISSING_INFO_FORMAT.format(description=m)) for m in markers)
    content_ratio = marker_chars / max(len(content), 1)

    quality_bonus = 0.0

    if markers:
        avg_length = sum(len(m) for m in markers) / len(markers)
        if avg_length > 20:
            quality_bonus += 0.05

        if content_ratio < 0.3:
            quality_bonus += 0.03

        quality_bonus += 0.02

    return {
        "count": len(markers),
        "quality_bonus": min(0.10, quality_bonus),
        "content_ratio": content_ratio,
    }


def get_target_threshold(content_type: ContentType) -> float:
    return TARGET_THRESHOLDS.get(content_type, 0.65)


def get_component_requirements(content_type: ContentType) -> dict[str, float]:
    return COMPONENT_REQUIREMENTS.get(content_type, COMPONENT_REQUIREMENTS[ContentType.GENERAL_SCIENTIFIC]).copy()
