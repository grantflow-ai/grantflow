import asyncio
from asyncio import gather
from typing import TYPE_CHECKING, cast

from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather

from services.rag.src.enums import GrantApplicationStageEnum
from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.src.grant_application.dto import (
    EnrichObjectivesStageDTO,
    EnrichTerminologyStageDTO,
    ExtractRelationshipsStageDTO,
    GenerateResearchPlanStageDTO,
    GenerateSectionsStageDTO,
    SectionText,
)
from services.rag.src.grant_application.enrich_terminology_stage import enrich_objective_with_wikidata
from services.rag.src.grant_application.extract_relationships import handle_extract_relationships
from services.rag.src.grant_application.generate_section_text import handle_generate_section_text
from services.rag.src.grant_application.generate_work_plan_text import generate_objective_with_tasks
from services.rag.src.grant_application.pipeline_dto import StageDTO
from services.rag.src.utils.job_manager import GrantApplicationJobManager
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.text import normalize_markdown

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection
    from packages.db.src.tables import GrantApplication

    from services.rag.src.dto import ResearchComponentGenerationDTO

logger = get_logger(__name__)


async def handle_generate_sections_stage(
    *,
    grant_application: "GrantApplication",
    job_manager: GrantApplicationJobManager[GrantApplicationStageEnum, StageDTO],
    trace_id: str,
) -> GenerateSectionsStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.GENERATING_SECTION_TEXTS,
        message="Generating application sections",
        notification_type="info",
    )

    # Fetch the grant template with its sections
    if not grant_application.grant_template:
        raise ValidationError("Grant template is required")

    grant_template = grant_application.grant_template
    if not grant_template.grant_sections:
        raise ValidationError("Grant template has no sections")

    grant_sections = grant_template.grant_sections
    research_objectives = grant_application.research_objectives or []

    # Get CFP analysis from grant template
    cfp_analysis = grant_template.cfp_analysis
    if not cfp_analysis:
        raise ValidationError("CFP analysis is required for section generation")

    # important: in this stage we generate the long form text for all sections EXCEPT the research plan (workplan) section ~keep
    long_form_sections: list[GrantLongFormSection] = []
    work_plan_section: GrantLongFormSection | None = None

    for section in grant_sections:
        # Check if this is a GrantLongFormSection (has required fields)
        if "max_words" in section and "generation_instructions" in section:
            long_form_section = cast("GrantLongFormSection", section)
            if long_form_section["is_detailed_research_plan"]:
                work_plan_section = long_form_section
            else:
                long_form_sections.append(long_form_section)

    if not work_plan_section:
        raise ValidationError("No research plan section found in grant template")

    logger.info(
        "Starting section generation",
        application_id=str(grant_application.id),
        sections_count=len(long_form_sections),
        deep_dives_count=len(research_objectives),
        trace_id=trace_id,
    )

    all_search_queries = []
    all_keywords = []

    for section in long_form_sections:
        all_search_queries.extend(section["search_queries"])
        all_keywords.extend(section["keywords"])

    all_search_queries.extend(
        research_objective["title"] for research_objective in research_objectives if "title" in research_objective
    )

    unique_queries = list(dict.fromkeys(all_search_queries))[:12]

    logger.info(
        "Performing shared retrieval for all sections",
        unique_queries_count=len(unique_queries),
        total_original_queries=len(all_search_queries),
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

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

    logger.info(
        "Shared retrieval completed",
        context_length=len(shared_context),
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    generation_coroutines = [
        handle_generate_section_text(section, research_objectives, shared_context, cfp_analysis, trace_id)
        for section in long_form_sections
    ]

    try:
        section_results = await asyncio.wait_for(
            batched_gather(*generation_coroutines, batch_size=3),
            timeout=600  # 10 minutes timeout for section generation
        )
    except asyncio.TimeoutError:
        raise ValidationError("Section generation timed out after 10 minutes. Please try again or contact support.") from None

    section_texts: dict[str, str] = {}
    for section, result in zip(long_form_sections, section_results, strict=False):
        section_id = section["id"]
        section_texts[section_id] = result

    # Convert dict to list of SectionText
    section_text_list = [SectionText(section_id=section_id, text=text) for section_id, text in section_texts.items()]

    await job_manager.add_notification(
        event=NotificationEvents.SECTION_TEXTS_GENERATED,
        message=f"Generated {len(section_text_list)} sections",
        notification_type="success",
        data={
            "sections_generated": len(section_text_list),
        },
    )

    return GenerateSectionsStageDTO(
        section_texts=section_text_list,
        work_plan_section=work_plan_section,
    )


async def handle_extract_relationships_stage(
    *,
    grant_application: "GrantApplication",
    dto: GenerateSectionsStageDTO,
    job_manager: GrantApplicationJobManager[GrantApplicationStageEnum, StageDTO],
    trace_id: str,
) -> ExtractRelationshipsStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.EXTRACTING_RELATIONSHIPS,
        message="Analyzing research dependencies",
        notification_type="info",
    )

    relationships = await handle_extract_relationships(
        application_id=str(grant_application.id),
        research_objectives=grant_application.research_objectives or [],
        grant_section=dto["work_plan_section"],
        form_inputs=grant_application.form_inputs or {},
        trace_id=trace_id,
    )

    return ExtractRelationshipsStageDTO(
        section_texts=dto["section_texts"],
        work_plan_section=dto["work_plan_section"],
        relationships=relationships,
    )


async def handle_enrich_objectives_stage(
    *,
    grant_application: "GrantApplication",
    dto: ExtractRelationshipsStageDTO,
    job_manager: GrantApplicationJobManager[GrantApplicationStageEnum, StageDTO],
    trace_id: str,
) -> EnrichObjectivesStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.ENRICHING_OBJECTIVES,
        message="Enhancing research objectives",
        notification_type="info",
    )

    enrichment_responses = await handle_batch_enrich_objectives(
        research_objectives=grant_application.research_objectives or [],
        grant_section=dto["work_plan_section"],
        application_id=str(grant_application.id),
        form_inputs=grant_application.form_inputs or {},
        trace_id=trace_id,
    )

    await job_manager.add_notification(
        event=NotificationEvents.OBJECTIVES_ENRICHED,
        message="Research objectives enhanced",
        notification_type="success",
        data={
            "objectives": len(grant_application.research_objectives or []),
            "tasks": sum(
                len(obj["research_tasks"]) for obj in (grant_application.research_objectives or [])
            ),
        },
    )

    return EnrichObjectivesStageDTO(
        section_texts=dto["section_texts"],
        work_plan_section=dto["work_plan_section"],
        relationships=dto["relationships"],
        enrichment_responses=enrichment_responses,
    )


