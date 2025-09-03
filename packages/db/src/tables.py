from datetime import UTC, date, datetime
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
    ForeignKeyConstraint,
    Index,
    LargeBinary,
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
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(UTC)

    def restore(self) -> None:
        self.deleted_at = None

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


class Organization(BaseWithUUIDPK):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_person_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    institutional_affiliation: Mapped[str | None] = mapped_column(String(200), nullable=True)
    settings: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, server_default=text("'{}'::jsonb"))

    organization_users: Relationship[list["OrganizationUser"]] = relationship(
        "OrganizationUser", back_populates="organization", cascade="all, delete-orphan"
    )
    projects: Relationship[list["Project"]] = relationship(
        "Project", back_populates="organization", cascade="all, delete-orphan"
    )


class OrganizationUser(Base):
    __tablename__ = "organization_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))
    has_all_projects_access: Mapped[bool] = mapped_column(default=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now())

    organization: Relationship["Organization"] = relationship("Organization", back_populates="organization_users")
    project_access: Relationship[list["ProjectAccess"]] = relationship(
        "ProjectAccess", back_populates="organization_user", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_org_user_org_role", "organization_id", "role"),)


class OrganizationAuditLog(BaseWithUUIDPK):
    __tablename__ = "organization_audit_logs"

    organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_firebase_uid: Mapped[str] = mapped_column(String(128), index=True)
    action: Mapped[str] = mapped_column(String(50), index=True)
    target_user_firebase_uid: Mapped[str | None] = mapped_column(String(128), nullable=True)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    organization: Relationship["Organization"] = relationship("Organization", viewonly=True)

    __table_args__ = (
        Index("idx_audit_org_user_action", "organization_id", "user_firebase_uid", "action"),
        Index("idx_audit_org_created", "organization_id", "created_at"),
    )


class Project(BaseWithUUIDPK):
    __tablename__ = "projects"

    organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization: Relationship["Organization"] = relationship("Organization", back_populates="projects")
    grant_applications: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="project", cascade="all, delete-orphan"
    )
    project_access: Relationship[list["ProjectAccess"]] = relationship(
        "ProjectAccess", back_populates="project", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_project_org_name", "organization_id", "name"),)


class ProjectAccess(Base):
    __tablename__ = "project_access"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    organization_id: Mapped[UUID] = mapped_column(SA_UUID(), primary_key=True)
    project_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now())

    organization_user: Relationship["OrganizationUser"] = relationship(
        "OrganizationUser",
        primaryjoin="and_(ProjectAccess.firebase_uid == OrganizationUser.firebase_uid, "
        "ProjectAccess.organization_id == OrganizationUser.organization_id)",
        back_populates="project_access",
        viewonly=True,
    )
    project: Relationship["Project"] = relationship("Project", back_populates="project_access")

    __table_args__ = (
        ForeignKeyConstraint(
            ["firebase_uid", "organization_id"],
            ["organization_users.firebase_uid", "organization_users.organization_id"],
            ondelete="CASCADE",
        ),
        Index("idx_project_access_user", "firebase_uid", "organization_id"),
    )


class OrganizationInvitation(BaseWithUUIDPK):
    __tablename__ = "organization_invitations"

    organization_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum))
    invitation_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Relationship["Organization"] = relationship("Organization")

    __table_args__ = (
        UniqueConstraint("organization_id", "email", name="uq_org_invitation_email"),
        Index("idx_org_invitation_status", "organization_id", "accepted_at"),
    )


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


class GrantingInstitution(BaseWithUUIDPK):
    __tablename__ = "granting_institutions"

    full_name: Mapped[str] = mapped_column(String(255), unique=True)
    abbreviation: Mapped[str] = mapped_column(String(64), index=True, nullable=True)

    grant_templates: Relationship[list["GrantTemplate"]] = relationship(
        "GrantTemplate", back_populates="granting_institution"
    )
    rag_sources: Relationship[list["GrantingInstitutionSource"]] = relationship(
        "GrantingInstitutionSource",
        back_populates="granting_institution",
        cascade="all, delete-orphan",
    )
    grants: Relationship[list["Grant"]] = relationship("Grant", back_populates="granting_institution")


class Grant(BaseWithUUIDPK):
    __tablename__ = "grants"

    granting_institution_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("granting_institutions.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(500), index=True)
    description: Mapped[str] = mapped_column(Text)
    release_date: Mapped[str] = mapped_column(String(50), index=True)
    expired_date: Mapped[str] = mapped_column(String(50), index=True)
    activity_code: Mapped[str] = mapped_column(String(50), index=True)
    organization: Mapped[str] = mapped_column(String(255))
    parent_organization: Mapped[str] = mapped_column(String(255))
    participating_orgs: Mapped[str] = mapped_column(Text)
    document_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    document_type: Mapped[str] = mapped_column(String(100))
    clinical_trials: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)

    amount: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount_min: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    amount_max: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    eligibility: Mapped[str | None] = mapped_column(Text, nullable=True)

    granting_institution: Relationship["GrantingInstitution"] = relationship(
        "GrantingInstitution", back_populates="grants"
    )

    __table_args__ = (
        Index("idx_grants_institution_release", "granting_institution_id", "release_date"),
        Index("idx_grants_institution_expired", "granting_institution_id", "expired_date"),
        Index("idx_grants_release_expired", "release_date", "expired_date"),
        Index("idx_grants_activity_code", "activity_code"),
        Index("idx_grants_description_fts", text("to_tsvector('english', description)"), postgresql_using="gin"),
        CheckConstraint("amount_min IS NULL OR amount_min >= 0", name="check_amount_min_non_negative"),
        CheckConstraint("amount_max IS NULL OR amount_max >= 0", name="check_amount_max_non_negative"),
        CheckConstraint(
            "amount_min IS NULL OR amount_max IS NULL OR amount_min <= amount_max", name="check_amount_min_le_max"
        ),
    )


