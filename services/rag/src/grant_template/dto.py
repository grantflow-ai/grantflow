from typing import TypedDict

from packages.db.src.json_objects import CFPAnalysisResult
from packages.shared_utils.src.dto import (
    ExtractedCFPData,
    OrganizationNamespace,
    ProcessedSectionDTO,
)


class ExtractCFPContentStageDTO(TypedDict):
    organization: OrganizationNamespace | None
    extracted_data: ExtractedCFPData


class AnalyzeCFPContentStageDTO(ExtractCFPContentStageDTO):
    analysis_results: CFPAnalysisResult


class ExtractionSectionsStageDTO(AnalyzeCFPContentStageDTO):
    extracted_sections: list[ProcessedSectionDTO]


StageDTO = ExtractCFPContentStageDTO | AnalyzeCFPContentStageDTO | ExtractionSectionsStageDTO