async def handle_enrich_terminology_stage(
    *,
    grant_application: "GrantApplication",  # noqa: ARG001
    dto: EnrichObjectivesStageDTO,
    job_manager: GrantApplicationJobManager[GrantApplicationStageEnum, StageDTO],
    trace_id: str,
) -> EnrichTerminologyStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.ENHANCING_WITH_WIKIDATA,
        message="Adding scientific terminology",
        notification_type="info",
    )

    # Enhance each objective with Wikidata scientific context in parallel
    await job_manager.ensure_not_cancelled()

    wikidata_enrichment_coroutines = [
        enrich_objective_with_wikidata(enrichment_response, trace_id=trace_id)
        for enrichment_response in dto["enrichment_responses"]
    ]

    try:
        wikidata_enrichments = await asyncio.wait_for(
            batched_gather(*wikidata_enrichment_coroutines, batch_size=3),
            timeout=300  # 5 minutes timeout for Wikidata enrichments
        )
    except asyncio.TimeoutError:
        raise ValidationError("Wikidata enrichment timed out after 5 minutes. Please try again or contact support.") from None

    await job_manager.add_notification(
        event=NotificationEvents.WIKIDATA_ENHANCEMENT_COMPLETE,
        message="Scientific context added",
        notification_type="success",
        data={
            "terms_added": len(wikidata_enrichments),
        },
    )

    return EnrichTerminologyStageDTO(
        section_texts=dto["section_texts"],
        work_plan_section=dto["work_plan_section"],
        relationships=dto["relationships"],
        enrichment_responses=dto["enrichment_responses"],
        wikidata_enrichments=wikidata_enrichments,
    )


