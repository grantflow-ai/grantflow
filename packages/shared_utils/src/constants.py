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
    AUTOFILL_COMPLETED = "autofill_completed"
    CFP_DATA_EXTRACTED = "cfp_data_extracted"
    GRANT_APPLICATION_GENERATION_COMPLETED = "grant_application_generation_completed"
    GRANT_TEMPLATE_CREATED = "grant_template_created"
    INDEXING_FAILED = "indexing_failed"
    INDEXING_TIMEOUT = "indexing_timeout"
    INSUFFICIENT_CONTEXT_ERROR = "insufficient_context_error"
    LLM_TIMEOUT = "llm_timeout"
    INTERNAL_ERROR = "internal_error"
    JOB_CANCELLED = "job_cancelled"
    METADATA_GENERATED = "metadata_generated"
    OBJECTIVES_ENRICHED = "objectives_enriched"
    PIPELINE_ERROR = "pipeline_error"
    RELATIONSHIPS_EXTRACTED = "relationships_extracted"
    RESEARCH_PLAN_COMPLETED = "research_plan_completed"
    SECTION_TEXTS_GENERATED = "section_texts_generated"
    WIKIDATA_ENHANCEMENT_COMPLETE = "wikidata_enhancement_complete"
