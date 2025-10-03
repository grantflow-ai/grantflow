from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import ColumnElement, Select, String, Update, and_, cast, func, or_, select, update
from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION
from sqlalchemy.orm import InstrumentedAttribute

from packages.db.src.tables import Base

T = TypeVar("T", bound=Base)


def select_active[T: Base](model: type[T]) -> Select[tuple[T]]:
    return select(model).where(model.deleted_at.is_(None))


def select_active_by_id[T: Base](model: type[T], record_id: UUID | str) -> Select[tuple[T]]:
    return select(model).where(model.id == record_id, model.deleted_at.is_(None))  # type: ignore[attr-defined]


def update_active[T: Base](model: type[T]) -> Update:
    return update(model).where(model.deleted_at.is_(None))


def update_active_by_id[T: Base](model: type[T], record_id: UUID | str) -> Update:
    return update(model).where(model.id == record_id, model.deleted_at.is_(None))  # type: ignore[attr-defined]


def add_active_filter[T: Base](query: Select[Any], *models: type[T]) -> Select[Any]:
    for model in models:
        query = query.where(model.deleted_at.is_(None))
    return query


def add_active_filter_for_joins(query: Select[Any]) -> Select[Any]:
    return query


# Metadata filtering helpers for JSONB queries


def metadata_has_entity_type(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    entity_type: str,
) -> ColumnElement[bool]:
    """Check if document_metadata contains entity of specific type.

    Uses GIN index on (document_metadata -> 'entities') for fast filtering.

    Example:
        query.where(metadata_has_entity_type(RagSource.document_metadata, "ORGANIZATION"))
    """
    # Build JSON array with single entity object containing the type
    # Uses jsonb @> operator which is optimized by GIN index
    return metadata_column["entities"].astext.op("@>")(  # type: ignore[no-any-return]
        func.jsonb_build_array(func.jsonb_build_object("type", entity_type)).cast(String)
    )


def metadata_has_categories(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    categories: list[str],
    match_mode: str = "any",
) -> ColumnElement[bool]:
    """Check if document_metadata contains specified categories.

    Uses GIN index on (document_metadata -> 'categories') for fast filtering.

    Args:
        metadata_column: The document_metadata column
        categories: List of category strings to match
        match_mode: "any" (default) or "all" - whether to match any or all categories

    Example:
        query.where(metadata_has_categories(RagSource.document_metadata, ["research", "scientific"]))
    """
    categories_json = func.jsonb_build_array(*[func.to_jsonb(cat) for cat in categories])

    if match_mode == "all":
        # Categories array must contain all specified categories
        return metadata_column["categories"].astext.op("@>")(  # type: ignore[no-any-return]
            categories_json.cast(String)
        )
    # Categories array must overlap with specified categories (default)
    return metadata_column["categories"].astext.op("&&")(  # type: ignore[no-any-return]
        categories_json.cast(String)
    )


def metadata_has_keyword(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    keyword: str,
    min_confidence: float = 0.0,
) -> ColumnElement[bool]:
    """Check if document_metadata contains keyword with minimum confidence.

    Uses GIN index on (document_metadata -> 'keywords') for fast filtering.

    Note: Keywords are stored as tuples [keyword, confidence] in the array.

    Args:
        metadata_column: The document_metadata column
        keyword: Keyword string to search for
        min_confidence: Minimum confidence score (0.0-1.0)

    Example:
        query.where(metadata_has_keyword(RagSource.document_metadata, "melanoma", 0.8))
    """
    # Build JSONB array with keyword tuple structure
    # Note: This is a simplified version - for exact confidence filtering,
    # you may need to use jsonb_array_elements in a subquery
    keyword_json = func.jsonb_build_array(keyword, min_confidence)
    return metadata_column["keywords"].astext.op("@>")(  # type: ignore[no-any-return]
        func.jsonb_build_array(keyword_json).cast(String)
    )


def build_metadata_filter(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    *,
    entity_types: list[str] | None = None,
    categories: list[str] | None = None,
    category_match_mode: str = "any",
    min_quality_score: float | None = None,
) -> ColumnElement[bool] | None:
    """Build composite metadata filter from multiple criteria.

    Combines multiple metadata filters using AND logic. Returns None if no filters specified.

    Args:
        metadata_column: The document_metadata column
        entity_types: List of entity types to match (any)
        categories: List of categories to match
        category_match_mode: "any" or "all" for category matching
        min_quality_score: Minimum quality score threshold

    Example:
        filter_cond = build_metadata_filter(
            RagSource.document_metadata,
            entity_types=["ORGANIZATION", "PERSON"],
            categories=["research"],
            min_quality_score=0.7
        )
        if filter_cond is not None:
            query = query.where(filter_cond)
    """
    conditions: list[ColumnElement[bool]] = []

    # Entity type filter (OR logic for multiple types)
    if entity_types:
        entity_conditions = [metadata_has_entity_type(metadata_column, et) for et in entity_types]
        if entity_conditions:
            conditions.append(or_(*entity_conditions))

    # Category filter
    if categories:
        conditions.append(
            metadata_has_categories(metadata_column, categories, match_mode=category_match_mode)
        )

    # Quality score filter
    if min_quality_score is not None:
        # Extract quality_score from JSONB and compare
        quality_score_expr = cast(metadata_column["quality_score"].astext, DOUBLE_PRECISION)
        conditions.append(quality_score_expr >= min_quality_score)

    # Return combined conditions or None
    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return and_(*conditions)
