from typing import TypedDict

from packages.db.src.json_objects import CFPAnalysisResult

from services.rag.src.grant_template.dto import ExtractedCFPData, OrganizationNamespace
from services.rag.src.grant_template.extract_sections import ExtractedSectionDTO


class ExtractCFPContentStageDTO(TypedDict):
    organization: OrganizationNamespace | None
    extracted_data: ExtractedCFPData


class AnalyzeCFPContentStageDTO(ExtractCFPContentStageDTO):
    analysis_results: CFPAnalysisResult


class ExtractionSectionsStageDTO(AnalyzeCFPContentStageDTO):
    extracted_sections: list[ExtractedSectionDTO]


StageDTO = ExtractCFPContentStageDTO | AnalyzeCFPContentStageDTO | ExtractionSectionsStageDTO
