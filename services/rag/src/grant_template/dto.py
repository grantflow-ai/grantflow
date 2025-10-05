from typing import TypedDict

from packages.db.src.json_objects import CFPAnalysis, OrganizationNamespace
from packages.shared_utils.src.dto import ExtractedSectionDTO


class CFPAnalysisStageDTO(TypedDict):

    organization: OrganizationNamespace | None
    cfp_analysis: CFPAnalysis
    organization_guidelines: str


class SectionExtractionStageDTO(TypedDict):

    organization: OrganizationNamespace | None
    cfp_analysis: CFPAnalysis
    organization_guidelines: str
    extracted_sections: list[ExtractedSectionDTO]


StageDTO = CFPAnalysisStageDTO | SectionExtractionStageDTO
