"""Evaluation functions for extracted relationships quality."""

from typing import TYPE_CHECKING

from services.rag.src.dto import RelationshipPair

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import RelationshipQualityMetrics


def evaluate_relationships_quality(relationships: dict[str, list[RelationshipPair]]) -> "RelationshipQualityMetrics":
    """Evaluate the quality of extracted relationships.

    Args:
        relationships: Dictionary of relationships where key is source entity
                      and value is list of RelationshipPair objects

    Returns:
        Quality metrics for the relationships
    """
    if not relationships:
        return {
            "overall": 0.0,
            "validity": 0.0,
            "coverage": 0.0,
            "diversity": 0.0,
            "description_quality": 0.0,
            "bidirectionality": 0.0,
        }

    # Evaluate validity of relationships
    validity = _evaluate_relationship_validity(relationships)

    # Evaluate coverage (how many entities have relationships)
    coverage = _evaluate_coverage(relationships)

    # Evaluate diversity of relationship types
    diversity = _evaluate_diversity(relationships)

    # Evaluate description quality
    description_quality = _evaluate_description_quality(relationships)

    # Evaluate bidirectionality
    bidirectionality = _evaluate_bidirectionality(relationships)

    # Calculate overall score
    overall = (
        validity * 0.25 + coverage * 0.20 + diversity * 0.20 + description_quality * 0.20 + bidirectionality * 0.15
    )

    return {
        "overall": overall,
        "validity": validity,
        "coverage": coverage,
        "diversity": diversity,
        "description_quality": description_quality,
        "bidirectionality": bidirectionality,
    }


def _evaluate_relationship_validity(relationships: dict[str, list[RelationshipPair]]) -> float:
    """Evaluate validity of relationships."""
    if not relationships:
        return 0.0

    validity_score = 0.0
    total_relations = 0

    for source, relations in relationships.items():
        if not source or not isinstance(source, str):
            continue

        for relation in relations:
            total_relations += 1

            # Check structure: should have relation_type and target_entity
            relation_type = relation.get("relation_type", "")
            target = relation.get("target_entity", "")

            # Both should be non-empty strings
            if relation_type and target:
                validity_score += 0.5

            # Relation type should be meaningful (not too short)
            if len(relation_type) > 3:
                validity_score += 0.3

            # Target should be different from source
            if target != source:
                validity_score += 0.2

    return validity_score / total_relations if total_relations > 0 else 0.0


def _evaluate_coverage(relationships: dict[str, list[RelationshipPair]]) -> float:
    """Evaluate coverage of entities with relationships."""
    if not relationships:
        return 0.0

    # Count unique entities (sources and targets)
    all_entities = set(relationships.keys())

    for relations in relationships.values():
        for relation in relations:
            target = relation.get("target_entity")
            if target:
                all_entities.add(target)  # Add target entity

    # Good coverage if we have relationships for multiple entities
    num_sources = len(relationships)
    num_entities = len(all_entities)

    coverage_score = 0.0

    # Check if we have multiple source entities
    if num_sources >= 5:
        coverage_score += 0.5
    elif num_sources >= 3:
        coverage_score += 0.3
    elif num_sources >= 2:
        coverage_score += 0.2

    # Check total entity coverage
    if num_entities >= 10:
        coverage_score += 0.5
    elif num_entities >= 5:
        coverage_score += 0.3
    elif num_entities >= 3:
        coverage_score += 0.2

    return min(1.0, coverage_score)


def _evaluate_diversity(relationships: dict[str, list[RelationshipPair]]) -> float:
    """Evaluate diversity of relationship types."""
    if not relationships:
        return 0.0

    # Collect all relationship types
    relation_types = set()

    for relations in relationships.values():
        for relation in relations:
            relation_type = relation.get("relation_type")
            if relation_type:
                relation_types.add(relation_type.lower())

    # Good diversity if we have multiple relationship types
    num_types = len(relation_types)

    if num_types >= 10:
        return 1.0
    if num_types >= 5:
        return 0.8
    if num_types >= 3:
        return 0.6
    if num_types >= 2:
        return 0.4
    if num_types >= 1:
        return 0.2
    return 0.0


def _evaluate_description_quality(relationships: dict[str, list[RelationshipPair]]) -> float:
    """Evaluate quality of relationship descriptions."""
    if not relationships:
        return 0.0

    quality_score = 0.0
    total_relations = 0

    # Common meaningful relationship types
    meaningful_types = {
        "causes",
        "enables",
        "requires",
        "inhibits",
        "produces",
        "regulates",
        "correlates with",
        "depends on",
        "affects",
        "interacts with",
        "modulates",
        "triggers",
        "prevents",
        "enhances",
        "reduces",
        "associated with",
        "leads to",
    }

    for relations in relationships.values():
        for relation in relations:
            relation_type = relation.get("relation_type", "").lower()
            if relation_type:
                total_relations += 1

                # Check if it's a meaningful relationship type
                if any(meaningful in relation_type for meaningful in meaningful_types):
                    quality_score += 0.5

                # Check length (not too short, not too long)
                if 5 <= len(relation_type) <= 30:
                    quality_score += 0.3

                # Check if it's not just a single word
                if " " in relation_type:
                    quality_score += 0.2

    return quality_score / total_relations if total_relations > 0 else 0.0


def _evaluate_bidirectionality(relationships: dict[str, list[RelationshipPair]]) -> float:
    """Evaluate if relationships show bidirectional connections."""
    if not relationships:
        return 0.0

    # Track all directed edges
    edges = set()
    reverse_edges = set()

    for source, relations in relationships.items():
        for relation in relations:
            target = relation.get("target_entity")
            if target:
                edges.add((source, target))

                # Check if reverse relationship exists
                if target in relationships:
                    for rev_relation in relationships[target]:
                        rev_target = rev_relation.get("target_entity")
                        if rev_target == source:
                            reverse_edges.add((target, source))

    # Calculate bidirectionality score
    if not edges:
        return 0.0

    bidirectional_count = len(reverse_edges)
    total_edges = len(edges)

    # Some bidirectionality is good, but not everything needs to be bidirectional
    bidirectional_ratio = bidirectional_count / total_edges

    if 0.2 <= bidirectional_ratio <= 0.5:
        return 1.0
    if 0.1 <= bidirectional_ratio < 0.2 or 0.5 < bidirectional_ratio <= 0.7:
        return 0.7
    if bidirectional_ratio < 0.1:
        return 0.3
    return 0.5  # Too much bidirectionality might indicate redundancy


def check_relationships_completeness(relationships: dict[str, list[RelationshipPair]]) -> dict[str, bool]:
    """Check completeness of relationships.

    Returns:
        Dictionary of completeness checks
    """
    has_relationships = bool(relationships)
    all_valid_structure = True
    has_multiple_sources = len(relationships) >= 2
    has_meaningful_types = False

    if relationships:
        for relations in relationships.values():
            for relation in relations:
                # Check structure
                if not relation.get("relation_type") or not relation.get("target_entity"):
                    all_valid_structure = False
                # Check if relationship type is meaningful
                relation_type = relation.get("relation_type", "")
                if len(relation_type) > 3:
                    has_meaningful_types = True

    return {
        "has_relationships": has_relationships,
        "all_valid_structure": all_valid_structure,
        "has_multiple_sources": has_multiple_sources,
        "has_meaningful_types": has_meaningful_types,
        "minimum_relationships": sum(len(r) for r in relationships.values()) >= 3,
    }
