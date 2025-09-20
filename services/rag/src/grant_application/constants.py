from typing import Final

from services.rag.src.enums import GrantApplicationStageEnum

GRANT_APPLICATION_STAGES_ORDER: Final[tuple[GrantApplicationStageEnum, ...]] = (
    GrantApplicationStageEnum.GENERATE_SECTIONS,
    GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS,
    GrantApplicationStageEnum.ENRICH_RESEARCH_OBJECTIVES,
    GrantApplicationStageEnum.ENRICH_TERMINOLOGY,
    GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN,
)
