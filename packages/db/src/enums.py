from enum import StrEnum


class UserRoleEnum(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"


class SourceIndexingStatusEnum(StrEnum):
    PENDING_UPLOAD = "PENDING_UPLOAD"
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
    ERROR = "ERROR"


class GrantType(StrEnum):
    RESEARCH = "RESEARCH"
    TRANSLATIONAL = "TRANSLATIONAL"


class GrantTemplateStageEnum(StrEnum):
    CFP_ANALYSIS = "CFP_ANALYSIS"
    TEMPLATE_GENERATION = "TEMPLATE_GENERATION"


class GrantApplicationStageEnum(StrEnum):
    BLUEPRINT_PREP = "BLUEPRINT_PREP"
    WORKPLAN_GENERATION = "WORKPLAN_GENERATION"
    SECTION_SYNTHESIS = "SECTION_SYNTHESIS"
