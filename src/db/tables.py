from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    JSON,
    UUID,
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
from sqlalchemy.orm import Mapped, Relationship, mapped_column, relationship, validates

from src.constants import EMBEDDING_DIMENSIONS
from src.db.base import Base, BaseWithUUIDPK
from src.db.enums import ContentTopicEnum, FileIndexingStatusEnum, GrantSectionEnum, UserRoleEnum
from src.db.utils import validate_markdown_template
from src.dto import Chunk


class Workspace(BaseWithUUIDPK):
    """Workspace configuration."""

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
    """Workspace user association."""

    __tablename__ = "workspace_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))

    workspace_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )

    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="workspace_users")


class File(BaseWithUUIDPK):
    """File storage and processing table."""

    __tablename__ = "files"

    name: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(Integer)
    status: Mapped[FileIndexingStatusEnum] = mapped_column(Enum(FileIndexingStatusEnum), index=True)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(255))

    text_vectors: Relationship[list["TextVector"]] = relationship(
        "TextVector", back_populates="file", cascade="all, delete-orphan"
    )


class TextVector(BaseWithUUIDPK):
    """Text embedding vectors table."""

    __tablename__ = "text_vectors"

    chunk: Mapped[Chunk] = mapped_column(JSON)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))

    file_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), index=True)

    file: Relationship["File"] = relationship("File", back_populates="text_vectors")

    __table_args__ = (
        Index(
            "idx_text_vectors_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 48, "ef_construction": 256},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class FundingOrganization(BaseWithUUIDPK):
    """Funding organization configuration."""

    __tablename__ = "funding_organizations"

    name: Mapped[str] = mapped_column(String(255), unique=True)

    grant_templates: Relationship[list["GrantTemplate"]] = relationship(
        "GrantTemplate", back_populates="funding_organization", cascade="all, delete-orphan"
    )


class OrganizationFile(Base):
    """Organization file association table."""

    __tablename__ = "organization_files"

    file_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), unique=True
    )

    file: Relationship["File"] = relationship("File")
    funding_organization: Relationship["FundingOrganization"] = relationship("FundingOrganization")


class GrantTemplate(BaseWithUUIDPK):
    """Grant template configuration."""

    __tablename__ = "grant_templates"

    name: Mapped[str] = mapped_column(String(255))
    template: Mapped[str] = mapped_column(Text)

    funding_organization_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), index=True
    )

    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="grant_templates"
    )
    grant_applications: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="grant_template", cascade="all, delete-orphan"
    )
    grant_sections: Relationship[list["GrantSection"]] = relationship(
        "GrantSection", back_populates="grant_template", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_grant_template_name_org", "name", "funding_organization_id", unique=True),)

    @validates("template")
    def validate_template(self, _: str, text: str) -> str:
        """Validate the grant format template.

        Args:
            text: The text.

        Returns:
            The validated grant format template.
        """
        validate_markdown_template(text)
        return text


class GrantSection(BaseWithUUIDPK):
    """Grant section configuration."""

    __tablename__ = "grant_sections"

    max_words: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_words: Mapped[int | None] = mapped_column(Integer, nullable=True)
    search_terms: Mapped[list[str]] = mapped_column(ARRAY(String(255)), default=list)
    type: Mapped[GrantSectionEnum] = mapped_column(Enum(GrantSectionEnum))

    grant_template_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), index=True
    )

    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", back_populates="grant_sections")
    section_topics: Relationship[list["SectionTopic"]] = relationship(
        "SectionTopic", back_populates="grant_section", cascade="all, delete-orphan"
    )


class SectionTopic(Base):
    """Section topic configuration."""

    __tablename__ = "section_topics"

    search_terms: Mapped[list[str]] = mapped_column(ARRAY(String(255)), default=list)
    topic: Mapped[ContentTopicEnum] = mapped_column(Enum(ContentTopicEnum), primary_key=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)

    grant_section_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_sections.id", ondelete="CASCADE"), primary_key=True
    )

    grant_section: Relationship["GrantSection"] = relationship("GrantSection", back_populates="section_topics")


class GrantApplication(BaseWithUUIDPK):
    """Grant application configuration."""

    __tablename__ = "grant_applications"

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    innovation: Mapped[str | None] = mapped_column(Text, nullable=True)
    significance: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(255))

    grant_template_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), index=True
    )
    workspace_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)

    generation_results: Relationship[list["GenerationResult"]] = relationship(
        "GenerationResult", back_populates="grant_application", cascade="all, delete-orphan"
    )
    grant_application_files: Relationship[list["GrantApplicationFile"]] = relationship(
        "GrantApplicationFile", back_populates="grant_application", cascade="all, delete-orphan"
    )
    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", back_populates="grant_applications")
    research_aims: Relationship[list["ResearchAim"]] = relationship(
        "ResearchAim", back_populates="grant_application", cascade="all, delete-orphan"
    )
    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="grant_applications")


class GrantApplicationFile(Base):
    """Grant application file association."""

    __tablename__ = "grant_application_files"

    file_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    grant_application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), unique=True
    )

    file: Relationship["File"] = relationship("File")
    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="grant_application_files"
    )


class ResearchAim(BaseWithUUIDPK):
    """Research aim configuration."""

    __tablename__ = "research_aims"

    aim_number: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    preliminary_results: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_clinical_trials: Mapped[bool] = mapped_column(Boolean, default=False)
    risks_and_alternatives: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(255))

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
    """Research task configuration."""

    __tablename__ = "research_tasks"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))

    aim_id: Mapped[UUID[str]] = mapped_column(UUID(), ForeignKey("research_aims.id", ondelete="CASCADE"), index=True)

    research_aim: Relationship["ResearchAim"] = relationship("ResearchAim", back_populates="research_tasks")


class GenerationResult(BaseWithUUIDPK):
    """Generation result configuration."""

    __tablename__ = "generation_results"

    billable_characters_used: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    generation_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_of_api_calls: Mapped[int] = mapped_column(Integer, default=0)
    section_id: Mapped[str] = mapped_column(String(128), nullable=True)
    section_type: Mapped[str] = mapped_column(String(128))
    tokens_used: Mapped[int | None] = mapped_column(Integer, default=0)

    grant_application_id: Mapped[UUID[str]] = mapped_column(
        UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )

    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", back_populates="generation_results"
    )
