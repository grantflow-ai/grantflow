from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import ColumnElement, Select, Update, and_, cast, func, or_, select, update
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


def metadata_has_entity_type(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    entity_type: str,
) -> ColumnElement[bool]:
    return metadata_column["entities"].op("@>")(func.jsonb_build_array(func.jsonb_build_object("type", entity_type)))


def metadata_has_categories(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    categories: list[str],
    match_mode: str = "any",
) -> ColumnElement[bool]:
    categories_json = func.jsonb_build_array(*[func.to_jsonb(cat) for cat in categories])

    if match_mode == "all":
        return metadata_column["categories"].op("@>")(categories_json)
    conditions = [
        metadata_column["categories"].op("@>")(func.jsonb_build_array(func.to_jsonb(cat))) for cat in categories
    ]
    return or_(*conditions)


def metadata_has_keyword(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    keyword: str,
    min_confidence: float = 0.0,
) -> ColumnElement[bool]:
    keyword_json = func.jsonb_build_array(keyword, min_confidence)
    return metadata_column["keywords"].op("@>")(func.jsonb_build_array(keyword_json))


def build_metadata_filter(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    *,
    entity_types: list[str] | None = None,
    categories: list[str] | None = None,
    category_match_mode: str = "any",
    min_quality_score: float | None = None,
) -> ColumnElement[bool] | None:
    conditions: list[ColumnElement[bool]] = []

    if entity_types:
        entity_conditions = [metadata_has_entity_type(metadata_column, et) for et in entity_types]
        if entity_conditions:
            conditions.append(or_(*entity_conditions))

    if categories:
        conditions.append(metadata_has_categories(metadata_column, categories, match_mode=category_match_mode))

    if min_quality_score is not None:
        quality_score_expr = cast(metadata_column["quality_score"].astext, DOUBLE_PRECISION)
        conditions.append(quality_score_expr >= min_quality_score)

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return and_(*conditions)
