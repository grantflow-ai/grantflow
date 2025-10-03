from typing import Final

from packages.db.src.enums import GrantTemplateStageEnum

GRANT_TEMPLATE_PIPELINE_STAGES: Final[tuple[GrantTemplateStageEnum, ...]] = (
    GrantTemplateStageEnum.CFP_ANALYSIS,
    GrantTemplateStageEnum.EXTRACT_SECTIONS,
    GrantTemplateStageEnum.GENERATE_METADATA,
)

TOTAL_PIPELINE_STAGES: Final[int] = len(GRANT_TEMPLATE_PIPELINE_STAGES)
