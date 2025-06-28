"""
Optimized batch enrichment for research objectives.

Key optimizations based on baseline analysis (488s for 5 objectives):
1. Single retrieval call shared across all objectives (reduces I/O overhead)
2. Smart batching to stay within token limits while maximizing throughput
3. Parallel processing where feasible
4. Optimized prompt structure for better LLM efficiency
"""

from asyncio import gather
from typing import Final

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.src.grant_application.enrich_research_objective import ObjectiveEnrichmentDTO
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.token_optimization import estimate_prompt_tokens

logger = get_logger(__name__)


CLAUDE_CONTEXT_LIMIT: Final[int] = 200_000  
SAFETY_MARGIN: Final[float] = 0.85  
OPTIMAL_BATCH_SIZE: Final[int] = 5  
MAX_RETRIEVAL_TOKENS: Final[int] = 8000  


async def calculate_optimal_batching(
    objectives: list[ResearchObjective],
    retrieval_content: str,
) -> list[list[ResearchObjective]]:
    """
    Calculate optimal batching strategy based on token limits and content size.

    Args:
        objectives: List of research objectives to batch
        retrieval_content: The shared retrieval content for token estimation

    Returns:
        List of objective batches optimized for token limits
    """
    if not objectives:
        return []

    
    base_tokens = estimate_prompt_tokens(retrieval_content) + 2000  
    available_tokens = int(CLAUDE_CONTEXT_LIMIT * SAFETY_MARGIN) - base_tokens

    
    sample_obj = objectives[0]
    obj_text = f"Objective {sample_obj['number']}: {sample_obj['title']}\nTasks: {sample_obj['research_tasks']}"
    tokens_per_obj = estimate_prompt_tokens(obj_text) * 2.5  

    
    max_objs_per_batch = max(1, min(available_tokens // tokens_per_obj, OPTIMAL_BATCH_SIZE))

    logger.info(
        "Calculated optimal batching",
        total_objectives=len(objectives),
        base_tokens=base_tokens,
        tokens_per_objective=tokens_per_obj,
        max_objectives_per_batch=max_objs_per_batch,
        available_tokens=available_tokens,
    )

    
    batches = []
    for i in range(0, len(objectives), max_objs_per_batch):
        batch = objectives[i:i + max_objs_per_batch]
        batches.append(batch)

    return batches


async def create_optimized_retrieval_context(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
) -> str:
    """
    Create optimized retrieval context using single call for all objectives.

    Key optimizations:
    - Single retrieval call reduces API overhead
    - Combined search queries for better coverage
    - Optimized token usage
    """
    
    combined_context = "\n\n".join([
        f"Research Objective {obj['number']}: {obj['title']}"
        for obj in research_objectives
    ])

    
    search_queries = list(grant_section["search_queries"])

    
    for obj in research_objectives[:3]:  
        title_words = obj["title"].lower().split()
        key_terms = [w for w in title_words if len(w) > 4 and w not in {"research", "objective", "study", "investigate"}]
        if key_terms:
            search_queries.append(" ".join(key_terms[:2]))  

    logger.info(
        "Performing optimized single retrieval",
        objectives_count=len(research_objectives),
        search_queries_count=len(search_queries),
        max_tokens=MAX_RETRIEVAL_TOKENS,
    )

    
    retrieval_result = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries[:8],  
        task_description=combined_context,
        max_tokens=MAX_RETRIEVAL_TOKENS,
    )

    logger.info(
        "Optimized retrieval completed",
        result_tokens=estimate_prompt_tokens(retrieval_result),
        result_length=len(retrieval_result),
    )

    return retrieval_result


async def handle_optimized_batch_enrichment(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
    form_inputs: ResearchDeepDive,
) -> list[ObjectiveEnrichmentDTO]:
    """
    Optimized batch enrichment implementation.

    Target: Beat baseline of 488s for 5 objectives (55.2% improvement over single calls)

    Optimizations:
    1. Single retrieval call shared across all objectives
    2. Smart batching based on token limits
    3. Parallel processing of independent batches
    4. Optimized retrieval strategy
    """
    if not research_objectives:
        return []

    logger.info(
        "Starting optimized batch enrichment",
        application_id=application_id,
        objectives_count=len(research_objectives),
        target_improvement="Beat 488s baseline for 5 objectives",
    )

    
    shared_retrieval_content = await create_optimized_retrieval_context(
        application_id=application_id,
        grant_section=grant_section,
        research_objectives=research_objectives,
    )

    
    objective_batches = await calculate_optimal_batching(
        objectives=research_objectives,
        retrieval_content=shared_retrieval_content,
    )

    logger.info(
        "Batch strategy calculated",
        total_batches=len(objective_batches),
        batch_sizes=[len(batch) for batch in objective_batches],
    )

    
    all_responses: list[ObjectiveEnrichmentDTO] = []

    if len(objective_batches) == 1:
        
        logger.info("Processing all objectives in single optimized batch")

        responses = await handle_batch_enrich_objectives(
            application_id=application_id,
            grant_section=grant_section,
            research_objectives=objective_batches[0],
            form_inputs=form_inputs,
            enrichment_rag_results=shared_retrieval_content,
        )
        all_responses.extend(responses)

    elif len(objective_batches) == 2:
        
        logger.info("Processing 2 batches in parallel")

        batch_tasks = [
            handle_batch_enrich_objectives(
                application_id=application_id,
                grant_section=grant_section,
                research_objectives=batch,
                form_inputs=form_inputs,
                enrichment_rag_results=shared_retrieval_content,
            )
            for batch in objective_batches
        ]

        batch_results = await gather(*batch_tasks)
        for result in batch_results:
            all_responses.extend(result)

    else:
        
        logger.info(
            "Processing multiple batches (parallel + sequential)",
            parallel_batches=2,
            sequential_batches=len(objective_batches) - 2,
        )

        
        parallel_tasks = [
            handle_batch_enrich_objectives(
                application_id=application_id,
                grant_section=grant_section,
                research_objectives=batch,
                form_inputs=form_inputs,
                enrichment_rag_results=shared_retrieval_content,
            )
            for batch in objective_batches[:2]
        ]

        parallel_results = await gather(*parallel_tasks)
        for result in parallel_results:
            all_responses.extend(result)

        
        for batch in objective_batches[2:]:
            responses = await handle_batch_enrich_objectives(
                application_id=application_id,
                grant_section=grant_section,
                research_objectives=batch,
                form_inputs=form_inputs,
                enrichment_rag_results=shared_retrieval_content,
            )
            all_responses.extend(responses)

    logger.info(
        "Optimized batch enrichment completed",
        total_responses=len(all_responses),
        expected_responses=len(research_objectives),
        batches_processed=len(objective_batches),
    )

    
    if len(all_responses) != len(research_objectives):
        logger.warning(
            "Response count mismatch",
            expected=len(research_objectives),
            actual=len(all_responses),
        )

    return all_responses


async def estimate_performance_improvement(
    objectives_count: int,
    baseline_seconds: float = 488.0,  
) -> dict[str, float]:
    """
    Estimate performance improvement from optimizations.

    Based on baseline: 488s for 5 objectives with 55.2% batch vs single improvement.
    """
    
    baseline_batch_time = baseline_seconds  
    objectives_per_batch = 5
    baseline_batch_time / objectives_per_batch  

    
    retrieval_overhead_savings = 0.15  
    batching_efficiency = 0.10  
    parallel_processing_boost = min(0.20, objectives_count * 0.04)  

    total_improvement_factor = 1 - (retrieval_overhead_savings + batching_efficiency + parallel_processing_boost)

    
    estimated_optimized_time = baseline_batch_time * total_improvement_factor
    estimated_time_saved = baseline_batch_time - estimated_optimized_time
    estimated_improvement_percent = (estimated_time_saved / baseline_batch_time) * 100

    return {
        "baseline_time_seconds": baseline_batch_time,
        "estimated_optimized_time_seconds": estimated_optimized_time,
        "estimated_time_saved_seconds": estimated_time_saved,
        "estimated_improvement_percent": estimated_improvement_percent,
        "optimization_factors": {
            "retrieval_savings": retrieval_overhead_savings * 100,
            "batching_efficiency": batching_efficiency * 100,
            "parallel_boost": parallel_processing_boost * 100,
        }
    }
