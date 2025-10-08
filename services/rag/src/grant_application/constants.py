from typing import Final

from packages.db.src.enums import GrantApplicationStageEnum

GRANT_APPLICATION_STAGES_ORDER: Final[tuple[GrantApplicationStageEnum, ...]] = (
    GrantApplicationStageEnum.BLUEPRINT_PREP,
    GrantApplicationStageEnum.WORKPLAN_GENERATION,
    GrantApplicationStageEnum.SECTION_SYNTHESIS,
)
