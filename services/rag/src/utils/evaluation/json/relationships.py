from typing import TYPE_CHECKING, Final

from services.rag.src.dto import RelationshipPair

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import RelationshipQualityMetrics

MEANINGFUL_RELATIONSHIP_TYPES: Final = frozenset(
    {
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
)


def evaluate_relationships_quality(relationships: dict[str, list[RelationshipPair]]) -> "RelationshipQualityMetrics":
    if not relationships:
        return {
            "overall": 0.0,
            "validity": 0.0,
            "coverage": 0.0,
            "diversity": 0.0,
            "description_quality": 0.0,
            "bidirectionality": 0.0,
        }

    validity = _evaluate_relationship_validity(relationships)

    coverage = _evaluate_coverage(relationships)

    diversity = _evaluate_diversity(relationships)

    description_quality = _evaluate_description_quality(relationships)

    bidirectionality = _evaluate_bidirectionality(relationships)

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
    if not relationships:
        return 0.0

    validity_score = 0.0
    total_relations = 0

    for source, relations in relationships.items():
        if not source or not isinstance(source, str):
            continue

        for relation in relations:
            total_relations += 1

            relation_type = relation.get("relation_type", "")
            target = relation.get("target_entity", "")

            if relation_type and target:
                validity_score += 0.5

            if len(relation_type) > 3:
                validity_score += 0.3

            if target != source:
                validity_score += 0.2

    return validity_score / total_relations if total_relations > 0 else 0.0


def _evaluate_coverage(relationships: dict[str, list[RelationshipPair]]) -> float:
    if not relationships:
        return 0.0

    all_entities = set(relationships.keys())

    for relations in relationships.values():
        for relation in relations:
            target = relation.get("target_entity")
            if target:
                all_entities.add(target)

    num_sources = len(relationships)
    num_entities = len(all_entities)

    coverage_score = 0.0

    if num_sources >= 5:
        coverage_score += 0.5
    elif num_sources >= 3:
        coverage_score += 0.3
    elif num_sources >= 2:
        coverage_score += 0.2

    if num_entities >= 10:
        coverage_score += 0.5
    elif num_entities >= 5:
        coverage_score += 0.3
    elif num_entities >= 3:
        coverage_score += 0.2

    return min(1.0, coverage_score)


def _evaluate_diversity(relationships: dict[str, list[RelationshipPair]]) -> float:
    if not relationships:
        return 0.0

    relation_types = set()

    for relations in relationships.values():
        for relation in relations:
            relation_type = relation.get("relation_type")
            if relation_type:
                relation_types.add(relation_type.lower())

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
    if not relationships:
        return 0.0

    quality_score = 0.0
    total_relations = 0

    for relations in relationships.values():
        for relation in relations:
            if not (relation_type := relation.get("relation_type", "").lower()):
                continue

            total_relations += 1

            if any(meaningful in relation_type for meaningful in MEANINGFUL_RELATIONSHIP_TYPES):
                quality_score += 0.5

            if 5 <= len(relation_type) <= 30:
                quality_score += 0.3

            if " " in relation_type:
                quality_score += 0.2

    return quality_score / total_relations if total_relations > 0 else 0.0


def _evaluate_bidirectionality(relationships: dict[str, list[RelationshipPair]]) -> float:
    if not relationships:
        return 0.0

    edges = set()
    reverse_edges = set()

    for source, relations in relationships.items():
        for relation in relations:
            target = relation.get("target_entity")
            if target:
                edges.add((source, target))

                if target in relationships:
                    for rev_relation in relationships[target]:
                        rev_target = rev_relation.get("target_entity")
                        if rev_target == source:
                            reverse_edges.add((target, source))

    if not edges:
        return 0.0

    bidirectional_count = len(reverse_edges)
    total_edges = len(edges)

    bidirectional_ratio = bidirectional_count / total_edges

    if 0.2 <= bidirectional_ratio <= 0.5:
        return 1.0
    if 0.1 <= bidirectional_ratio < 0.2 or 0.5 < bidirectional_ratio <= 0.7:
        return 0.7
    if bidirectional_ratio < 0.1:
        return 0.3
    return 0.5


def check_relationships_completeness(relationships: dict[str, list[RelationshipPair]]) -> dict[str, bool]:
    has_relationships = bool(relationships)
    all_valid_structure = True
    has_multiple_sources = len(relationships) >= 2
    has_meaningful_types = False

    if relationships:
        for relations in relationships.values():
            for relation in relations:
                if not relation.get("relation_type") or not relation.get("target_entity"):
                    all_valid_structure = False
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
