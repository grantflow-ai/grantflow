from services.rag.src.grant_application.dto import (
    EnrichObjectivesStageDTO,
    EnrichTerminologyStageDTO,
    ExtractRelationshipsStageDTO,
    GenerateResearchPlanStageDTO,
    GenerateSectionsStageDTO,
)

StageDTO = (
    GenerateSectionsStageDTO
    | ExtractRelationshipsStageDTO
    | EnrichObjectivesStageDTO
    | EnrichTerminologyStageDTO
    | GenerateResearchPlanStageDTO
)
