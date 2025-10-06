from typing import TypedDict

from packages.db.src.json_objects import CFPAnalysis, GrantElement, GrantLongFormSection


class CFPAnalysisStageDTO(TypedDict):
    cfp_analysis: CFPAnalysis


class TemplateGenerationStageDTO(TypedDict):
    cfp_analysis: CFPAnalysis
    grant_sections: list[GrantElement | GrantLongFormSection]


StageDTO = CFPAnalysisStageDTO | TemplateGenerationStageDTO
