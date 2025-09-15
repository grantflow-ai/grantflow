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
    APPLICATION_SAVED = "application_saved"
    ASSEMBLING_APPLICATION = "assembling_application"
    AUTO_CANCELLED = "auto_cancelled"
    CANCELLATION_ACKNOWLEDGED = "cancellation_acknowledged"
    CFP_ANALYSIS_COMPLETED = "cfp_analysis_completed"
    CFP_ANALYSIS_STARTED = "cfp_analysis_started"
    CFP_DATA_EXTRACTED = "cfp_data_extracted"
    ENHANCING_WITH_WIKIDATA = "enhancing_with_wikidata"
    ENRICHING_OBJECTIVES = "enriching_objectives"
    EXTRACTING_CFP_DATA = "extracting_cfp_data"
    EXTRACTING_RELATIONSHIPS = "extracting_relationships"
    GENERATING_OBJECTIVE = "generating_objective"
    GENERATING_RESEARCH_PLAN = "generating_research_plan"
    GENERATING_SECTION_TEXTS = "generating_section_texts"
    GENERATING_TASKS = "generating_tasks"
    GENERATION_ERROR = "generation_error"
    GRANT_APPLICATION_GENERATION_COMPLETED = "grant_application_generation_completed"
    GRANT_APPLICATION_GENERATION_STARTED = "grant_application_generation_started"
    GRANT_TEMPLATE_CREATED = "grant_template_created"
    GRANT_TEMPLATE_EXTRACTION = "grant_template_extraction"
    GRANT_TEMPLATE_GENERATION_COMPLETED = "grant_template_generation_completed"
    GRANT_TEMPLATE_GENERATION_STARTED = "grant_template_generation_started"
    GRANT_TEMPLATE_METADATA = "grant_template_metadata"
    GRANT_TEMPLATE_SAVED = "grant_template_saved"
    INDEXING_FAILED = "indexing_failed"
    INDEXING_IN_PROGRESS = "indexing_in_progress"
    INDEXING_TIMEOUT = "indexing_timeout"
    INSUFFICIENT_CONTEXT_ERROR = "insufficient_context_error"
    INTERNAL_ERROR = "internal_error"
    JOB_CANCELLED = "job_cancelled"
    LOW_RETRIEVAL_QUALITY = "low_retrieval_quality"
    METADATA_GENERATED = "metadata_generated"
    MISSING_PREREQUISITES = "missing_prerequisites"
    OBJECTIVE_COMPLETED = "objective_completed"
    OBJECTIVES_ENRICHED = "objectives_enriched"
    PIPELINE_ERROR = "pipeline_error"
    RESEARCH_PLAN_COMPLETED = "research_plan_completed"
    SAVING_APPLICATION = "saving_application"
    SAVING_GRANT_TEMPLATE = "saving_grant_template"
    SECTION_TEXTS_GENERATED = "section_texts_generated"
    SECTIONS_EXTRACTED = "sections_extracted"
    TEMPLATE_INCOMPLETE = "template_incomplete"
    TEMPLATE_VALIDATED = "template_validated"
    VALIDATING_TEMPLATE = "validating_template"
    WIKIDATA_ENHANCEMENT_COMPLETE = "wikidata_enhancement_complete"
