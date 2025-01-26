from datetime import datetime
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy import (
    UUID as SA_UUID,
)
from sqlalchemy.orm import Mapped, Relationship, mapped_column, relationship

from src.constants import EMBEDDING_DIMENSIONS
from src.db.base import Base, BaseWithUUIDPK
from src.db.enums import FileIndexingStatusEnum, UserRoleEnum
from src.db.json_objects import Chunk, GrantPart, GrantSection, ResearchObjective


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

    workspace_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )

    workspace: Relationship["Workspace"] = relationship("Workspace", back_populates="workspace_users")


class RagFile(BaseWithUUIDPK):
    """File storage and processing table."""

    __tablename__ = "rag_files"

    filename: Mapped[str] = mapped_column(String(255))
    indexing_status: Mapped[FileIndexingStatusEnum] = mapped_column(Enum(FileIndexingStatusEnum), index=True)
    mime_type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(BigInteger)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    text_vectors: Relationship[list["TextVector"]] = relationship(
        "TextVector", back_populates="rag_file", cascade="all, delete-orphan"
    )

    __table_args__ = (CheckConstraint("size >= 0", name="check_positive_file_size"),)


class TextVector(BaseWithUUIDPK):
    """Text embedding vectors table."""

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
    """Funding organization configuration."""

    __tablename__ = "funding_organizations"

    full_name: Mapped[str] = mapped_column(String(255), unique=True)
    abbreviation: Mapped[str] = mapped_column(String(64), index=True, nullable=True)

    grant_templates: Relationship[list["GrantTemplate"]] = relationship(
        "GrantTemplate", back_populates="funding_organization"
    )
    organization_files: Relationship[list["OrganizationFile"]] = relationship(
        "OrganizationFile", back_populates="funding_organization", cascade="all, delete-orphan"
    )


class OrganizationFile(Base):
    """Organization file association table."""

    __tablename__ = "organization_files"

    rag_file_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_files.id", ondelete="CASCADE"), primary_key=True
    )
    funding_organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), primary_key=True
    )

    rag_file: Relationship["RagFile"] = relationship("RagFile")
    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="organization_files"
    )


class GrantApplication(BaseWithUUIDPK):
    """Grant application configuration."""

    __tablename__ = "grant_applications"

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    form_inputs: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)
    research_objectives: Mapped[list[ResearchObjective] | None] = mapped_column(JSON, nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(255))

    workspace_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)

    grant_application_files: Relationship[list["GrantApplicationFile"]] = relationship(
        "GrantApplicationFile", back_populates="grant_application", cascade="all, delete-orphan"
    )
    grant_template: Relationship["GrantTemplate | None"] = relationship(
        "GrantTemplate", back_populates="grant_application", cascade="all, delete-orphan", uselist=False
    )
    workspace: Relationship[Workspace] = relationship("Workspace", back_populates="grant_applications")


class GrantApplicationFile(Base):
    """Grant application file association."""

    __tablename__ = "grant_application_files"

    rag_file_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_files.id", ondelete="CASCADE"), primary_key=True
    )
    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True
    )

    rag_file: Relationship[RagFile] = relationship("RagFile")
    grant_application: Relationship[GrantApplication] = relationship(
        "GrantApplication", back_populates="grant_application_files"
    )


class GrantTemplate(BaseWithUUIDPK):
    """Grant template configuration."""

    __tablename__ = "grant_templates"

    grant_sections: Mapped[list[GrantPart | GrantSection]] = mapped_column(JSON)

    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )
    funding_organization_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("funding_organizations.id", ondelete="SET NULL"), nullable=True
    )

    grant_application: Relationship[GrantApplication] = relationship(
        "GrantApplication", back_populates="grant_template"
    )
    funding_organization: Relationship[FundingOrganization | None] = relationship(
        "FundingOrganization", back_populates="grant_templates"
    )
