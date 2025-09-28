"""Quality standards and thresholds for scientific content evaluation.

This module defines high-quality standards for scientific content evaluation,
ensuring that only content meeting rigorous academic standards is accepted.
"""

from enum import Enum
from typing import Final, TypedDict


class QualityLevel(Enum):
    """Quality levels for scientific content evaluation."""

    EXCELLENT = "excellent"  # 80%+ - Publication ready, high academic rigor
    GOOD = "good"  # 65-80% - Strong quality, minor improvements needed
    ACCEPTABLE = "acceptable"  # 50-65% - Meets minimum standards, requires review
    POOR = "poor"  # 35-50% - Below standards, major improvements needed
    UNACCEPTABLE = "unacceptable"  # <35% - Reject, fundamental issues


class ContentType(Enum):
    """Types of scientific content with different quality expectations."""

    CLINICAL_TRIAL = "clinical_trial"
    BIOMEDICAL_RESEARCH = "biomedical_research"
    METHODOLOGY = "methodology"
    LITERATURE_REVIEW = "literature_review"
    PRELIMINARY_DATA = "preliminary_data"


# Quality score thresholds (0.0 to 1.0 scale)
QUALITY_THRESHOLDS: Final[dict[QualityLevel, float]] = {
    QualityLevel.EXCELLENT: 0.80,
    QualityLevel.GOOD: 0.65,
    QualityLevel.ACCEPTABLE: 0.50,
    QualityLevel.POOR: 0.35,
    QualityLevel.UNACCEPTABLE: 0.0,
}

# Component-specific minimum requirements for different content types
COMPONENT_REQUIREMENTS: Final[dict[ContentType, dict[str, float]]] = {
    ContentType.CLINICAL_TRIAL: {
        "scientific_quality": 0.70,  # High bar for clinical content
        "source_grounding": 0.65,  # Must cite evidence
        "coherence": 0.60,  # Clear communication essential
        "structural": 0.55,  # Well-organized
    },
    ContentType.BIOMEDICAL_RESEARCH: {
        "scientific_quality": 0.65,
        "source_grounding": 0.60,
        "coherence": 0.55,
        "structural": 0.50,
    },
    ContentType.METHODOLOGY: {
        "scientific_quality": 0.70,  # Methods must be precise
        "source_grounding": 0.50,  # Less citation-dependent
        "coherence": 0.65,  # Clarity crucial
        "structural": 0.60,  # Well-structured
    },
    ContentType.LITERATURE_REVIEW: {
        "scientific_quality": 0.60,
        "source_grounding": 0.75,  # Heavy citation requirement
        "coherence": 0.65,
        "structural": 0.60,
    },
    ContentType.PRELIMINARY_DATA: {
        "scientific_quality": 0.55,  # Slightly lower for preliminary
        "source_grounding": 0.45,
        "coherence": 0.50,
        "structural": 0.45,
    },
}

# Overall score requirements for acceptance
ACCEPTANCE_THRESHOLDS: Final[dict[ContentType, float]] = {
    ContentType.CLINICAL_TRIAL: 0.70,  # 70% minimum for clinical content
    ContentType.BIOMEDICAL_RESEARCH: 0.65,  # 65% for research content
    ContentType.METHODOLOGY: 0.65,  # 65% for methodology
    ContentType.LITERATURE_REVIEW: 0.60,  # 60% for reviews
    ContentType.PRELIMINARY_DATA: 0.55,  # 55% for preliminary work
}


class QualityAssessment(TypedDict):
    """Result of quality assessment."""

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
    content_type: ContentType = ContentType.BIOMEDICAL_RESEARCH,
) -> QualityAssessment:
    """Assess content quality against rigorous academic standards.

    Args:
        overall_score: Overall evaluation score (0.0 to 1.0)
        component_scores: Individual component scores
        content_type: Type of content being evaluated

    Returns:
        Quality assessment with detailed feedback
    """
    # Determine quality level
    quality_level = QualityLevel.UNACCEPTABLE
    for level in [QualityLevel.EXCELLENT, QualityLevel.GOOD, QualityLevel.ACCEPTABLE, QualityLevel.POOR]:
        if overall_score >= QUALITY_THRESHOLDS[level]:
            quality_level = level
            break

    # Check component requirements
    requirements = COMPONENT_REQUIREMENTS[content_type]
    failing_components = []

    for component, min_score in requirements.items():
        if component in component_scores and component_scores[component] < min_score:
            failing_components.append(component)

    # Check overall acceptance threshold
    acceptance_threshold = ACCEPTANCE_THRESHOLDS[content_type]
    meets_requirements = overall_score >= acceptance_threshold and not failing_components

    # Generate recommendation
    if quality_level == QualityLevel.EXCELLENT:
        recommendation = "Accept - Excellent quality, publication ready"
    elif quality_level == QualityLevel.GOOD and meets_requirements:
        recommendation = "Accept - Good quality, minor revisions may improve"
    elif quality_level == QualityLevel.ACCEPTABLE and meets_requirements:
        recommendation = "Conditional Accept - Meets minimum standards, review recommended"
    elif quality_level == QualityLevel.POOR or failing_components:
        recommendation = "Major Revisions Required - Below quality standards"
    else:
        recommendation = "Reject - Fundamental quality issues, complete rewrite needed"

    # Generate improvement areas
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


def get_minimum_threshold(content_type: ContentType) -> float:
    """Get minimum acceptable threshold for content type."""
    return ACCEPTANCE_THRESHOLDS[content_type]


def get_component_requirements(content_type: ContentType) -> dict[str, float]:
    """Get component-specific requirements for content type."""
    return COMPONENT_REQUIREMENTS[content_type].copy()
