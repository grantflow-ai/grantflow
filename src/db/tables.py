from datetime import datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, JSON, Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Relationship,
    mapped_column,
    relationship,
    validates,
)
from sqlalchemy.sql.functions import now

from src.constants import EMBEDDING_DIMENSIONS
from src.db.enums import FileIndexingStatusEnum, GrantSectionEnum, ResearchAspectEnum, UserRoleEnum
from src.db.utils import validate_markdown_template
from src.dto import Chunk


class Base(DeclarativeBase):
    """Base class for all tables."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now(), onupdate=now())


class BaseWithUUIDPK(Base):
    """Base class for all tables with UUID primary keys."""

    __abstract__ = True

    id: Mapped[UUID[str]] = mapped_column(UUID(), primary_key=True, insert_default=uuid4)


class VectorBase(Base):
    """Base class for all tables with vector columns."""

    __abstract__ = True

    chunk_index: Mapped[int] = mapped_column(Integer, primary_key=True)

    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))  # Flattened list
    chunk: Mapped[Chunk] = mapped_column(JSON)


class FileBase(BaseWithUUIDPK):
    """Application file table."""

    __abstract__ = True

    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(Integer)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[FileIndexingStatusEnum] = mapped_column(Enum(FileIndexingStatusEnum))


class FundingOrganization(BaseWithUUIDPK):
    """Funding organization table."""

    __tablename__ = "funding_organizations"

    name: Mapped[str] = mapped_column(String(255), unique=True)

    # Relationships
    grant_formats: Relationship[list["GrantFormat"]] = relationship(
        "GrantFormat", back_populates="funding_organization"
    )
    cfps: Relationship["GrantCfp"] = relationship("GrantCfp", back_populates="funding_organization")


class GrantFormat(BaseWithUUIDPK):
    """Grant format table."""

    __tablename__ = "grant_formats"

    name: Mapped[str] = mapped_column(String(255), default=str)
    template: Mapped[str] = mapped_column(Text, default=str)

    # Relationships
    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), index=True
    )
    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="grant_formats"
    )

    sections: Relationship[list["GrantSection"]] = relationship("GrantSection", back_populates="format")
    cfps: Relationship[list["GrantCfp"]] = relationship("GrantCfp", back_populates="format")
    files: Relationship[list["GrantFormatFile"]] = relationship("GrantFormatFile", back_populates="format")

    __table_args__ = (Index("uq_format_name_funding_org", "name", "funding_organization_id", unique=True),)

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


class GrantFormatFile(FileBase):
    """Grant format file table."""

    __tablename__ = "grant_format_files"

    # Relationships
    format_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("grant_formats.id", ondelete="CASCADE"), index=True)
    format: Relationship["GrantFormat"] = relationship("GrantFormat", back_populates="files")


class GrantSection(BaseWithUUIDPK):
    """Grant Section table."""

    __tablename__ = "grant_sections"

    keywords: Mapped[list[str]] = mapped_column(ARRAY(String(255)), default=list)
    max_words: Mapped[int] = mapped_column(Integer, nullable=True)
    min_words: Mapped[int] = mapped_column(Integer, nullable=True)
    type: Mapped[GrantSectionEnum] = mapped_column(Enum(GrantSectionEnum))

    # Relationships
    format_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("grant_formats.id", ondelete="CASCADE"), index=True)
    format: Relationship["GrantFormat"] = relationship("GrantFormat", back_populates="sections")

    aspects: Relationship[list["SectionAspect"]] = relationship("SectionAspect", back_populates="section")


class SectionAspect(Base):
    """Section Aspects through table."""

    __tablename__ = "section_aspects"

    type: Mapped[ResearchAspectEnum] = mapped_column(Enum(ResearchAspectEnum), primary_key=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    section_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_sections.id", ondelete="CASCADE"), primary_key=True
    )
    section: Relationship["GrantSection"] = relationship("GrantSection", back_populates="aspects")


class GrantFormatVector(VectorBase):
    """Grant format vector table."""

    __tablename__ = "grant_format_vectors"

    format_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_formats.id", ondelete="CASCADE"), primary_key=True
    )
    file_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_format_files.id", ondelete="CASCADE"), primary_key=True
    )

    __table_args__ = (
        Index(
            "ix_grant_format_vectors_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class GrantCfp(BaseWithUUIDPK):
    """Grant call for proposals table."""

    __tablename__ = "grant_cfps"

    allow_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_resubmissions: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    code: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), index=True
    )
    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="cfps"
    )

    format_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_formats.id", ondelete="RESTRICT"), index=True
    )
    format: Relationship["GrantFormat"] = relationship("GrantFormat", back_populates="cfps")

    __table_args__ = (Index("uq_cfp_code_funding_org", "code", "funding_organization_id", unique=True),)


class Workspace(BaseWithUUIDPK):
    """Workspace table."""

    __tablename__ = "workspaces"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(Text, index=True)

    # Relationships
    users: Relationship[list["WorkspaceUser"]] = relationship("WorkspaceUser", back_populates="workspace")
    applications: Relationship[list["Application"]] = relationship("Application", back_populates="workspace")


class WorkspaceUser(Base):
    """Workspace user table."""

    __tablename__ = "workspace_users"

    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))
    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)

    # Relationships
    workspace_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="users")


class Application(BaseWithUUIDPK):
    """Grant application table."""

    __tablename__ = "applications"

    title: Mapped[str] = mapped_column(String(255))
    significance: Mapped[str | None] = mapped_column(Text, nullable=True)
    innovation: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    workspace_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="applications")
    cfp_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("grant_cfps.id", ondelete="CASCADE"), index=True)
    cfp: Relationship["GrantCfp"] = relationship("GrantCfp")
    files: Relationship[list["ApplicationFile"]] = relationship(
        "ApplicationFile", back_populates="application", passive_deletes=True
    )
    research_aims: Relationship[list["ResearchAim"]] = relationship(
        "ResearchAim", back_populates="application", passive_deletes=True
    )
    generation_results: Relationship[list["TextGenerationResult"]] = relationship(
        "TextGenerationResult", back_populates="application", passive_deletes=True
    )


class ApplicationFile(FileBase):
    """Application file table."""

    __tablename__ = "application_files"

    # Relationships
    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    application: Relationship["Application"] = relationship("Application", back_populates="files")


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
    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    application: Relationship["Application"] = relationship("Application", back_populates="research_aims")
    research_tasks: Relationship[list["ResearchTask"]] = relationship("ResearchTask", back_populates="research_aim")


class ResearchTask(BaseWithUUIDPK):
    """Research task table."""

    __tablename__ = "research_tasks"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))

    # Relationships
    aim_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("research_aims.id", ondelete="CASCADE"), index=True)
    research_aim: Relationship["ResearchAim"] = relationship("ResearchAim", back_populates="research_tasks")


class TextGenerationResult(BaseWithUUIDPK):
    """Text generation result table."""

    __tablename__ = "text_generation_results"

    billable_characters_used: Mapped[int | None] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    generation_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_of_api_calls: Mapped[int] = mapped_column(Integer, default=0)
    section_id: Mapped[str] = mapped_column(String(128), nullable=True)
    section_type: Mapped[str] = mapped_column(String(128))
    tokens_used: Mapped[int | None] = mapped_column(Integer, default=0)

    # Relationships
    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    application: Relationship["Application"] = relationship("Application", back_populates="generation_results")


class ApplicationVector(VectorBase):
    """Application vector table."""

    __tablename__ = "application_vectors"

    application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("applications.id", ondelete="CASCADE"), primary_key=True
    )
    file_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("application_files.id", ondelete="CASCADE"), primary_key=True
    )

    __table_args__ = (
        Index(
            "ix_application_vectors_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
