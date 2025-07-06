from datetime import date, datetime
from typing import Any, Literal
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
    text,
)
from sqlalchemy import (
    UUID as SA_UUID,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Relationship, class_mapper, mapped_column, relationship
from sqlalchemy.orm.exc import DetachedInstanceError
from sqlalchemy.sql.functions import now

from packages.db.src.constants import (
    EMBEDDING_DIMENSIONS,
    GRANT_APPLICATION_GENERATION,
    GRANT_TEMPLATE_GENERATION,
    RAG_FILE,
    RAG_URL,
)
from packages.db.src.enums import (
    ApplicationStatusEnum,
    NotificationTypeEnum,
    RagGenerationStatusEnum,
    SourceIndexingStatusEnum,
    UserRoleEnum,
)
from packages.db.src.json_objects import Chunk, GrantElement, GrantLongFormSection, ResearchDeepDive, ResearchObjective


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


class Project(BaseWithUUIDPK):
    __tablename__ = "projects"

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(Text, index=True)

    grant_applications: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="project", cascade="all, delete-orphan"
    )
    project_users: Relationship[list["ProjectUser"]] = relationship(
        "ProjectUser", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectUser(Base):
    __tablename__ = "project_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))

    project_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)

    project: Relationship["Project"] = relationship("Project", back_populates="project_users")


class UserProjectInvitation(BaseWithUUIDPK):
    __tablename__ = "user_project_invitations"

    project_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))
    invitation_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Relationship["Project"] = relationship("Project")


class RagSource(BaseWithUUIDPK):
    __tablename__ = "rag_sources"

    indexing_status: Mapped[SourceIndexingStatusEnum] = mapped_column(
        Enum(SourceIndexingStatusEnum), index=True, default=SourceIndexingStatusEnum.CREATED
    )
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    text_vectors: Relationship[list["TextVector"]] = relationship(
        "TextVector", back_populates="rag_source", cascade="all, delete-orphan"
    )

    __mapper_args__ = {  # noqa: RUF012
        "polymorphic_identity": "rag_source",
        "polymorphic_on": "source_type",
    }

    source_type: Mapped[Literal["rag_file", "rag_url"]] = mapped_column(String(50))


class RagFile(RagSource):
    __tablename__ = "rag_files"
    id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), primary_key=True)
    bucket_name: Mapped[str] = mapped_column(String(255))
    object_path: Mapped[str] = mapped_column(String(255))
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(BigInteger)

    __table_args__ = (
        CheckConstraint("size >= 0", name="check_positive_file_size"),
        UniqueConstraint("bucket_name", "object_path", name="uq_bucket_object"),
    )

    __mapper_args__ = {  # noqa: RUF012
        "polymorphic_identity": RAG_FILE,
    }


class RagUrl(RagSource):
    __tablename__ = "rag_urls"

    id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), primary_key=True)
    url: Mapped[str] = mapped_column(Text, unique=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    __mapper_args__ = {  # noqa: RUF012
        "polymorphic_identity": RAG_URL,
    }


class TextVector(BaseWithUUIDPK):
    __tablename__ = "text_vectors"

    chunk: Mapped[Chunk] = mapped_column(JSON)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))

    rag_source_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), index=True)
    rag_source: Relationship["RagSource"] = relationship("RagSource", back_populates="text_vectors")

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
    rag_sources: Relationship[list["FundingOrganizationRagSource"]] = relationship(
        "FundingOrganizationRagSource",
        back_populates="funding_organization",
        cascade="all, delete-orphan",
    )


class FundingOrganizationRagSource(Base):
    __tablename__ = "funding_organization_rag_sources"

    rag_source_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), primary_key=True
    )
    funding_organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("funding_organizations.id", ondelete="CASCADE"), primary_key=True
    )

    funding_organization: Relationship["FundingOrganization"] = relationship(
        "FundingOrganization", back_populates="rag_sources"
    )
    rag_source: Relationship["RagSource"] = relationship("RagSource")


class GrantApplication(BaseWithUUIDPK):
    __tablename__ = "grant_applications"

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    form_inputs: Mapped[ResearchDeepDive | None] = mapped_column(JSON, nullable=True)
    research_objectives: Mapped[list[ResearchObjective] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ApplicationStatusEnum] = mapped_column(
        Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.DRAFT, index=True
    )
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(Text)

    project_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    rag_job_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )

    rag_sources: Relationship[list["GrantApplicationRagSource"]] = relationship(
        "GrantApplicationRagSource", back_populates="grant_application", cascade="all, delete-orphan"
    )
    grant_template: Relationship["GrantTemplate | None"] = relationship(
        "GrantTemplate", back_populates="grant_application", cascade="all, delete-orphan", uselist=False
    )
    project: Relationship[Project] = relationship("Project", back_populates="grant_applications")
    rag_job: Relationship["GrantApplicationGenerationJob | None"] = relationship(
        "GrantApplicationGenerationJob",
        back_populates="grant_application",
        uselist=False,
        foreign_keys="[GrantApplication.rag_job_id]",
    )


class GrantApplicationRagSource(Base):
    __tablename__ = "grant_application_rag_sources"

    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), primary_key=True
    )
    rag_source_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), primary_key=True
    )

    grant_application: Relationship["GrantApplication"] = relationship("GrantApplication", back_populates="rag_sources")
    rag_source: Relationship["RagSource"] = relationship("RagSource")


