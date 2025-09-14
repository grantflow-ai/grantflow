from enum import StrEnum
from typing import Final

MIN_WORDS_RATIO: Final[float] = 0.8
NUM_CHUNKS: Final[int] = 15
MAX_SOURCE_SIZE: Final[int] = 8000
MAX_CHUNK_SIZE: Final[int] = 800


GRANT_APPLICATION_PIPELINE_STAGES: Final[int] = 10
GRANT_TEMPLATE_PIPELINE_STAGES: Final[int] = 6


class NotificationEvents(StrEnum):
    APPLICATION_SAVED = "application_saved"
    ASSEMBLING_APPLICATION = "assembling_application"
    AUTO_CANCELLED = "auto_cancelled"
    CANCELLATION_ACKNOWLEDGED = "cancellation_acknowledged"
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
