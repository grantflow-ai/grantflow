from typing import TypedDict

from packages.db.src.json_objects import CFPAnalysis, OrganizationNamespace
from packages.shared_utils.src.dto import ExtractedSectionDTO


class CFPAnalysisStageDTO(TypedDict):
    """CFP analysis stage - unified CFP analysis with organization identification."""
    organization: OrganizationNamespace | None
    cfp_analysis: CFPAnalysis


class SectionExtractionStageDTO(TypedDict):
    """Section extraction stage - extracts hierarchical section structure."""
    organization: OrganizationNamespace | None
    cfp_analysis: CFPAnalysis
    extracted_sections: list[ExtractedSectionDTO]


StageDTO = CFPAnalysisStageDTO | SectionExtractionStageDTO
