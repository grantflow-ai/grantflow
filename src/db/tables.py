from enum import StrEnum
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (  # type: ignore[attr-defined]
    DeclarativeBase,  # type: ignore[attr-defined]
    Mapped,
    mapped_column,
)

from src.constants import EMBEDDING_DIMENSIONS


class Base(DeclarativeBase):  # type: ignore[misc]
    """Base class for all tables."""


class UserRoleEnum(StrEnum):
    """Enumeration of user roles."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class ApplicationStatusEnum(StrEnum):
    """Enumeration of application statuses."""

    DRAFT = "draft"
    COMPLETED = "completed"


class ApplicationSectionEnum(StrEnum):
    """Enumeration of application sections."""

    SIGNIFICANCE_AND_INNOVATION = "significance-and-innovation"
    RESEARCH_PLAN = "research-plan"


class User(Base):
    """User table."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum), nullable=False, default=UserRoleEnum.MEMBER)


class Workspace(Base):
    """Workspace table."""

    __tablename__ = "workspaces"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class WorkspaceUser(Base):
    """Workspace user table."""

    __tablename__ = "workspace_users"

    workspace_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE", onupdate="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"), primary_key=True
    )
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum), nullable=False)


class FundingOrganization(Base):
    """Funding organization table."""

    __tablename__ = "funding_organizations"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class GrantCfp(Base):
    """Grant call for proposals table."""

    __tablename__ = "grant_cfps"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    funding_organization_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    allow_clinical_trials: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allow_resubmissions: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    code: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)


class GrantApplication(Base):
    """Grant application table."""

    __tablename__ = "grant_applications"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    workspace_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    cfp_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_cfps.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ApplicationStatusEnum] = mapped_column(
        Enum(ApplicationStatusEnum), nullable=False, default=ApplicationStatusEnum.DRAFT
    )


class ApplicationFile(Base):
    """Application file table."""

    __tablename__ = "application_files"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    section: Mapped[ApplicationSectionEnum] = mapped_column(Enum(ApplicationSectionEnum), nullable=False)
    blob_url: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(255), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)


class ResearchSignificance(Base):
    """Research significance table."""

    __tablename__ = "research_significances"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)


class ResearchInnovation(Base):
    """Research innovation table."""

    __tablename__ = "research_innovations"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)


class ResearchAim(Base):
    """Research aim table."""

    __tablename__ = "research_aims"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requires_clinical_trials: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ResearchTask(Base):
    __tablename__ = "research_tasks"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    aim_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("research_aims.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class GenerationResult(Base):
    """Generation result table."""

    __tablename__ = "generation_results"

    id: Mapped[UUID] = mapped_column(UUID(), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    ticket_id: Mapped[UUID] = mapped_column(UUID(), nullable=False)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)


class ApplicationVector(Base):
    """Application vector table."""

    __tablename__ = "application_vectors"

    application_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    element_type: Mapped[str] = mapped_column(String(50), nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS), nullable=False)
    file_id: Mapped[UUID] = mapped_column(
        UUID(), ForeignKey("application_files.id", ondelete="CASCADE"), primary_key=True
    )
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    labels: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        Index(
            "ix_application_vectors_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
