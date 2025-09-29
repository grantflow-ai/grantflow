from typing import TYPE_CHECKING, Final, cast

from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather
from packages.shared_utils.src.text import normalize_markdown

from services.rag.src.dto import ResearchComponentGenerationDTO
from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.src.grant_application.dto import (
    EnrichmentDataDTO,
    EnrichObjectivesStageDTO,
    EnrichTerminologyStageDTO,
    ExtractRelationshipsStageDTO,
    GenerateResearchPlanStageDTO,
    GenerateSectionsStageDTO,
    SectionText,
    StageDTO,
)
from services.rag.src.grant_application.enrich_terminology_stage import enrich_objective_with_wikidata
from services.rag.src.grant_application.extract_relationships import handle_extract_relationships
from services.rag.src.grant_application.generate_section_text import handle_generate_section_text
from services.rag.src.grant_application.generate_work_plan_text import generate_workplan_section
from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.retrieval import retrieve_documents

if TYPE_CHECKING:
    from packages.db.src.json_objects import CFPAnalysisResult, GrantLongFormSection
    from packages.db.src.tables import GrantApplication

logger = get_logger(__name__)

SECTION_GENERATION_BATCH_SIZE: Final[int] = 4
WIKIDATA_ENRICHMENT_BATCH_SIZE: Final[int] = 4


