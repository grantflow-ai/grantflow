from enum import StrEnum
from typing import Final

CONTENT_TYPE_JSON: Final[str] = "application/json"
CONTENT_TYPE_TEXT: Final[str] = "text/plain"
ONE_MINUTE_SECONDS: Final[int] = 60

SUPPORTED_FILE_EXTENSIONS = {
    "csv": "text/csv",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "latex": "text/latex",
    "md": "text/markdown",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rst": "text/rst",
    "rtf": "text/rtf",
    "txt": "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class NotificationEvents(StrEnum):
    # Job lifecycle events
    CANCELLATION_ACKNOWLEDGED = "cancellation_acknowledged"
    JOB_CANCELLED = "job_cancelled"
    AUTO_CANCELLED = "auto_cancelled"
    PIPELINE_ERROR = "pipeline_error"

    # Indexing events
    INDEXING_IN_PROGRESS = "indexing_in_progress"
    INDEXING_FAILED = "indexing_failed"
    INDEXING_TIMEOUT = "indexing_timeout"

    # Grant template pipeline events
    EXTRACTING_CFP_DATA = "extracting_cfp_data"
    CFP_DATA_EXTRACTED = "cfp_data_extracted"
    GRANT_TEMPLATE_EXTRACTION = "grant_template_extraction"
    SECTIONS_EXTRACTED = "sections_extracted"
    GRANT_TEMPLATE_METADATA = "grant_template_metadata"
    METADATA_GENERATED = "metadata_generated"
    SAVING_GRANT_TEMPLATE = "saving_grant_template"
    GRANT_TEMPLATE_CREATED = "grant_template_created"

    # Grant application pipeline events
    GRANT_APPLICATION_GENERATION_STARTED = "grant_application_generation_started"
    GENERATING_SECTION_TEXTS = "generating_section_texts"
    SECTION_TEXTS_GENERATED = "section_texts_generated"
    EXTRACTING_RELATIONSHIPS = "extracting_relationships"
    RELATIONSHIPS_EXTRACTED = "relationships_extracted"
    ENRICHING_OBJECTIVES = "enriching_objectives"
    OBJECTIVES_ENRICHED = "objectives_enriched"
    ENHANCING_WITH_WIKIDATA = "enhancing_with_wikidata"
    WIKIDATA_ENHANCEMENT_COMPLETE = "wikidata_enhancement_complete"
    GENERATING_RESEARCH_PLAN = "generating_research_plan"
    GENERATING_OBJECTIVE = "generating_objective"
    OBJECTIVE_COMPLETED = "objective_completed"
    RESEARCH_PLAN_COMPLETED = "research_plan_completed"
    SAVING_GRANT_APPLICATION = "saving_grant_application"
    GRANT_APPLICATION_GENERATION_COMPLETED = "grant_application_generation_completed"

    # Error events
    INSUFFICIENT_CONTEXT_ERROR = "insufficient_context_error"
    INTERNAL_ERROR = "internal_error"
