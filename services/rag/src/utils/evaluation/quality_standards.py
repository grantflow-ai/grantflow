"""Quality standards and thresholds for scientific content evaluation.

This module defines high-quality standards for scientific content evaluation,
ensuring that only content meeting rigorous academic standards is accepted.
"""

import re
from enum import Enum
from typing import TYPE_CHECKING, Final, TypedDict

from services.rag.src.constants import MISSING_INFO_FORMAT, MISSING_INFO_PATTERN

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection


class QualityLevel(Enum):
    """Quality levels for scientific content evaluation."""

    EXCELLENT = "excellent"  # 80%+ - Publication ready, high academic rigor
    GOOD = "good"  # 65-80% - Strong quality, minor improvements needed
    ACCEPTABLE = "acceptable"  # 50-65% - Meets minimum standards, requires review
    POOR = "poor"  # 35-50% - Below standards, major improvements needed
    UNACCEPTABLE = "unacceptable"  # <35% - Reject, fundamental issues


class ContentType(Enum):
    """Types of scientific content with different quality expectations."""

    RESEARCH_PLAN = "research_plan"  # Core research methodology - highest standards
    CLINICAL_TRIAL = "clinical_trial"
    GENERAL_SCIENTIFIC = "general_scientific"  # Generic STEM/translational sections
    ADMINISTRATIVE = "administrative"  # Letters, team, resources, etc.


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
    ContentType.RESEARCH_PLAN: {
        "scientific_quality": 0.75,  # High bar for research plans
        "source_grounding": 0.70,  # Must be well-grounded
        "coherence": 0.70,  # Clear methodology essential
        "structural": 0.65,  # Well-organized
    },
    ContentType.GENERAL_SCIENTIFIC: {
        "scientific_quality": 0.60,
        "source_grounding": 0.55,
        "coherence": 0.55,
        "structural": 0.50,
    },
    ContentType.ADMINISTRATIVE: {
        "scientific_quality": 0.45,  # Lower bar for admin sections
        "source_grounding": 0.40,
        "coherence": 0.50,  # Still needs to be coherent
        "structural": 0.45,
    },
}

# Overall score requirements for acceptance
# Target thresholds we aim for (but allow fallback to MINIMAL_THRESHOLD)
TARGET_THRESHOLDS: Final[dict[ContentType, float]] = {
    ContentType.RESEARCH_PLAN: 0.80,  # Research plans need high quality
    ContentType.CLINICAL_TRIAL: 0.70,  # Clinical content needs rigor
    ContentType.GENERAL_SCIENTIFIC: 0.65,  # Standard scientific sections
    ContentType.ADMINISTRATIVE: 0.60,  # Admin sections more lenient
}

# Absolute minimum threshold - if we can't reach this, generate MISSING INFO error
MINIMAL_THRESHOLD: Final[float] = 0.60  # Universal fallback threshold

# Legacy name for compatibility
ACCEPTANCE_THRESHOLDS = TARGET_THRESHOLDS


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
    content_type: ContentType = ContentType.GENERAL_SCIENTIFIC,
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

    # Check against target threshold (what we aim for)
    target_threshold = TARGET_THRESHOLDS.get(content_type, 0.65)
    meets_target = overall_score >= target_threshold and not failing_components

    # Check against minimal threshold (absolute minimum for acceptance)
    meets_minimal = overall_score >= MINIMAL_THRESHOLD

    # Generate recommendation based on thresholds
    if meets_target:
        recommendation = "Accept - Meets target quality standards"
    elif meets_minimal:
        recommendation = "Accept with reservations - Meets minimal threshold"
    else:
        recommendation = "Reject - Below minimal acceptable threshold"

    # Keep old meets_requirements for backwards compatibility
    meets_requirements = meets_target

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


def detect_content_type(section_config: "GrantLongFormSection") -> ContentType:
    """Detect content type from section configuration.

    Args:
        section_config: Grant section configuration

    Returns:
        Detected content type
    """
    # Check explicit flags first
    if section_config.get("is_detailed_research_plan"):
        return ContentType.RESEARCH_PLAN

    if section_config.get("is_clinical_trial"):
        return ContentType.CLINICAL_TRIAL

    # Check title/keywords for section type
    title = section_config.get("title", "").lower()

    # Administrative sections
    if any(term in title for term in ["letter", "team", "personnel", "resources", "facilities", "budget"]):
        return ContentType.ADMINISTRATIVE

    # Default to general scientific
    return ContentType.GENERAL_SCIENTIFIC


def evaluate_missing_information(content: str) -> dict[str, float]:
    """Evaluate proper use of MISSING INFORMATION markers.

    Args:
        content: Text content to evaluate

    Returns:
        Dictionary with missing info metrics
    """
    markers = re.findall(MISSING_INFO_PATTERN, content)

    if not markers:
        return {
            "count": 0,
            "quality_bonus": 0.0,
            "content_ratio": 0.0,
        }

    # Calculate ratio of content that is MISSING INFO
    marker_chars = sum(len(MISSING_INFO_FORMAT.format(description=m)) for m in markers)
    content_ratio = marker_chars / max(len(content), 1)

    # Quality factors:
    # - Specific descriptions (not generic)
    # - Appropriate placement (not overused)
    quality_bonus = 0.0

    if markers:
        # Check specificity (longer = more specific)
        avg_length = sum(len(m) for m in markers) / len(markers)
        if avg_length > 20:  # Specific descriptions
            quality_bonus += 0.05

        # Check not overused (< 30% of content)
        if content_ratio < 0.3:
            quality_bonus += 0.03

        # Base bonus for following guidelines
        quality_bonus += 0.02

    return {
        "count": len(markers),
        "quality_bonus": min(0.10, quality_bonus),  # Cap at 10% bonus
        "content_ratio": content_ratio,
    }


def get_target_threshold(content_type: ContentType) -> float:
    """Get target threshold we aim for."""
    return TARGET_THRESHOLDS.get(content_type, 0.65)


def get_component_requirements(content_type: ContentType) -> dict[str, float]:
    """Get component-specific requirements for content type."""
    return COMPONENT_REQUIREMENTS.get(content_type, COMPONENT_REQUIREMENTS[ContentType.GENERAL_SCIENTIFIC]).copy()
