from typing import Final

EVENT_APPLICATION_SETUP: Final[str] = "application_setup"
EVENT_TEMPLATE_REVIEW: Final[str] = "template_review"
EVENT_KNOWLEDGE_BASE: Final[str] = "knowledge_base"
EVENT_RESEARCH_PLAN: Final[str] = "research_plan"
EVENT_RESEARCH_DEEP_DIVE: Final[str] = "research_deep_dive"
EVENT_GENERATE_APPLICATION: Final[str] = "generate_application"
EVENT_CANCEL_APPLICATION: Final[str] = "cancel_application"

EVENT_APPLICATION_CREATED: Final[str] = "application_creation_success"
EVENT_APPLICATION_SETUP_SUCCESS: Final[str] = "application_setup_success"
EVENT_APPLICATION_STATUS_UPDATE: Final[str] = "application_status_update"
EVENT_TEMPLATE_GENERATION_SUCCESS: Final[str] = "template_generation_success"
EVENT_TEMPLATE_UPDATE_SUCCESS: Final[str] = "template_update_success"
EVENT_KNOWLEDGE_BASE_SUCCESS: Final[str] = "knowledge_base_success"
EVENT_RESEARCH_PLAN_SUCCESS: Final[str] = "research_plan_success"
EVENT_RESEARCH_DEEP_DIVE_SUCCESS: Final[str] = "research_deep_dive_success"
EVENT_GENERATION_STARTED: Final[str] = "generation_started"
EVENT_GENERATION_COMPLETE: Final[str] = "generation_complete"
EVENT_APPLICATION_CANCELLED: Final[str] = "application_cancelled"

WIZARD_STEPS_COMPLETED_VALKEY_KEY: Final[str] = "wizard_completed_steps"
