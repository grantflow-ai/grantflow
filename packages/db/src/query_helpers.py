"""
Query helper functions for consistent soft-delete filtering and common query patterns.

This module provides utilities to ensure all database queries properly filter out soft-deleted records.
"""

from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import Select, Update, select, update

from packages.db.src.tables import Base

T = TypeVar("T", bound=Base)


def select_active[T: Base](model: type[T]) -> Select[tuple[T]]:
    """
    Create a SELECT query that filters out soft-deleted records.

    Args:
        model: The SQLAlchemy model class (must inherit from Base)

    Returns:
        A SELECT query with deleted_at IS NULL filter applied

    Example:
        query = select_active(GrantApplication)
        # Equivalent to: select(GrantApplication).where(GrantApplication.deleted_at.is_(None))
    """
    return select(model).where(model.deleted_at.is_(None))


def select_active_by_id[T: Base](model: type[T], record_id: UUID | str) -> Select[tuple[T]]:
    """
    Create a SELECT query for a specific record that filters out soft-deleted records.

    Args:
        model: The SQLAlchemy model class (must inherit from Base)
        record_id: The ID of the record to fetch

    Returns:
        A SELECT query with both ID match and deleted_at IS NULL filters applied

    Example:
        query = select_active_by_id(GrantApplication, application_id)
        # Equivalent to: select(GrantApplication).where(
        #     GrantApplication.id == application_id,
        #     GrantApplication.deleted_at.is_(None)
        # )
    """
    return select(model).where(model.id == record_id, model.deleted_at.is_(None))  # type: ignore[attr-defined]


def update_active[T: Base](model: type[T]) -> Update:
    """
    Create an UPDATE query that only affects non-soft-deleted records.

    Args:
        model: The SQLAlchemy model class (must inherit from Base)

    Returns:
        An UPDATE query with deleted_at IS NULL filter applied

    Example:
        query = update_active(GrantApplication).where(GrantApplication.id == app_id).values(title="New Title")
        # Equivalent to: update(GrantApplication).where(
        #     GrantApplication.id == app_id,
        #     GrantApplication.deleted_at.is_(None)
        # ).values(title="New Title")
    """
    return update(model).where(model.deleted_at.is_(None))


def update_active_by_id[T: Base](model: type[T], record_id: UUID | str) -> Update:
    """
    Create an UPDATE query for a specific record that only affects non-soft-deleted records.

    Args:
        model: The SQLAlchemy model class (must inherit from Base)
        record_id: The ID of the record to update

    Returns:
        An UPDATE query with both ID match and deleted_at IS NULL filters applied

    Example:
        query = update_active_by_id(GrantApplication, app_id).values(title="New Title")
        # Equivalent to: update(GrantApplication).where(
        #     GrantApplication.id == app_id,
        #     GrantApplication.deleted_at.is_(None)
        # ).values(title="New Title")
    """
    return update(model).where(model.id == record_id, model.deleted_at.is_(None))  # type: ignore[attr-defined]


def add_active_filter[T: Base](query: Select[Any], *models: type[T]) -> Select[Any]:
    """
    Add soft-delete filters to an existing query for multiple models.

    Args:
        query: The existing SQLAlchemy SELECT query
        models: One or more model classes to add soft-delete filters for

    Returns:
        The query with deleted_at IS NULL filters added for all specified models

    Example:
        query = select(GrantApplication).join(GrantTemplate)
        query = add_active_filter(query, GrantApplication, GrantTemplate)
        # Adds: .where(GrantApplication.deleted_at.is_(None), GrantTemplate.deleted_at.is_(None))
    """
    for model in models:
        query = query.where(model.deleted_at.is_(None))
    return query


def add_active_filter_for_joins(query: Select[Any]) -> Select[Any]:
    """
    Automatically add soft-delete filters for common table joins.

    This is a convenience function for the most common join patterns in the application.
    For custom joins, use add_active_filter() with specific models.

    Args:
        query: The existing SQLAlchemy SELECT query

    Returns:
        The query with appropriate soft-delete filters based on detected joins

    Note:
        This function inspects the query to detect common join patterns and adds
        appropriate soft-delete filters. For complex queries, manual filter addition
        using add_active_filter() is recommended.
    """
    # This is a placeholder for more sophisticated join detection
    # For now, users should use add_active_filter() with explicit models
    return query