async def handle_generate_sections_stage(
    *,
    grant_application: "GrantApplication",
    dto: GenerateResearchPlanStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> GenerateSectionsStageDTO:
    await job_manager.ensure_not_cancelled()

    # important: in this stage we generate the long form text for all sections EXCEPT the research plan (workplan) section ~keep
    long_form_sections: list[GrantLongFormSection] = []
    work_plan_section: GrantLongFormSection = dto["work_plan_section"]
    research_plan_text = dto["research_plan_text"]
    enrichment_responses = dto.get("enrichment_responses", [])
    relationships = dto.get("relationships", {})

    if not grant_application.grant_template:
        raise ValidationError("Grant template not found")

    for section in grant_application.grant_template.grant_sections:
        if "max_words" in section and "generation_instructions" in section:
            long_form_section = cast("GrantLongFormSection", section)
            if not long_form_section.get("is_detailed_research_plan"):
                long_form_sections.append(long_form_section)

    all_search_queries = []
    all_keywords = []

    for section in long_form_sections:
        all_search_queries.extend(section["search_queries"])
        all_keywords.extend(section["keywords"])

    all_search_queries.extend(
        research_objective["title"]
        for research_objective in (grant_application.research_objectives or [])
        if "title" in research_objective
    )

    unique_queries = list(dict.fromkeys(all_search_queries))[:12]

    combined_task_description = (
        f"Generate content for {len(long_form_sections)} grant application sections: "
        + ", ".join([s["title"] for s in long_form_sections])
    )

    retrieval_results = await retrieve_documents(
        application_id=str(grant_application.id),
        search_queries=unique_queries,
        task_description=combined_task_description,
        max_tokens=12000,
        trace_id=trace_id,
    )
    shared_context = "\n".join(retrieval_results)

    generation_coroutines = [
        handle_generate_section_text(
            section=section,
            research_deep_dives=grant_application.research_objectives or [],
            shared_context=shared_context,
            cfp_analysis=cast("CFPAnalysisResult", grant_application.grant_template.cfp_analysis),
            research_plan_text=research_plan_text,
            enrichment_responses=enrichment_responses,
            relationships=relationships,
            trace_id=trace_id,
            job_manager=job_manager,
        )
        for section in long_form_sections
    ]

    section_results = await batched_gather(
        *generation_coroutines, batch_size=SECTION_GENERATION_BATCH_SIZE, return_exceptions=True
    )

    section_texts: dict[str, str] = {}
    failed_sections = []

    for section, result in zip(long_form_sections, section_results, strict=False):
        section_id = section["id"]

        if isinstance(result, Exception):
            error_type = type(result).__name__
            logger.error(
                "Section generation failed",
                section_id=section_id,
                section_title=section["title"],
                error_type=error_type,
                error=str(result),
                trace_id=trace_id,
            )
            section_texts[section_id] = (
                f"[Failed to generate {section['title']} section: {error_type}. Manual completion required.]"
            )
            failed_sections.append({"id": section_id, "title": section["title"], "error": error_type})
        else:
            section_texts[section_id] = cast("str", result)

    if failed_sections:
        logger.warning(
            "Some sections failed generation",
            total_sections=len(long_form_sections),
            successful_sections=len(long_form_sections) - len(failed_sections),
            failed_sections=failed_sections,
            trace_id=trace_id,
        )

    section_text_list = [SectionText(section_id=section_id, text=text) for section_id, text in section_texts.items()]

    logger.debug(
        "Section generation completed",
        total_sections=len(long_form_sections),
        successful_sections=len(long_form_sections) - len(failed_sections),
        failed_sections=len(failed_sections),
        trace_id=trace_id,
    )

    await job_manager.add_notification(
        event=NotificationEvents.SECTION_TEXTS_GENERATED,
        message=f"Generated {len(section_text_list)} sections",
        notification_type="success",
        data={
            "sections_generated": len(section_text_list),
        },
    )

    return GenerateSectionsStageDTO(
        work_plan_section=work_plan_section,
        relationships=relationships,
        enrichment_responses=enrichment_responses,
        wikidata_enrichments=dto.get("wikidata_enrichments", []),
        research_plan_text=research_plan_text,
        section_texts=section_text_list,
    )


async def handle_extract_relationships_stage(
    *,
    grant_application: "GrantApplication",
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> ExtractRelationshipsStageDTO:
    await job_manager.ensure_not_cancelled()

    work_plan_section: GrantLongFormSection | None = None
    if not grant_application.grant_template:
        raise ValidationError("Grant template not found")

    for section in grant_application.grant_template.grant_sections:
        if "max_words" in section and "generation_instructions" in section:
            long_form_section = cast("GrantLongFormSection", section)
            if long_form_section.get("is_detailed_research_plan"):
                work_plan_section = long_form_section
                break

    if not work_plan_section:
        raise ValidationError("Work plan section not found in grant template")

    relationships = await handle_extract_relationships(
        application_id=str(grant_application.id),
        research_objectives=grant_application.research_objectives or [],
        grant_section=work_plan_section,
        form_inputs=grant_application.form_inputs or {},
        trace_id=trace_id,
        job_manager=job_manager,
    )

    await job_manager.add_notification(
        event=NotificationEvents.RELATIONSHIPS_EXTRACTED,
        message="Research dependencies analyzed",
        notification_type="success",
        data={
            "relationships_count": len(relationships),
        },
    )

    return ExtractRelationshipsStageDTO(
        work_plan_section=work_plan_section,
        relationships=relationships,
    )


async def handle_enrich_objectives_stage(
    *,
    grant_application: "GrantApplication",
    dto: ExtractRelationshipsStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> EnrichObjectivesStageDTO:
    await job_manager.ensure_not_cancelled()

    enrichment_responses = await handle_batch_enrich_objectives(
        research_objectives=grant_application.research_objectives or [],
        grant_section=dto["work_plan_section"],
        application_id=str(grant_application.id),
        form_inputs=grant_application.form_inputs or {},
        trace_id=trace_id,
        job_manager=job_manager,
    )

    await job_manager.add_notification(
        event=NotificationEvents.OBJECTIVES_ENRICHED,
        message="Research objectives enhanced",
        notification_type="success",
        data={
            "objectives": len(grant_application.research_objectives or []),
            "tasks": sum(len(obj["research_tasks"]) for obj in (grant_application.research_objectives or [])),
        },
    )

    return EnrichObjectivesStageDTO(
        work_plan_section=dto["work_plan_section"],
        relationships=dto["relationships"],
        enrichment_responses=enrichment_responses,
    )


async def handle_enrich_terminology_stage(
    *,
    dto: EnrichObjectivesStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> EnrichTerminologyStageDTO:
    await job_manager.ensure_not_cancelled()

    wikidata_enrichment_coroutines = [
        enrich_objective_with_wikidata(enrichment_response, trace_id=trace_id)
        for enrichment_response in dto["enrichment_responses"]
    ]

    wikidata_enrichments = await batched_gather(
        *wikidata_enrichment_coroutines, batch_size=WIKIDATA_ENRICHMENT_BATCH_SIZE, return_exceptions=True
    )

    processed_enrichments: list[EnrichmentDataDTO] = []
    successful_count = 0
    failed_count = 0

    for i, result in enumerate(wikidata_enrichments):
        if isinstance(result, Exception):
            logger.warning(
                "Wikidata enrichment failed",
                enrichment_index=i,
                error=str(result),
                trace_id=trace_id,
            )
            processed_enrichments.append(cast("EnrichmentDataDTO", {}))
            failed_count += 1
        else:
            processed_enrichments.append(cast("EnrichmentDataDTO", result))
            successful_count += 1

    logger.debug(
        "Wikidata enrichment completed",
        total_enrichments=len(wikidata_enrichments),
        successful_enrichments=successful_count,
        failed_enrichments=failed_count,
        trace_id=trace_id,
    )

    await job_manager.add_notification(
        event=NotificationEvents.WIKIDATA_ENHANCEMENT_COMPLETE,
        message="Scientific context added",
        notification_type="success",
        data={
            "terms_added": len(wikidata_enrichments),
        },
    )

    return EnrichTerminologyStageDTO(
        work_plan_section=dto["work_plan_section"],
        relationships=dto["relationships"],
        enrichment_responses=dto["enrichment_responses"],
        wikidata_enrichments=processed_enrichments,
    )


async def handle_generate_research_plan_stage(
    *,
    grant_application: "GrantApplication",
    dto: EnrichTerminologyStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> GenerateResearchPlanStageDTO:
    await job_manager.ensure_not_cancelled()

    dtos = []
    research_objectives = grant_application.research_objectives or []
    total_tasks = sum(len(research_objective["research_tasks"]) for research_objective in research_objectives)
    total_components = len(research_objectives) + total_tasks
    words_per_component = (
        abs(round(dto["work_plan_section"]["max_words"] / total_components)) if total_components > 0 else 500
    )
    for research_objective, enrichment_response in zip(research_objectives, dto["enrichment_responses"], strict=True):
        objective_enrichment = enrichment_response["research_objective"]
        tasks_enrichment = enrichment_response["research_tasks"]
        research_tasks = research_objective["research_tasks"]
        dtos.append(
            ResearchComponentGenerationDTO(
                number=str(research_objective["number"]),
                title=research_objective["title"],
                description=objective_enrichment["description"],
                instructions=objective_enrichment["instructions"],
                guiding_questions=objective_enrichment["guiding_questions"],
                search_queries=objective_enrichment["search_queries"],
                relationships=dto["relationships"].get(str(research_objective["number"]), []),
                max_words=words_per_component,
                type="objective",
            )
        )
        dtos.extend(
            [
                ResearchComponentGenerationDTO(
                    number=f"{research_objective['number']}.{research_task['number']}",
                    title=research_task["title"],
                    description=task_enrichment["description"],
                    instructions=task_enrichment["instructions"],
                    guiding_questions=task_enrichment["guiding_questions"],
                    search_queries=task_enrichment["search_queries"],
                    relationships=dto["relationships"].get(
                        f"{research_objective['number']}.{research_task['number']}", []
                    ),
                    max_words=words_per_component,
                    type="task",
                )
                for research_task, task_enrichment in zip(research_tasks, tasks_enrichment, strict=True)
            ]
        )

    total_tasks = sum(len(research_objective["research_tasks"]) for research_objective in research_objectives)

    work_plan_text = await generate_workplan_section(
        application_id=str(grant_application.id),
        form_inputs=grant_application.form_inputs or {},
        components=dtos,
        trace_id=trace_id,
        job_manager=job_manager,
    )

    await job_manager.add_notification(
        event=NotificationEvents.RESEARCH_PLAN_COMPLETED,
        message="Research plan complete",
        notification_type="success",
        data={
            "objectives": len(research_objectives),
            "tasks": total_tasks,
            "words": len(work_plan_text.split()),
        },
    )

    research_plan_text = normalize_markdown(work_plan_text)

    return GenerateResearchPlanStageDTO(
        work_plan_section=dto["work_plan_section"],
        relationships=dto["relationships"],
        enrichment_responses=dto["enrichment_responses"],
        wikidata_enrichments=dto["wikidata_enrichments"],
        research_plan_text=research_plan_text,
    )