class GrantTemplate(BaseWithUUIDPK):
    __tablename__ = "grant_templates"

    grant_sections: Mapped[list[GrantLongFormSection | GrantElement]] = mapped_column(JSON)

    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True
    )
    funding_organization_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("funding_organizations.id", ondelete="SET NULL"), nullable=True
    )
    rag_job_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )

    submission_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    grant_application: Relationship[GrantApplication] = relationship(
        "GrantApplication", back_populates="grant_template"
    )
    funding_organization: Relationship[FundingOrganization | None] = relationship(
        "FundingOrganization", back_populates="grant_templates"
    )
    rag_sources: Relationship[list["GrantTemplateRagSource"]] = relationship(
        "GrantTemplateRagSource", back_populates="grant_template", cascade="all, delete-orphan"
    )
    rag_job: Relationship["GrantTemplateGenerationJob | None"] = relationship(
        "GrantTemplateGenerationJob",
        back_populates="grant_template",
        uselist=False,
        foreign_keys="[GrantTemplate.rag_job_id]",
    )


class GrantTemplateRagSource(Base):
    __tablename__ = "grant_template_rag_sources"

    rag_source_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), primary_key=True
    )
    grant_template_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), primary_key=True
    )

    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", back_populates="rag_sources")
    rag_source: Relationship["RagSource"] = relationship("RagSource")


class RagGenerationJob(BaseWithUUIDPK):
    __tablename__ = "rag_generation_jobs"

    status: Mapped[RagGenerationStatusEnum] = mapped_column(
        Enum(RagGenerationStatusEnum), index=True, default=RagGenerationStatusEnum.PENDING
    )

    current_stage: Mapped[int] = mapped_column(BigInteger, default=0)
    total_stages: Mapped[int] = mapped_column(BigInteger)
    retry_count: Mapped[int] = mapped_column(BigInteger, default=0)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    checkpoint_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    job_type: Mapped[Literal["grant_template_generation", "grant_application_generation"]] = mapped_column(String(50))

    __mapper_args__ = {  # noqa: RUF012
        "polymorphic_identity": "rag_generation_job",
        "polymorphic_on": "job_type",
    }

    __table_args__ = (
        Index("idx_rag_generation_jobs_status_created", "status", "created_at"),
        Index("idx_rag_generation_jobs_status_retry", "status", "retry_count"),
        CheckConstraint("retry_count >= 0", name="check_retry_count_non_negative"),
        CheckConstraint("current_stage >= 0", name="check_current_stage_non_negative"),
        CheckConstraint("total_stages > 0", name="check_total_stages_positive"),
    )


class GrantTemplateGenerationJob(RagGenerationJob):
    __tablename__ = "grant_template_generation_jobs"

    id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="CASCADE"), primary_key=True
    )

    grant_template_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_templates.id", ondelete="CASCADE"), index=True, unique=True
    )

    extracted_sections: Mapped[list[GrantElement] | None] = mapped_column(JSON, nullable=True)
    extracted_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    grant_template: Relationship["GrantTemplate"] = relationship("GrantTemplate", viewonly=True, overlaps="rag_job")

    __mapper_args__ = {  # noqa: RUF012
        "polymorphic_identity": GRANT_TEMPLATE_GENERATION,
    }


class GrantApplicationGenerationJob(RagGenerationJob):
    __tablename__ = "grant_application_generation_jobs"

    id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="CASCADE"), primary_key=True
    )

    grant_application_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="CASCADE"), index=True, unique=True
    )

    generated_sections: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)
    validation_results: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    grant_application: Relationship["GrantApplication"] = relationship(
        "GrantApplication", viewonly=True, overlaps="rag_job"
    )

    __mapper_args__ = {  # noqa: RUF012
        "polymorphic_identity": GRANT_APPLICATION_GENERATION,
    }


class RagGenerationNotification(Base):
    __tablename__ = "rag_generation_notifications"

    id: Mapped[UUID] = mapped_column(SA_UUID(), primary_key=True, insert_default=uuid4)

    rag_job_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="CASCADE"), index=True
    )

    event: Mapped[str] = mapped_column(String(100), index=True)
    message: Mapped[str] = mapped_column(Text)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    current_pipeline_stage: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_pipeline_stages: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    notification_type: Mapped[str] = mapped_column(String(20), default="info")

    rag_job: Relationship["RagGenerationJob"] = relationship("RagGenerationJob")

    __table_args__ = (Index("idx_rag_notifications_job_created", "rag_job_id", "created_at"),)


class Notification(BaseWithUUIDPK):
    __tablename__ = "notifications"

    firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    project_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=True
    )

    type: Mapped[NotificationTypeEnum] = mapped_column(Enum(NotificationTypeEnum))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    project_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    read: Mapped[bool] = mapped_column(default=False)
    dismissed: Mapped[bool] = mapped_column(default=False)

    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=dict)

    project: Relationship["Project"] = relationship("Project", viewonly=True)

    __table_args__ = (
        Index("idx_notifications_user_active", "firebase_uid", postgresql_where=text("dismissed = FALSE")),
        Index("idx_notifications_user_created", "firebase_uid", "created_at"),
    )
