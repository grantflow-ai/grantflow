from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import Select, Update, select, update

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
