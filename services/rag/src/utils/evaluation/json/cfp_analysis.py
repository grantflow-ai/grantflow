from typing import TYPE_CHECKING

from packages.db.src.json_objects import CFPAnalysisData

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import CFPAnalysisQualityMetrics


def evaluate_cfp_analysis_quality(cfp_data: CFPAnalysisData) -> "CFPAnalysisQualityMetrics":
    """Evaluate CFP analysis quality based on categories, constraints, and metadata.

    NEW structure evaluation:
    - requirement_clarity: evaluates category quality (meaningful names, good examples)
    - quote_accuracy: evaluates category example quality and specificity
    - completeness: evaluates metadata (reasonable counts, coverage)
    - categorization: evaluates constraints (well-formed type/value pairs)
    """
    if not cfp_data:
        return {
            "overall": 0.0,
            "requirement_clarity": 0.0,
            "quote_accuracy": 0.0,
            "completeness": 0.0,
            "categorization": 0.0,
        }

    requirement_clarity = _evaluate_category_clarity(cfp_data)
    quote_accuracy = _evaluate_category_examples(cfp_data)
    completeness = _evaluate_metadata_completeness(cfp_data)
    categorization = _evaluate_constraints(cfp_data)

    overall = requirement_clarity * 0.30 + quote_accuracy * 0.25 + completeness * 0.25 + categorization * 0.20

    return {
        "overall": overall,
        "requirement_clarity": requirement_clarity,
        "quote_accuracy": quote_accuracy,
        "completeness": completeness,
        "categorization": categorization,
    }


def _evaluate_category_clarity(cfp_data: CFPAnalysisData) -> float:
    """Evaluate category quality: meaningful names, good examples, reasonable counts."""
    categories = cfp_data.get("categories", [])

    if not categories:
        return 0.0

    score = 0.0

    for category in categories:
        # Meaningful category name (not too short, not generic)
        name = category.get("name", "")
        if len(name) > 5 and name.lower() not in ["other", "misc", "miscellaneous", "general"]:
            score += 0.3

        # Has reasonable count (at least 1 requirement in this category)
        count = category.get("count", 0)
        if count > 0:
            score += 0.3

        # Has good examples
        examples = category.get("examples", [])
        if len(examples) >= 2:
            score += 0.4
        elif len(examples) == 1:
            score += 0.2

    return min(1.0, score / len(categories)) if categories else 0.0


def _evaluate_category_examples(cfp_data: CFPAnalysisData) -> float:
    """Evaluate category example quality and specificity."""
    categories = cfp_data.get("categories", [])

    if not categories:
        return 0.0

    score = 0.0

    for category in categories:
        examples = category.get("examples", [])

        # Has examples
        if not examples:
            continue

        # Examples have reasonable length (not too short)
        example_quality = sum(1 for ex in examples if len(ex) > 15) / len(examples)
        score += example_quality * 0.5

        # Examples are diverse (not duplicates)
        unique_ratio = len(set(examples)) / len(examples)
        score += unique_ratio * 0.3

        # Examples match count
        count = category.get("count", 0)
        if count > 0 and len(examples) >= min(count, 3):
            score += 0.2

    return min(1.0, score / len(categories)) if categories else 0.0


def _evaluate_metadata_completeness(cfp_data: CFPAnalysisData) -> float:
    """Evaluate metadata: reasonable counts and coverage."""
    metadata = cfp_data.get("metadata", {})

    if not metadata:
        return 0.0

    score = 0.0

    # Has reasonable section count
    total_sections = metadata.get("total_sections", 0)
    if total_sections >= 2:
        score += 0.4
    elif total_sections >= 1:
        score += 0.2

    # Has reasonable requirement count
    total_requirements = metadata.get("total_requirements", 0)
    if total_requirements >= 5:
        score += 0.4
    elif total_requirements >= 1:
        score += 0.2

    # Has source attribution
    source_count = metadata.get("source_count", 0)
    if source_count >= 1:
        score += 0.2

    return min(1.0, score)


def _evaluate_constraints(cfp_data: CFPAnalysisData) -> float:
    """Evaluate constraints: well-formed type/value pairs."""
    constraints = cfp_data.get("constraints", [])

    if not constraints:
        return 0.5  # Neutral score if no constraints (not all CFPs have them)

    score = 0.0

    valid_types = ["word_limit", "page_limit", "char_limit", "format"]

    for constraint in constraints:
        # Has valid type
        constraint_type = constraint.get("type", "")
        if constraint_type in valid_types:
            score += 0.4

        # Has meaningful value
        value = constraint.get("value", "")
        if len(value) > 0:
            score += 0.3

        # Value contains numbers for limit types
        if constraint_type in ["word_limit", "page_limit", "char_limit"]:
            if any(char.isdigit() for char in value):
                score += 0.3
            else:
                score += 0.1  # Has value but no numbers

    return min(1.0, score / len(constraints)) if constraints else 0.5


def check_cfp_analysis_completeness(cfp_data: CFPAnalysisData) -> dict[str, bool]:
    """Check if CFP analysis has minimum required data."""
    has_categories = bool(cfp_data.get("categories"))
    has_constraints = bool(cfp_data.get("constraints"))
    has_metadata = bool(cfp_data.get("metadata"))

    min_categories = False
    min_metadata = False

    if has_categories:
        categories = cfp_data["categories"]
        min_categories = len(categories) >= 2

    if has_metadata:
        metadata = cfp_data["metadata"]
        min_metadata = (
            metadata.get("total_sections", 0) >= 1
            and metadata.get("total_requirements", 0) >= 1
        )

    return {
        "has_cfp_analysis": bool(cfp_data),
        "has_categories": has_categories,
        "has_constraints": has_constraints,
        "has_metadata": has_metadata,
        "minimum_categories": min_categories,
        "minimum_metadata": min_metadata,
    }
