from enum import StrEnum


class UserRoleEnum(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"


class SourceIndexingStatusEnum(StrEnum):
    CREATED = "CREATED"
    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


class ApplicationStatusEnum(StrEnum):
    WORKING_DRAFT = "WORKING_DRAFT"
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
    DEADLINE = "DEADLINE"
    INFO = "INFO"
    WARNING = "WARNING"
    SUCCESS = "SUCCESS"
