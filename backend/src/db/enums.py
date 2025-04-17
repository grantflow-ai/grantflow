from enum import StrEnum


class UserRoleEnum(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class FileIndexingStatusEnum(StrEnum):
    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"
