from enum import StrEnum
from typing import Final

MIN_WORDS_RATIO: Final[float] = 0.8
NUM_CHUNKS: Final[int] = 15
MAX_SOURCE_SIZE: Final[int] = 8000
MAX_CHUNK_SIZE: Final[int] = 800


GRANT_APPLICATION_PIPELINE_STAGES: Final[int] = 9
GRANT_TEMPLATE_PIPELINE_STAGES: Final[int] = 6


class NotificationEvents(StrEnum):
    INDEXING_IN_PROGRESS = "indexing_in_progress"
    INDEXING_FAILED = "indexing_failed"
    INDEXING_TIMEOUT = "indexing_timeout"

    GRANT_APPLICATION_GENERATION_STARTED = "grant_application_generation_started"
    GRANT_APPLICATION_GENERATION_COMPLETED = "grant_application_generation_completed"
    MISSING_PREREQUISITES = "missing_prerequisites"
    VALIDATING_TEMPLATE = "validating_template"
    TEMPLATE_INCOMPLETE = "template_incomplete"
    TEMPLATE_VALIDATED = "template_validated"
    EXTRACTING_RELATIONSHIPS = "extracting_relationships"
    ENRICHING_OBJECTIVES = "enriching_objectives"
    OBJECTIVES_ENRICHED = "objectives_enriched"
    GENERATING_WORKPLAN = "generating_workplan"
    GENERATING_OBJECTIVE = "generating_objective"
    GENERATING_TASKS = "generating_tasks"
    OBJECTIVE_COMPLETED = "objective_completed"
    WORKPLAN_COMPLETED = "workplan_completed"
    GENERATING_SECTION_TEXTS = "generating_section_texts"
    SECTION_TEXTS_GENERATED = "section_texts_generated"
    ASSEMBLING_APPLICATION = "assembling_application"
    SAVING_APPLICATION = "saving_application"
    APPLICATION_SAVED = "application_saved"

    GRANT_TEMPLATE_GENERATION_STARTED = "grant_template_generation_started"
    GRANT_TEMPLATE_GENERATION_COMPLETED = "grant_template_generation_completed"
    EXTRACTING_CFP_DATA = "extracting_cfp_data"
    CFP_DATA_EXTRACTED = "cfp_data_extracted"
    GRANT_TEMPLATE_EXTRACTION = "grant_template_extraction"
    SECTIONS_EXTRACTED = "sections_extracted"
    GRANT_TEMPLATE_METADATA = "grant_template_metadata"
    METADATA_GENERATED = "metadata_generated"
    SAVING_GRANT_TEMPLATE = "saving_grant_template"
    GRANT_TEMPLATE_CREATED = "grant_template_created"

    INSUFFICIENT_CONTEXT_ERROR = "insufficient_context_error"
    LOW_RETRIEVAL_QUALITY = "low_retrieval_quality"
    GENERATION_ERROR = "generation_error"
    PIPELINE_ERROR = "pipeline_error"
    INTERNAL_ERROR = "internal_error"
