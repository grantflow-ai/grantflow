from datetime import datetime
from typing import Any
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Relationship,
    class_mapper,
    mapped_column,
    relationship,
    validates,
)
from sqlalchemy.sql.functions import now

from src.constants import EMBEDDING_DIMENSIONS
from src.db.enums import (
    ContentTopicEnum,
    FileIndexingStatusEnum,
    GrantSectionEnum,
    UserRoleEnum,
)
from src.db.utils import validate_markdown_template
from src.dto import Chunk


class Base(DeclarativeBase):
    """Base class for all tables."""

    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now(), onupdate=now())

    def to_dict(self) -> dict[str, Any]:
        """Serialize the model's columns to a dictionary.

        Returns:
            A dictionary containing the model's columns.
        """
        return {column.key: getattr(self, column.key) for column in class_mapper(self.__class__).columns}


class BaseWithUUIDPK(Base):
    """Base class for all tables with UUID primary keys."""

    __abstract__ = True

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4)


class FileBase(BaseWithUUIDPK):
    """Base class for file tables."""

    __abstract__ = True

    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(Integer)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[FileIndexingStatusEnum] = mapped_column(Enum(FileIndexingStatusEnum), index=True)


class VectorBase(BaseWithUUIDPK):
    """Base class for all tables with vector columns."""

    __abstract__ = True

    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))  # Flattened list
    chunk: Mapped[Chunk] = mapped_column(JSON)


class FundingOrganization(BaseWithUUIDPK):
    """Funding organization table."""

    __tablename__ = "funding_organizations"

    name: Mapped[str] = mapped_column(String(255), unique=True)

    # Relationships
    grant_templates: Relationship[list["GrantTemplate"]] = relationship(
        "GrantTemplate", back_populates="funding_organization", cascade="all, delete-orphan"
    )
    applications: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="funding_organization", cascade="all, delete-orphan"
    )


class GrantTemplate(BaseWithUUIDPK):
    """Grant application template configuration."""

    __tablename__ = "grant_templates"

    name: Mapped[str] = mapped_column(String(255))
    template: Mapped[str] = mapped_column(Text)

    # Relationships
    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), index=True
    )
    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="grant_templates"
    )
    sections: Relationship[list["GrantSection"]] = relationship(
        "GrantSection", back_populates="grant_template", cascade="all, delete-orphan"
    )
    files: Relationship[list["GrantTemplateFile"]] = relationship(
        "GrantTemplateFile", back_populates="grant_template", cascade="all, delete-orphan"
    )
    applications: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="grant_template"
    )

    __table_args__ = (Index("idx_grant_template_name_org", "name", "funding_organization_id", unique=True),)

    @validates("template")
    def validate_template(self, _: str, text: str) -> str:
        """Validate the grant format template.

        Args:
            text: The grant format template.

        Returns:
            The validated grant format template.
        """
        validate_markdown_template(text)
        return text


class GrantTemplateFile(FileBase):
    """Template associated files."""

    __tablename__ = "grant_template_files"

    grant_template_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), index=True
    )
    grant_template: Relationship["GrantTemplate"] = relationship(
        "GrantTemplate", back_populates="files", passive_deletes=True
    )


class GrantSection(BaseWithUUIDPK):
    """Grant section configuration."""

    __tablename__ = "grant_sections"

    search_terms: Mapped[list[str]] = mapped_column(ARRAY(String(255)), default=list)
    max_words: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_words: Mapped[int | None] = mapped_column(Integer, nullable=True)
    type: Mapped[GrantSectionEnum] = mapped_column(Enum(GrantSectionEnum))

    # Relationships
    grant_template_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), index=True
    )
    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", back_populates="sections")
    topics: Relationship[list["SectionTopic"]] = relationship(
        "SectionTopic", back_populates="grant_section", cascade="all, delete-orphan"
    )


