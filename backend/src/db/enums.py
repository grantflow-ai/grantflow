from enum import StrEnum


class UserRoleEnum(StrEnum):
    """Enumeration of user roles."""

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class FileIndexingStatusEnum(StrEnum):
    """Enumeration of standard grant document sections."""

    INDEXING = "INDEXING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"