async def handle_generate_research_plan_stage(
    *,
    grant_application: "GrantApplication",
    dto: EnrichTerminologyStageDTO,
    job_manager: GrantApplicationJobManager[GrantApplicationStageEnum, StageDTO],
    trace_id: str,
) -> GenerateResearchPlanStageDTO:
    await job_manager.ensure_not_cancelled()

    work_plan_section = dto["work_plan_section"]
    application_id = str(grant_application.id)
    form_inputs = grant_application.form_inputs or {}
    research_objectives = grant_application.research_objectives or []
    relationships = dto["relationships"]
    enrichment_responses = dto["enrichment_responses"]

    dtos = []
    total_tasks = sum(len(research_objective["research_tasks"]) for research_objective in research_objectives)
    words_per_component = abs(round(work_plan_section["max_words"] / (len(research_objectives) + total_tasks)))
    for research_objective, enrichment_response in zip(research_objectives, enrichment_responses, strict=True):
        objective_enrichment = enrichment_response["research_objective"]
        tasks_enrichment = enrichment_response["research_tasks"]
        research_tasks = research_objective["research_tasks"]
        dtos.append(
            cast(
                "ResearchComponentGenerationDTO",
                {
                    "number": str(research_objective["number"]),
                    "title": research_objective["title"],
                    "description": objective_enrichment["description"],
                    "instructions": objective_enrichment["instructions"],
                    "guiding_questions": objective_enrichment["guiding_questions"],
                    "search_queries": objective_enrichment["search_queries"],
                    "relationships": relationships.get(str(research_objective["number"]), []),
                    "max_words": words_per_component,
                    "type": "objective",
                },
            )
        )
        dtos.extend(
            [
                cast(
                    "ResearchComponentGenerationDTO",
                    {
                        "number": f"{research_objective['number']}.{research_task['number']}",
                        "title": research_task["title"],
                        "description": task_enrichment["description"],
                        "instructions": task_enrichment["instructions"],
                        "guiding_questions": task_enrichment["guiding_questions"],
                        "search_queries": task_enrichment["search_queries"],
                        "relationships": relationships.get(f"{research_objective['number']}.{research_task['number']}", []),
                        "max_words": words_per_component,
                        "type": "task",
                    },
                )
                for research_task, task_enrichment in zip(research_tasks, tasks_enrichment, strict=True)
            ]
        )

    work_plan_text = ""

    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.GENERATING_RESEARCH_PLAN,
        message="Writing research plan",
        notification_type="info",
    )

    total_objectives = len(research_objectives)

    objective_task_groups = []
    for count in range(1, total_objectives + 1):
        objective: ResearchComponentGenerationDTO = next(d for d in dtos if str(d["number"]) == str(count))
        tasks: list[ResearchComponentGenerationDTO] = [t for t in dtos if t["number"].startswith(f"{count}.")]
        objective_task_groups.append((objective, tasks))

    await job_manager.add_notification(
        event=NotificationEvents.GENERATING_OBJECTIVE,
        message=f"Generating {total_objectives} research objectives",
        notification_type="info",
    )

    try:
        objective_results = await asyncio.wait_for(
            gather(
                *[
                    generate_objective_with_tasks(
                        application_id=application_id,
                        form_inputs=form_inputs,
                        objective=objective,
                        tasks=tasks,
                        work_plan_text=work_plan_text,
                        trace_id=trace_id,
                    )
                    for objective, tasks in objective_task_groups
                ]
            ),
            timeout=900  # 15 minutes timeout for research plan generation
        )
    except asyncio.TimeoutError:
        raise ValidationError("Research plan generation timed out after 15 minutes. Please try again or contact support.") from None

    for objective, objective_text, task_results in objective_results:
        await job_manager.ensure_not_cancelled()
        work_plan_text += f"\n\n### Objective {objective['number']}: {objective['title']}\n{objective_text}"

        for research_task, research_task_text in task_results:
            work_plan_text += f"\n\n#### {research_task['number']}: {research_task['title']}\n{research_task_text}"

        await job_manager.add_notification(
            event=NotificationEvents.OBJECTIVE_COMPLETED,
            message=f"Objective {objective['number']}/{total_objectives} complete",
            notification_type="info",
            data={
                "number": objective["number"],
                "title": objective["title"][:50],
                "tasks": len(task_results),
                "progress": int(float(objective["number"]) / total_objectives * 100),
            },
        )

    await job_manager.add_notification(
        event=NotificationEvents.RESEARCH_PLAN_COMPLETED,
        message="Research plan complete",
        notification_type="success",
        data={
            "objectives": total_objectives,
            "tasks": total_tasks,
            "words": len(work_plan_text.split()),
        },
    )

    research_plan_text = normalize_markdown(work_plan_text)

    return GenerateResearchPlanStageDTO(
        section_texts=dto["section_texts"],
        work_plan_section=dto["work_plan_section"],
        relationships=dto["relationships"],
        enrichment_responses=dto["enrichment_responses"],
        wikidata_enrichments=dto["wikidata_enrichments"],
        research_plan_text=research_plan_text,
    )
