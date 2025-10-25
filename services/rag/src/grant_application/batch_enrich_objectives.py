from typing import TYPE_CHECKING, Final, cast

from packages.db.src.json_objects import (
    GrantLongFormSection,
    ResearchDeepDive,
    ResearchObjective,
    TranslationalResearchDeepDive,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather

from services.rag.src.grant_application.dto import EnrichObjectiveInputDTO
from services.rag.src.grant_application.enrich_research_objective import (
    ObjectiveEnrichmentDTO,
    handle_enrich_objective,
)

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.token_optimization import estimate_prompt_tokens

logger = get_logger(__name__)

MAX_TOTAL_TOKENS: Final[int] = 180000
MAX_RETRIEVAL_TOKENS: Final[int] = 6000
SAFETY_MARGIN: Final[float] = 0.85


def calculate_optimal_batching(
    research_objectives: list[ResearchObjective], estimated_context_tokens: int
) -> list[list[ResearchObjective]]:
    if len(research_objectives) <= 2:
        return [research_objectives]

    tokens_per_objective = 4000
    available_tokens = int((MAX_TOTAL_TOKENS - estimated_context_tokens) * SAFETY_MARGIN)

    max_objectives_per_batch = max(1, available_tokens // tokens_per_objective)

    if max_objectives_per_batch >= len(research_objectives):
        return [research_objectives]

    batches = []
    for i in range(0, len(research_objectives), max_objectives_per_batch):
        batch = research_objectives[i : i + max_objectives_per_batch]
        batches.append(batch)

    return batches


async def perform_shared_retrieval(
    research_objectives: list[ResearchObjective],
    grant_section: GrantLongFormSection,
    application_id: str,
    trace_id: str,
) -> str:
    additional_queries = []

    for obj in research_objectives:
        title_words = obj["title"].lower().split()
        key_terms = [
            w
            for w in title_words
            if len(w) > 3 and w not in {"research", "objective", "study", "investigate", "analysis", "development"}
        ]
        if key_terms:
            additional_queries.append(" ".join(key_terms[:3]))

            if len(key_terms) > 1:
                additional_queries.extend(key_terms[:2])

    search_queries = list(grant_section["search_queries"])
    search_queries.extend(additional_queries)

    combined_context = "\n\n".join(
        [
            f"Research Objective {obj['number']}: {obj['title']}\nResearch Objective {obj['number']}: {obj['title']}"
            for obj in research_objectives
        ]
    )

    retrieval_result = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries[:15],
        task_description=combined_context,
        max_tokens=MAX_RETRIEVAL_TOKENS,
        trace_id=trace_id,
    )

    raw_context = "\n".join(retrieval_result)
    return compress_prompt_text(raw_context, aggressive=True)


async def handle_batch_enrich_objectives(
    research_objectives: list[ResearchObjective],
    grant_section: GrantLongFormSection,
    application_id: str,
    form_inputs: ResearchDeepDive | TranslationalResearchDeepDive,
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> list[ObjectiveEnrichmentDTO]:
    if not research_objectives:
        return []

    shared_context = await perform_shared_retrieval(research_objectives, grant_section, application_id, trace_id)
    estimated_context_tokens = estimate_prompt_tokens(shared_context)
    objective_batches = calculate_optimal_batching(research_objectives, estimated_context_tokens)

    all_deep_dives = []

    for _batch_idx, batch in enumerate(objective_batches):
        batch_coroutines = [
            handle_enrich_objective(
                EnrichObjectiveInputDTO(
                    research_objective=obj,
                    grant_section=grant_section,
                    application_id=application_id,
                    form_inputs=form_inputs,
                    retrieval_context=shared_context,
                    keywords=grant_section["keywords"],
                    topics=grant_section["topics"],
                    trace_id=trace_id,
                ),
                job_manager=job_manager,
            )
            for obj in batch
        ]

        batch_size = min(4, len(batch_coroutines)) if batch_coroutines else 1
        batch_results = await batched_gather(*batch_coroutines, batch_size=batch_size, return_exceptions=True)

        for i, result in enumerate(batch_results):
            if isinstance(result, Exception):
                obj = batch[i]
                logger.error(
                    "Objective enrichment failed",
                    objective_number=obj.get("number"),
                    objective_title=obj.get("title"),
                    error=str(result),
                    trace_id=trace_id,
                )
                fallback_enrichment = {
                    "research_objective": {
                        "description": f"[Enrichment failed for objective {obj.get('number', 'Unknown')}]",
                        "instructions": "Manual enrichment required.",
                        "guiding_questions": ["What are the key components of this research objective?"],
                        "search_queries": [obj.get("title", "research objective")],
                    },
                    "research_tasks": [
                        {
                            "description": f"[Enrichment failed for task {task.get('number', 'Unknown')}]",
                            "instructions": "Manual enrichment required.",
                            "guiding_questions": ["What are the specific steps for this task?"],
                            "search_queries": [task.get("title", "research task")],
                        }
                        for task in obj.get("research_tasks", [])
                    ],
                }
                all_deep_dives.append(cast("ObjectiveEnrichmentDTO", fallback_enrichment))
            else:
                all_deep_dives.append(cast("ObjectiveEnrichmentDTO", result))

    return all_deep_dives
