from enum import StrEnum


class UserRoleEnum(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class SourceIndexingStatusEnum(StrEnum):
    CREATED = "CREATED"
    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


class ApplicationStatusEnum(StrEnum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    GENERATING = "GENERATING"
    CANCELLED = "CANCELLED"


class RagGenerationStatusEnum(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class NotificationTypeEnum(StrEnum):
    DEADLINE = "deadline"
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
