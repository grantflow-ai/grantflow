from enum import StrEnum
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    MappedAsDataclass,
    Relationship,
    mapped_column,
    relationship,
)

from src.constants import EMBEDDING_DIMENSIONS


class Base(MappedAsDataclass, DeclarativeBase):
    """Base class for all tables."""


class UserRoleEnum(StrEnum):
    """Enumeration of user roles."""

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class FileIndexingStatusEnum(StrEnum):
    """Enumeration of file indexing statuses."""

    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


class Workspace(Base):
    """Workspace table."""

    __tablename__ = "workspaces"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    name: Mapped[str] = mapped_column(Text, index=True, default=None)

    # Relationships
    users: Relationship[list["WorkspaceUser"]] = relationship("WorkspaceUser", back_populates="workspace", default=None)


class WorkspaceUser(Base):
    """Workspace user table."""

    __tablename__ = "workspace_users"

    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum), default=None)
    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True, default=None)

    # Relationships
    workspace_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE", onupdate="CASCADE"), primary_key=True, default=None
    )
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="users", default=None)


class FundingOrganization(Base):
    """Funding organization table."""

    __tablename__ = "funding_organizations"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    name: Mapped[str] = mapped_column(String(255), index=True, default=None)

    # Relationships
    cfps: Relationship["GrantCfp"] = relationship(
        "GrantCfp", back_populates="funding_organization", cascade="all, delete-orphan", default=None
    )


class GrantCfp(Base):
    """Grant call for proposals table."""

    __tablename__ = "grant_cfps"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    allow_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_resubmissions: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    code: Mapped[str] = mapped_column(String(255), index=True, default=None)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    title: Mapped[str] = mapped_column(String(255), default=None)
    url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Relationships
    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )

    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="cfps", default=None
    )


class GrantApplication(Base):
    """Grant application table."""

    __tablename__ = "grant_applications"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    title: Mapped[str] = mapped_column(String(255), default=None)
    significance: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    innovation: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Relationships
    workspace_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    cfp_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_cfps.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    cfp: Relationship["GrantCfp"] = relationship("GrantCfp", default=None)
    application_files: Relationship[list["ApplicationFile"]] = relationship(
        "ApplicationFile", back_populates="grant_application", cascade="all, delete-orphan", default=None
    )
    research_aims: Relationship[list["ResearchAim"]] = relationship(
        "ResearchAim", back_populates="grant_application", cascade="all, delete-orphan", default=None
    )
    drafts: Relationship[list["ApplicationDraft"]] = relationship(
        "ApplicationDraft", back_populates="grant_application", cascade="all, delete-orphan", default=None
    )


class ApplicationFile(Base):
    """Application file table."""

    __tablename__ = "application_files"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    name: Mapped[str] = mapped_column(String(255), default=None)
    type: Mapped[str] = mapped_column(String(255), default=None)
    size: Mapped[int] = mapped_column(Integer, default=None)
    status: Mapped[FileIndexingStatusEnum] = mapped_column(Enum(FileIndexingStatusEnum), default=None)

    # Relationships
    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="application_files", default=None
    )


class ResearchAim(Base):
    """Research aim table."""

    __tablename__ = "research_aims"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    aim_number: Mapped[int] = mapped_column(Integer, default=None)
    description: Mapped[str] = mapped_column(Text, default=None)
    relations: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=None)
    requires_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(255), default=None)

    # Relationships
    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="research_aims", default=None
    )
    research_tasks: Relationship[list["ResearchTask"]] = relationship(
        "ResearchTask", back_populates="research_aim", cascade="all, delete-orphan", default=None
    )


class ResearchTask(Base):
    """Research task table."""

    __tablename__ = "research_tasks"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    description: Mapped[str] = mapped_column(Text, default=None)
    relations: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=None)
    task_number: Mapped[int] = mapped_column(Integer, default=None)
    title: Mapped[str] = mapped_column(String(255), default=None)

    # Relationships
    aim_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("research_aims.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    research_aim: Relationship["ResearchAim"] = relationship(
        "ResearchAim", back_populates="research_tasks", default=None
    )


class ApplicationDraft(Base):
    """Generation result table."""

    __tablename__ = "application_drafts"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    completed_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, index=True
    )
    text: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Relationships
    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="drafts", default=None
    )
    generation_results: Relationship[list["TextGenerationResult"]] = relationship(
        "TextGenerationResult", back_populates="application_draft", cascade="all, delete-orphan", default=None
    )


class TextGenerationResult(Base):
    """Text generation result table."""

    __tablename__ = "text_generation_results"

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    content: Mapped[str] = mapped_column(Text, default=None)
    generation_duration: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    number_of_api_calls: Mapped[int] = mapped_column(Integer, default=None)
    section_id: Mapped[str] = mapped_column(String, nullable=True, default=None)
    section_type: Mapped[str] = mapped_column(String, default=None)

    # Relationships
    application_draft_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("application_drafts.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )


class ApplicationVector(Base):
    """Application vector table."""

    __tablename__ = "application_vectors"

    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True, default=None
    )
    file_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("application_files.id", ondelete="CASCADE"), primary_key=True, default=None
    )
    chunk_index: Mapped[int] = mapped_column(Integer, primary_key=True, default=None)

    content: Mapped[str] = mapped_column(Text, default=None)
    element_type: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    embedding: Mapped[list[list[float]]] = mapped_column(Vector(EMBEDDING_DIMENSIONS), default=None)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)

    __table_args__ = (
        Index(
            "ix_application_vectors_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
