from typing import NotRequired, TypedDict
from uuid import UUID

from packages.db.src.json_objects import CFPAnalysisResult


class ExtractedSectionDTO(TypedDict):
    title: str
    id: str
    order: int
    parent_id: NotRequired[str]
    is_detailed_research_plan: NotRequired[bool | None]
    is_title_only: NotRequired[bool | None]
    is_clinical_trial: NotRequired[bool | None]
    is_long_form: bool


class CFPContentSection(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    cfp_subject: str
    submission_date: str | None
    content: list[CFPContentSection]
    error: NotRequired[str | None]


class OrganizationNamespace(TypedDict):
    full_name: str
    abbreviation: str
    organization_id: UUID


class ExtractCFPContentStageDTO(TypedDict):
    organization: OrganizationNamespace | None
    extracted_data: ExtractedCFPData


class AnalyzeCFPContentStageDTO(ExtractCFPContentStageDTO):
    analysis_results: CFPAnalysisResult


class ExtractionSectionsStageDTO(AnalyzeCFPContentStageDTO):
    extracted_sections: list[ExtractedSectionDTO]


StageDTO = ExtractCFPContentStageDTO | AnalyzeCFPContentStageDTO | ExtractionSectionsStageDTO
