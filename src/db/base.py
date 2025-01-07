from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import UUID, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, class_mapper, mapped_column
from sqlalchemy.orm.exc import DetachedInstanceError
from sqlalchemy.sql.functions import now


class Base(DeclarativeBase):
    """Base class for all tables."""

    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now(), onupdate=now())

    def _get_relationship_value(self, key: str) -> Any:
        try:
            return getattr(self, key)
        except DetachedInstanceError:
            return None

    def to_dict(self) -> dict[str, Any]:
        """Serialize the model's columns to a dictionary.

        Returns:
            A dictionary containing the model's columns.
        """
        mapper = class_mapper(self.__class__)
        column_values = {column.key: getattr(self, column.key) for column in mapper.columns}
        relationship_values = {
            relationship.key: self._get_relationship_value(relationship.key) for relationship in mapper.relationships
        }
        return {**column_values, **relationship_values}


class BaseWithUUIDPK(Base):
    """Base class for all tables with UUID primary keys."""

    __abstract__ = True

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4)
