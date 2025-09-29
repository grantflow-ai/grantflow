"""Shared utilities for JSON content evaluation."""

import contextlib
from typing import Any

from packages.db.src.json_objects import GrantLongFormSection


def check_semantic_alignment(
    data: dict[str, Any],
    section_config: GrantLongFormSection | None = None,
) -> float:
    """Check semantic alignment between JSON data and section configuration.

    Args:
        data: JSON data to evaluate
        section_config: Section configuration with keywords and topics

    Returns:
        Alignment score between 0.0 and 1.0
    """
    if not section_config or not data:
        return 0.5  # Neutral score when no config provided

    alignment_score = 0.0

    # Extract text content from data for analysis
    text_content = _extract_text_from_json(data).lower()

    # Check keyword alignment
    keywords = section_config.get("keywords", [])
    if keywords:
        keyword_matches = sum(1 for kw in keywords if kw.lower() in text_content)
        keyword_ratio = keyword_matches / len(keywords)
        alignment_score += keyword_ratio * 0.4

    # Check topic alignment
    topics = section_config.get("topics", [])
    if topics:
        topic_matches = sum(1 for topic in topics if topic.lower() in text_content)
        topic_ratio = topic_matches / len(topics)
        alignment_score += topic_ratio * 0.3

    # Check search query relevance
    search_queries = section_config.get("search_queries", [])
    if search_queries:
        # Check if key terms from search queries appear in content
        query_terms = set()
        for query in search_queries:
            query_terms.update(query.lower().split())
        # Remove common words
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
        query_terms = query_terms - common_words

        if query_terms:
            term_matches = sum(1 for term in query_terms if term in text_content)
            term_ratio = term_matches / len(query_terms)
            alignment_score += term_ratio * 0.3

    return min(1.0, alignment_score)


def check_completeness(
    data: dict[str, Any],
    required_fields: list[str] | None = None,
    min_field_count: int = 3,
) -> dict[str, Any]:
    """Check completeness of JSON data.

    Args:
        data: JSON data to evaluate
        required_fields: List of required field names
        min_field_count: Minimum number of non-empty fields expected

    Returns:
        Dictionary with completeness metrics
    """
    if not data:
        return {
            "is_complete": False,
            "completeness_score": 0.0,
            "has_required_fields": False,
            "field_coverage": 0.0,
        }

    # Count non-empty fields
    non_empty_fields = 0
    total_fields = 0

    for value in data.values():
        total_fields += 1
        if value:
            # Check if value is meaningful (not just empty list/dict/string)
            if isinstance(value, (list, dict)):
                if len(value) > 0:
                    non_empty_fields += 1
            elif isinstance(value, str):
                if value.strip():
                    non_empty_fields += 1
            else:
                non_empty_fields += 1

    field_coverage = non_empty_fields / total_fields if total_fields > 0 else 0.0

    # Check required fields if specified
    has_required_fields = True
    if required_fields:
        for field in required_fields:
            if field not in data or not data[field]:
                has_required_fields = False
                break

    # Calculate completeness score
    completeness_score = 0.0
    if non_empty_fields >= min_field_count:
        completeness_score += 0.5
    if field_coverage >= 0.6:
        completeness_score += 0.3
    if has_required_fields:
        completeness_score += 0.2

    return {
        "is_complete": non_empty_fields >= min_field_count and has_required_fields,
        "completeness_score": min(1.0, completeness_score),
        "has_required_fields": has_required_fields,
        "field_coverage": field_coverage,
    }


def calculate_structure_depth(data: dict[str, Any] | list[Any], current_depth: int = 0) -> int:
    """Calculate the maximum depth of nested structure.

    Args:
        data: JSON data to analyze
        current_depth: Current recursion depth

    Returns:
        Maximum depth of the structure
    """
    if not isinstance(data, (dict, list)):
        return current_depth

    max_depth = current_depth

    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, (dict, list)):
                depth = calculate_structure_depth(value, current_depth + 1)
                max_depth = max(max_depth, depth)
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                depth = calculate_structure_depth(item, current_depth + 1)
                max_depth = max(max_depth, depth)

    return max_depth


def validate_field_types(
    data: dict[str, Any],
    expected_types: dict[str, type] | None = None,
) -> dict[str, Any]:
    """Validate field types in JSON data.

    Args:
        data: JSON data to validate
        expected_types: Dictionary mapping field names to expected types

    Returns:
        Dictionary with type validation results
    """
    if not data:
        return {
            "all_types_valid": False,
            "type_validity_score": 0.0,
            "invalid_fields": [],
        }

    if not expected_types:
        # If no expected types provided, just check that fields have consistent types
        return {
            "all_types_valid": True,
            "type_validity_score": 1.0,
            "invalid_fields": [],
        }

    invalid_fields = []
    valid_count = 0
    total_checked = 0

    for field, expected_type in expected_types.items():
        if field in data:
            total_checked += 1
            value = data[field]
            if value is not None and not isinstance(value, expected_type):
                invalid_fields.append(field)
            else:
                valid_count += 1

    type_validity_score = valid_count / total_checked if total_checked > 0 else 1.0

    return {
        "all_types_valid": len(invalid_fields) == 0,
        "type_validity_score": type_validity_score,
        "invalid_fields": invalid_fields,
    }


def _extract_text_from_json(data: Any, max_depth: int = 5) -> str:
    """Recursively extract text content from JSON structure.

    Args:
        data: JSON data to extract text from
        max_depth: Maximum recursion depth

    Returns:
        Concatenated text content
    """
    if max_depth <= 0:
        return ""

    text_parts = []

    if isinstance(data, str):
        text_parts.append(data)
    elif isinstance(data, (int, float, bool)):
        text_parts.append(str(data))
    elif isinstance(data, dict):
        for key, value in data.items():
            text_parts.append(str(key))
            text_parts.append(_extract_text_from_json(value, max_depth - 1))
    elif isinstance(data, list):
        text_parts.extend(_extract_text_from_json(item, max_depth - 1) for item in data)

    return " ".join(text_parts)


def count_unique_values(data: dict[str, Any], field_path: str) -> int:
    """Count unique values at a specific field path in JSON data.

    Args:
        data: JSON data to analyze
        field_path: Dot-separated path to field (e.g., "sections.requirements")

    Returns:
        Count of unique values
    """
    values = _get_values_at_path(data, field_path)
    if not values:
        return 0

    # Convert to hashable types for uniqueness check
    unique_values: set[Any] = set()
    for value in values:
        if isinstance(value, (str, int, float, bool, type(None))):
            unique_values.add(value)
        elif isinstance(value, (list, tuple)):
            # Convert list to tuple for hashing
            with contextlib.suppress(TypeError):
                unique_values.add(tuple(value) if isinstance(value, list) else value)
        elif isinstance(value, dict):
            # Use sorted items tuple as hashable representation
            with contextlib.suppress(TypeError):
                unique_values.add(tuple(sorted(value.items())))

    return len(unique_values)


def _get_values_at_path(data: Any, field_path: str) -> list[Any]:
    """Get all values at a specific field path.

    Args:
        data: JSON data to traverse
        field_path: Dot-separated path

    Returns:
        List of values found at path
    """
    if not field_path:
        return [data]

    parts = field_path.split(".", 1)
    current_key = parts[0]
    remaining_path = parts[1] if len(parts) > 1 else ""

    values = []

    if isinstance(data, dict) and current_key in data:
        values.extend(_get_values_at_path(data[current_key], remaining_path))
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and current_key in item:
                values.extend(_get_values_at_path(item[current_key], remaining_path))

    return values