class GrantMatchingSubscription(BaseWithUUIDPK):
    __tablename__ = "grant_matching_subscriptions"

    email: Mapped[str] = mapped_column(String(255), index=True, unique=True)
    search_params: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    frequency: Mapped[str] = mapped_column(String(20), default="daily")
    last_notification_sent: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unsubscribed: Mapped[bool] = mapped_column(default=False)
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("frequency IN ('daily', 'weekly', 'monthly')", name="check_subscription_frequency"),
    )


class GrantingInstitutionSource(Base):
    __tablename__ = "granting_institution_sources"

    rag_source_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("rag_sources.id", ondelete="CASCADE"), primary_key=True
    )
    granting_institution_id: Mapped[UUID] = mapped_column(
        SA_UUID(), ForeignKey("granting_institutions.id", ondelete="CASCADE"), primary_key=True
    )

    granting_institution: Relationship["GrantingInstitution"] = relationship(
        "GrantingInstitution", back_populates="rag_sources"
    )
    rag_source: Relationship["RagSource"] = relationship("RagSource")


class GrantApplication(BaseWithUUIDPK):
    __tablename__ = "grant_applications"

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    form_inputs: Mapped[ResearchDeepDive | None] = mapped_column(JSON, nullable=True)
    research_objectives: Mapped[list[ResearchObjective] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ApplicationStatusEnum] = mapped_column(
        Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.WORKING_DRAFT, index=True
    )
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    project_id: Mapped[UUID] = mapped_column(SA_UUID(), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    rag_job_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    parent_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="SET NULL"), nullable=True, index=True
    )

    rag_sources: Relationship[list["GrantApplicationSource"]] = relationship(
        "GrantApplicationSource", back_populates="grant_application", cascade="all, delete-orphan"
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
    parent: Relationship["GrantApplication | None"] = relationship(
        "GrantApplication", remote_side="[GrantApplication.id]", back_populates="children"
    )
    children: Relationship[list["GrantApplication"]] = relationship(
        "GrantApplication", back_populates="parent", cascade="all, delete-orphan"
    )
    editor_documents: Relationship[list["EditorDocument"]] = relationship(
        "EditorDocument", back_populates="grant_application", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_grant_app_project_status", "project_id", "status"),
        Index("idx_grant_app_project_status_created", "project_id", "status", "created_at"),
    )


class GrantApplicationSource(Base):
    __tablename__ = "grant_application_sources"

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
    granting_institution_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("granting_institutions.id", ondelete="SET NULL"), nullable=True
    )
    rag_job_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("rag_generation_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )

    submission_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    grant_application: Relationship[GrantApplication] = relationship(
        "GrantApplication", back_populates="grant_template"
    )
    granting_institution: Relationship[GrantingInstitution | None] = relationship(
        "GrantingInstitution", back_populates="grant_templates"
    )
    rag_sources: Relationship[list["GrantTemplateSource"]] = relationship(
        "GrantTemplateSource", back_populates="grant_template", cascade="all, delete-orphan"
    )
    rag_job: Relationship["GrantTemplateGenerationJob | None"] = relationship(
        "GrantTemplateGenerationJob",
        back_populates="grant_template",
        uselist=False,
        foreign_keys="[GrantTemplate.rag_job_id]",
    )


class GrantTemplateSource(Base):
    __tablename__ = "grant_template_sources"

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


class GenerationNotification(BaseWithUUIDPK):
    __tablename__ = "generation_notifications"

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
    organization_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True
    )
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
    extra_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, server_default=text("'{}'::jsonb"))

    organization: Relationship["Organization | None"] = relationship("Organization", viewonly=True)
    project: Relationship["Project | None"] = relationship("Project", viewonly=True)

    __table_args__ = (
        Index("idx_notifications_user_active", "firebase_uid", postgresql_where=text("dismissed = FALSE")),
        Index("idx_notifications_user_created", "firebase_uid", "created_at"),
    )


class EditorDocument(BaseWithUUIDPK):
    __tablename__ = "editor_documents"

    grant_application_id: Mapped[UUID | None] = mapped_column(
        SA_UUID(), ForeignKey("grant_applications.id", ondelete="SET NULL"), nullable=True, index=True
    )

    document_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON, nullable=True, server_default=text("'{}'::jsonb")
    )
    crdt: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    grant_application: Relationship["GrantApplication | None"] = relationship(
        "GrantApplication", back_populates="editor_documents"
    )
