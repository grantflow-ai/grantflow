from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    UUID as SA_UUID,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Relationship, class_mapper, mapped_column, relationship
from sqlalchemy.orm.exc import DetachedInstanceError
from sqlalchemy.sql.functions import now

from packages.db.src.constants import EMBEDDING_DIMENSIONS
from packages.db.src.enums import ApplicationStatusEnum, FileIndexingStatusEnum, UserRoleEnum
from packages.db.src.json_objects import Chunk, GrantElement, GrantLongFormSection, ResearchObjective


class Base(DeclarativeBase):
    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now(), onupdate=now())

    def _get_relationship_value(self, key: str) -> Any:
        try:
            value = getattr(self, key)
            if isinstance(value, list):
                return [item.to_dict() for item in value]
            return value.to_dict()
        except (DetachedInstanceError, AttributeError):
            return None

    def to_dict(self) -> dict[str, Any]:
        mapper = class_mapper(self.__class__)
        column_values = {
            column.key: getattr(self, column.key)
            for column in mapper.columns
            if column.key not in {"metadata", "registry"}
        }
        relationship_values = {r.key: self._get_relationship_value(r.key) for r in mapper.relationships}
        return {**column_values, **{k: v for k, v in relationship_values.items() if v is not None}}


class BaseWithUUIDPK(Base):
    __abstract__ = True

    id: Mapped[UUID] = mapped_column(SA_UUID(), primary_key=True, insert_default=uuid4)


class Workspace(BaseWithUUIDPK):
    __tablename__ = "workspaces"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(Text, index=True)

    grant_applications: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="workspace", cascade="all, delete-orphan"
    )
    workspace_users: Relationship[list["WorkspaceUser"]] = relationship(
        "WorkspaceUser", back_populates="workspace", cascade="all, delete-orphan"
    )


class WorkspaceUser(Base):
    __tablename__ = "workspace_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))

    workspace_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )

    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="workspace_users")


class RagFile(BaseWithUUIDPK):
    __tablename__ = "rag_files"

    bucket_name: Mapped[str] = mapped_column(String(255))
    object_path: Mapped[str] = mapped_column(String(255))
    filename: Mapped[str] = mapped_column(String(255))
    indexing_status: Mapped[FileIndexingStatusEnum] = mapped_column(Enum(FileIndexingStatusEnum), index=True)
    mime_type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(BigInteger)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    text_vectors: Relationship[list["TextVector"]] = relationship(
        "TextVector", back_populates="rag_file", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("size >= 0", name="check_positive_file_size"),
        UniqueConstraint("bucket_name", "object_path", name="uq_bucket_object"),
    )


class TextVector(BaseWithUUIDPK):
    __tablename__ = "text_vectors"

    chunk: Mapped[Chunk] = mapped_column(JSON)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))

    rag_file_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("rag_files.id", ondelete="CASCADE"), index=True)
    rag_file: Relationship["RagFile"] = relationship("RagFile", back_populates="text_vectors")

    __table_args__ = (
        Index(
            "idx_text_vectors_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops", "iterative_scan": "strict_order"},
        ),
    )


class FundingOrganization(BaseWithUUIDPK):
    __tablename__ = "funding_organizations"

    full_name: Mapped[str] = mapped_column(String(255), unique=True)
    abbreviation: Mapped[str] = mapped_column(String(64), index=True, nullable=True)

    grant_templates: Relationship[list["GrantTemplate"]] = relationship(
        "GrantTemplate", back_populates="funding_organization"
    )
    files: Relationship[list["OrganizationFile"]] = relationship(
        "OrganizationFile", back_populates="funding_organization", cascade="all, delete-orphan"
    )


class OrganizationFile(Base):
    __tablename__ = "organization_files"

    rag_file_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_files.id", ondelete="CASCADE"), primary_key=True
    )
    funding_organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), primary_key=True
    )

    rag_file: Relationship["RagFile"] = relationship("RagFile")
    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="files"
    )


class GrantApplication(BaseWithUUIDPK):
    __tablename__ = "grant_applications"

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    form_inputs: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)
    research_objectives: Mapped[list[ResearchObjective] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ApplicationStatusEnum] = mapped_column(
        Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.DRAFT, index=True
    )
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(255))

    workspace_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)

    files: Relationship[list["GrantApplicationFile"]] = relationship(
        "GrantApplicationFile", back_populates="grant_application", cascade="all, delete-orphan"
    )
    grant_template: Relationship["GrantTemplate | None"] = relationship(
        "GrantTemplate", back_populates="grant_application", cascade="all, delete-orphan", uselist=False
    )
    workspace: Relationship[Workspace] = relationship("Workspace", back_populates="grant_applications")


class GrantApplicationFile(Base):
    __tablename__ = "grant_application_files"

    rag_file_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_files.id", ondelete="CASCADE"), primary_key=True
    )
    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True, server_default=None
    )

    rag_file: Relationship[RagFile] = relationship("RagFile")
    grant_application: Relationship[GrantApplication] = relationship("GrantApplication", back_populates="files")


class GrantTemplate(BaseWithUUIDPK):
    __tablename__ = "grant_templates"

    grant_sections: Mapped[list[GrantLongFormSection | GrantElement]] = mapped_column(JSON)

    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )
    funding_organization_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("funding_organizations.id", ondelete="SET NULL"), nullable=True
    )

    submission_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    grant_application: Relationship[GrantApplication] = relationship(
        "GrantApplication", back_populates="grant_template"
    )
    funding_organization: Relationship[FundingOrganization | None] = relationship(
        "FundingOrganization", back_populates="grant_templates"
    )
    files: Relationship[list["GrantTemplateFile"]] = relationship(
        "GrantTemplateFile", back_populates="grant_template", cascade="all, delete-orphan"
    )


class GrantTemplateFile(Base):
    __tablename__ = "grant_template_files"

    rag_file_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_files.id", ondelete="CASCADE"), primary_key=True
    )
    grant_template_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_template.id", ondelete="CASCADE"), primary_key=True
    )

    rag_file: Relationship["RagFile"] = relationship("RagFile")
    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", back_populates="files")