class SectionTopic(Base):
    """Topic evaluation criteria for grant sections."""

    __tablename__ = "section_topics"

    search_terms: Mapped[list[str]] = mapped_column(ARRAY(String(255)), default=list)
    topic: Mapped[ContentTopicEnum] = mapped_column(Enum(ContentTopicEnum), primary_key=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    grant_section_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_sections.id", ondelete="CASCADE"), primary_key=True
    )
    grant_section: Relationship["GrantSection"] = relationship("GrantSection", back_populates="topics")


class GrantTemplateVector(VectorBase):
    """Grant template vector embeddings."""

    __tablename__ = "grant_template_vectors"

    template_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), primary_key=True
    )
    file_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_template_files.id", ondelete="CASCADE"), primary_key=True
    )

    __table_args__ = (
        Index(
            "idx_grant_template_vectors_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class Workspace(BaseWithUUIDPK):
    """Workspace configuration."""

    __tablename__ = "workspaces"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(Text, index=True)

    # Relationships
    users: Relationship[list["WorkspaceUser"]] = relationship(
        "WorkspaceUser", back_populates="workspace", cascade="all, delete-orphan"
    )
    applications: Relationship[list["GrantApplication"]] = relationship("GrantApplication", back_populates="workspace")


class WorkspaceUser(Base):
    """Workspace user association."""

    __tablename__ = "workspace_users"

    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))
    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)

    # Relationships
    workspace_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="users")


class GrantApplication(BaseWithUUIDPK):
    """Grant application table."""

    __tablename__ = "grant_applications"

    title: Mapped[str] = mapped_column(String(255))
    significance: Mapped[str | None] = mapped_column(Text, nullable=True)
    innovation: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workspace_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="applications")
    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), index=True
    )
    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="applications"
    )
    grant_template_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), index=True
    )
    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", back_populates="applications")

    files: Relationship[list["GrantApplicationFile"]] = relationship(
        "GrantApplicationFile", back_populates="grant_application", passive_deletes=True, cascade="all, delete-orphan"
    )
    research_aims: Relationship[list["ResearchAim"]] = relationship(
        "ResearchAim", back_populates="grant_application", passive_deletes=True, cascade="all, delete-orphan"
    )
    generation_results: Relationship[list["GenerationResult"]] = relationship(
        "GenerationResult", back_populates="grant_application", passive_deletes=True, cascade="all, delete-orphan"
    )


class GrantApplicationFile(FileBase):
    """Grant application file table."""

    __tablename__ = "grant_application_files"

    # Relationships
    grant_application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )
    grant_application: Relationship["GrantApplication"] = relationship("GrantApplication", back_populates="files")


class ResearchAim(BaseWithUUIDPK):
    """Research aim table."""

    __tablename__ = "research_aims"

    aim_number: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    preliminary_results: Mapped[str | None] = mapped_column(Text, nullable=True)
    risks_and_alternatives: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(255))

    # Relationships
    grant_application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )
    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="research_aims"
    )
    research_tasks: Relationship[list["ResearchTask"]] = relationship(
        "ResearchTask", back_populates="research_aim", cascade="all, delete-orphan"
    )


class ResearchTask(BaseWithUUIDPK):
    """Research task table."""

    __tablename__ = "research_tasks"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))

    # Relationships
    aim_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("research_aims.id", ondelete="CASCADE"), index=True)
    research_aim: Relationship["ResearchAim"] = relationship("ResearchAim", back_populates="research_tasks")


class GenerationResult(BaseWithUUIDPK):
    """Text generation result table."""

    __tablename__ = "generation_results"

    billable_characters_used: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    generation_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_of_api_calls: Mapped[int] = mapped_column(Integer, default=0)
    section_id: Mapped[str] = mapped_column(String(128), nullable=True)
    section_type: Mapped[str] = mapped_column(String(128))
    tokens_used: Mapped[int | None] = mapped_column(Integer, default=0)

    # Relationships
    grant_application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )
    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="generation_results"
    )


class ApplicationVector(VectorBase):
    """GrantApplication vector table."""

    __tablename__ = "grant_application_vectors"

    grant_application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True
    )
    file_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_application_files.id", ondelete="CASCADE"), primary_key=True
    )

    __table_args__ = (
        Index(
            "idx_grant_application_vectors_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
