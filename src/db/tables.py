from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (  # type: ignore[attr-defined]
    DeclarativeBase,
    Mapped,
    MappedAsDataclass,
    Relationship,
    mapped_column,
    relationship,
)

from src.constants import EMBEDDING_DIMENSIONS


class Base(MappedAsDataclass, DeclarativeBase):  # type: ignore[misc]
    """Base class for all tables."""


class UserRoleEnum(StrEnum):
    """Enumeration of user roles."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class User(Base):
    """User table."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    email: Mapped[str] = mapped_column(String(255), unique=True, default=None)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class Workspace(Base):
    """Workspace table."""

    __tablename__ = "workspaces"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    name: Mapped[str] = mapped_column(Text, index=True, default=None)

    # Relationships
    users: Relationship[Relationship["WorkspaceUser"]] = relationship(  # type: ignore[call-arg]
        "WorkspaceUser", back_populates="workspace", default=None
    )


class WorkspaceUser(Base):
    """Workspace user table."""

    __tablename__ = "workspace_users"

    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum), default=None)

    # Relationships
    workspace_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE", onupdate="CASCADE"), primary_key=True, default=None
    )
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="users", default=None)  # type: ignore[call-arg]

    user_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"), primary_key=True, default=None
    )
    user: Relationship["User"] = relationship("User", default=None)  # type: ignore[call-arg]


class FundingOrganization(Base):
    """Funding organization table."""

    __tablename__ = "funding_organizations"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    name: Mapped[str] = mapped_column(String(255), index=True, default=None)

    # Relationships
    cfps: Relationship["GrantCfp"] = relationship(  # type: ignore[call-arg]
        "GrantCfp", back_populates="funding_organization", cascade="all, delete-orphan", default=None
    )


class GrantCfp(Base):
    """Grant call for proposals table."""

    __tablename__ = "grant_cfps"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    allow_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_resubmissions: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    code: Mapped[str] = mapped_column(String(255), index=True, default=None)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    title: Mapped[str] = mapped_column(String(255), default=None)
    url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Relationships
    funding_organization_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )

    funding_organization: Relationship["FundingOrganization"] = relationship(  # type: ignore[call-arg]
        "FundingOrganization", back_populates="cfps", default=None
    )


class GrantApplication(Base):
    """Grant application table."""

    __tablename__ = "grant_applications"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    title: Mapped[str] = mapped_column(String(255), default=None)
    significance: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    innovation: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    # Relationships
    workspace_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    cfp_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_cfps.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    cfp: Relationship["GrantCfp"] = relationship("GrantCfp", default=None)  # type: ignore[call-arg]
    application_files: Relationship[list["ApplicationFile"]] = relationship(  # type: ignore[call-arg]
        "ApplicationFile", back_populates="grant_application", cascade="all, delete-orphan", default=None
    )
    research_aims: Relationship[list["ResearchAim"]] = relationship(  # type: ignore[call-arg]
        "ResearchAim", back_populates="grant_application", cascade="all, delete-orphan", default=None
    )
    drafts: Relationship[list["ApplicationDraft"]] = relationship(  # type: ignore[call-arg]
        "ApplicationDraft", back_populates="grant_application", cascade="all, delete-orphan", default=None
    )


class ApplicationFile(Base):
    """Application file table."""

    __tablename__ = "application_files"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    name: Mapped[str] = mapped_column(String(255), default=None)
    type: Mapped[str] = mapped_column(String(255), default=None)
    size: Mapped[int] = mapped_column(Integer, default=None)

    # Relationships
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    grant_application: Relationship["GrantApplication"] = relationship(  # type: ignore[call-arg]
        "GrantApplication", back_populates="application_files", default=None
    )


class ResearchAim(Base):
    """Research aim table."""

    __tablename__ = "research_aims"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    aim_number: Mapped[int] = mapped_column(Integer, default=None)
    description: Mapped[str] = mapped_column(Text, default=None)
    relations: Mapped[list[str]] = mapped_column(ARRAY(Text), insert_default=list, default=None)
    requires_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(255), default=None)

    # Relationships
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    grant_application: Relationship["GrantApplication"] = relationship(  # type: ignore[call-arg]
        "GrantApplication", back_populates="research_aims", default=None
    )
    research_tasks: Relationship[list["ResearchTask"]] = relationship(  # type: ignore[call-arg]
        "ResearchTask", back_populates="research_aim", cascade="all, delete-orphan", default=None
    )


class ResearchTask(Base):
    """Research task table."""

    __tablename__ = "research_tasks"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    description: Mapped[str] = mapped_column(Text, default=None)
    relations: Mapped[list[str]] = mapped_column(ARRAY(Text), insert_default=list, default=None)
    task_number: Mapped[str] = mapped_column(String(4), default=None)
    title: Mapped[str] = mapped_column(String(255), default=None)

    # Relationships
    aim_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("research_aims.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    research_aim: Relationship["ResearchAim"] = relationship(  # type: ignore[call-arg]
        "ResearchAim", back_populates="research_tasks", default=None
    )


class ApplicationDraft(Base):
    """Generation result table."""

    __tablename__ = "generation_results"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, insert_default=uuid4, default=None)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=datetime.now(tz=UTC))
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    text: Mapped[str] = mapped_column(Text, default=None)

    # Relationships
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), default=None
    )
    grant_application: Relationship["GrantApplication"] = relationship(  # type: ignore[call-arg]
        "GrantApplication", back_populates="drafts", default=None
    )


class ApplicationVector(Base):
    """Application vector table."""

    __tablename__ = "application_vectors"

    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True, default=None
    )
    file_id: Mapped[UUID] = mapped_column(
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
