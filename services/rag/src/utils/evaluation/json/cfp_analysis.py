"""Evaluation functions for CFP (Call For Proposals) analysis quality."""

from typing import TYPE_CHECKING

from services.rag.src.dto import CFPAnalysisData

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import CFPAnalysisQualityMetrics


def evaluate_cfp_analysis_quality(cfp_data: CFPAnalysisData) -> "CFPAnalysisQualityMetrics":
    """Evaluate the quality of CFP analysis extraction.

    Args:
        cfp_data: CFP analysis data containing requirements, sections, criteria, etc.

    Returns:
        Quality metrics for the CFP analysis
    """
    if not cfp_data:
        return {
            "overall": 0.0,
            "requirement_clarity": 0.0,
            "quote_accuracy": 0.0,
            "completeness": 0.0,
            "categorization": 0.0,
        }

    # Evaluate requirement clarity
    requirement_clarity = _evaluate_requirement_clarity(cfp_data)

    # Evaluate quote accuracy
    quote_accuracy = _evaluate_quote_accuracy(cfp_data)

    # Evaluate completeness
    completeness = _evaluate_completeness(cfp_data)

    # Evaluate categorization
    categorization = _evaluate_categorization(cfp_data)

    # Calculate overall score
    overall = requirement_clarity * 0.30 + quote_accuracy * 0.25 + completeness * 0.25 + categorization * 0.20

    return {
        "overall": overall,
        "requirement_clarity": requirement_clarity,
        "quote_accuracy": quote_accuracy,
        "completeness": completeness,
        "categorization": categorization,
    }


def _evaluate_requirement_clarity(cfp_data: CFPAnalysisData) -> float:
    """Evaluate completeness of extracted requirements."""
    requirements = cfp_data.get("requirements", [])

    if not requirements:
        return 0.0

    completeness_score = 0.0

    for req in requirements:
        # Check if requirement has essential fields
        if req.get("requirement"):
            completeness_score += 0.3

        if req.get("quote_from_source"):
            completeness_score += 0.4

        if req.get("category"):
            completeness_score += 0.3

    # Average across all requirements
    return min(1.0, completeness_score / len(requirements)) if requirements else 0.0


def _evaluate_quote_accuracy(cfp_data: CFPAnalysisData) -> float:
    """Evaluate structure and organization of sections."""
    sections = cfp_data.get("sections", [])

    if not sections:
        return 0.0

    structure_score = 0.0

    for section in sections:
        # Check section completeness
        if section.get("section_name"):
            structure_score += 0.2

        if section.get("definition"):
            structure_score += 0.3

        # Check if section has requirements
        section_requirements = section.get("requirements", [])
        if section_requirements and len(section_requirements) >= 2:
            structure_score += 0.3

        # Check dependencies
        if "dependencies" in section:
            structure_score += 0.2

    # Bonus for having multiple well-structured sections
    if len(sections) >= 3:
        structure_score += 0.2

    return min(1.0, structure_score / len(sections)) if sections else 0.0


def _evaluate_completeness(cfp_data: CFPAnalysisData) -> float:
    """Evaluate clarity of evaluation criteria."""
    criteria = cfp_data.get("evaluation_criteria", [])

    if not criteria:
        return 0.0

    clarity_score = 0.0

    for criterion in criteria:
        # Handle both string and object formats
        if isinstance(criterion, str):
            # Simple string format - evaluate based on length and content
            if len(criterion) > 20:
                clarity_score += 0.5
            if any(indicator in criterion.lower() for indicator in ["(%)", "percent", "weight"]):
                clarity_score += 0.3
        else:
            # Object format - use original logic
            if criterion.get("criterion_name"):
                clarity_score += 0.2

            if criterion.get("description") and len(criterion.get("description", "")) > 20:
                clarity_score += 0.3

            # Weight percentage adds specificity
            if criterion.get("weight_percentage") is not None:
                clarity_score += 0.3

            # Source quote adds credibility
            if criterion.get("quote_from_source"):
                clarity_score += 0.2

    return min(1.0, clarity_score / len(criteria)) if criteria else 0.0


def _evaluate_categorization(cfp_data: CFPAnalysisData) -> float:
    """Evaluate specificity of length constraints."""
    constraints = cfp_data.get("length_constraints", [])

    if not constraints:
        # No constraints might be fine for some CFPs
        return 0.5

    specificity_score = 0.0

    for constraint in constraints:
        # Check constraint completeness
        if constraint.get("section_name"):
            specificity_score += 0.2

        if constraint.get("measurement_type") in ["pages", "words", "characters", "lines"]:
            specificity_score += 0.3

        if constraint.get("limit_description"):
            # Check if limit is specific (contains numbers)
            limit_desc = constraint.get("limit_description", "")
            if any(char.isdigit() for char in limit_desc):
                specificity_score += 0.3
            else:
                specificity_score += 0.1

        # Exclusions add important context
        if constraint.get("exclusions"):
            specificity_score += 0.2

    return min(1.0, specificity_score / len(constraints)) if constraints else 0.5


def _evaluate_source_attribution(cfp_data: CFPAnalysisData) -> float:
    """Evaluate quality of source attribution across all components."""
    attribution_score = 0.0
    total_items = 0

    # Check requirements
    requirements = cfp_data.get("requirements", [])
    for req in requirements:
        total_items += 1
        if req.get("quote_from_source"):
            attribution_score += 1

    # Check sections
    sections = cfp_data.get("sections", [])
    for section in sections:
        section_reqs = section.get("requirements", [])
        for req in section_reqs:
            total_items += 1
            if req.get("quote_from_source"):
                attribution_score += 1

    # Check evaluation criteria
    criteria = cfp_data.get("evaluation_criteria", [])
    for criterion in criteria:
        total_items += 1
        if criterion.get("quote_from_source"):
            attribution_score += 1

    # Check constraints
    constraints = cfp_data.get("length_constraints", [])
    for constraint in constraints:
        total_items += 1
        if constraint.get("quote_from_source"):
            attribution_score += 1

    return attribution_score / total_items if total_items > 0 else 0.0


def check_cfp_analysis_completeness(cfp_data: CFPAnalysisData) -> dict[str, bool]:
    """Check completeness of CFP analysis.

    Returns:
        Dictionary of completeness checks
    """
    has_requirements = bool(cfp_data.get("requirements"))
    has_sections = bool(cfp_data.get("sections"))
    has_criteria = bool(cfp_data.get("evaluation_criteria"))
    has_constraints = bool(cfp_data.get("length_constraints"))

    # Check minimum thresholds
    min_requirements = False
    min_sections = False

    if has_requirements:
        requirements = cfp_data["requirements"]
        min_requirements = len(requirements) >= 3

    if has_sections:
        sections = cfp_data["sections"]
        min_sections = len(sections) >= 2

    return {
        "has_cfp_analysis": bool(cfp_data),
        "has_requirements": has_requirements,
        "has_sections": has_sections,
        "has_evaluation_criteria": has_criteria,
        "has_length_constraints": has_constraints,
        "minimum_requirements": min_requirements,
        "minimum_sections": min_sections,
    }
