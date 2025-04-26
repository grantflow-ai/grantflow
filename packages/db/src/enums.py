from enum import StrEnum


class UserRoleEnum(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class FileIndexingStatusEnum(StrEnum):
    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"


class ApplicationStatusEnum(StrEnum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
