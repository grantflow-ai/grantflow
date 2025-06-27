"""Batch enrichment for research objectives - optimized for performance."""

from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_application.enrich_research_objective import (
    EnrichmentDataDTO,
    ObjectiveEnrichmentDTO,
    criteria,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.llm_evaluation import with_prompt_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents

logger = get_logger(__name__)

BATCH_ENRICH_OBJECTIVES_SYSTEM_PROMPT: Final[str] = """
You are a specialized component in a RAG system dedicated to enriching STEM grant applications.
Your role is to enhance multiple research objectives and their tasks simultaneously with detailed
scientific content, guiding questions, and search queries that will produce competitive and
compelling grant applications. Process all objectives in a single pass for efficiency.
"""

BATCH_ENRICH_OBJECTIVES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="batch_enrich_objectives",
    template="""
    Your task is to enrich ALL provided research objectives and their tasks with detailed, scientifically rigorous information to guide the generation of a comprehensive, persuasive, and competitive work plan for a grant application.

    ## Sources

    All Research Objectives and Tasks:
        <objectives_and_tasks>
        ${objectives_and_tasks}
        </objectives_and_tasks>

    Retrieval Results:
        <rag_results>
        ${rag_results}
        </rag_results>

    User Inputs:
        <form_inputs>
        ${form_inputs}
        </form_inputs>

    ## Metadata

    Keywords:
        <keywords>
        ${keywords}
        </keywords>

    Topics:
        <topics>
        ${topics}
        </topics>

    ## Instructions

    Process EACH objective following the same enrichment requirements:

    1. Formulate between 3 to 10 guiding questions for each objective and its tasks
    2. Generate detailed descriptions addressing purpose, methodology, expected results, dependencies, risks, and innovation
    3. Write detailed instructions for AI text generation
    4. Generate between 3-10 search queries for retrieval

    ## Output Structure

    Return a JSON object with an array of enriched objectives, where each objective includes:
    - The objective number (to maintain ordering)
    - Enriched content for the research objective (instructions, description, guiding_questions, search_queries)
    - Enriched content for each of its research tasks

    IMPORTANT:
    - Process ALL objectives in the input
    - Maintain the exact order and numbering of objectives
    - Each objective and task must have all required fields with substantial content (minimum 50 characters)
    - Ensure consistency across all objectives while maintaining their unique aspects
    """,
)


class EnrichedObjectiveDTO(TypedDict):
    objective_number: int
    research_objective: EnrichmentDataDTO
    research_tasks: list[EnrichmentDataDTO]


class BatchObjectiveEnrichmentDTO(TypedDict):
    objectives: list[EnrichedObjectiveDTO]


batch_enrichment_schema = {
    "type": "object",
    "properties": {
        "objectives": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "objective_number": {"type": "integer"},
                    "research_objective": {
                        "type": "object",
                        "properties": {
                            "instructions": {"type": "string", "minLength": 50},
                            "description": {"type": "string", "minLength": 50},
                            "guiding_questions": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                            "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                        },
                        "required": ["instructions", "description", "guiding_questions", "search_queries"],
                    },
                    "research_tasks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "instructions": {"type": "string", "minLength": 50},
                                "description": {"type": "string", "minLength": 50},
                                "guiding_questions": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                                "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                            },
                            "required": ["instructions", "description", "guiding_questions", "search_queries"],
                        },
                    },
                },
                "required": ["objective_number", "research_objective", "research_tasks"],
            },
        }
    },
    "required": ["objectives"],
}


def validate_batch_enrichment_response(
    response: BatchObjectiveEnrichmentDTO, *, input_objectives: list[ResearchObjective]
) -> None:
    """Validate batch enrichment response."""
    if "objectives" not in response:
        raise ValidationError("Missing objectives in response", context=response)

    if len(response["objectives"]) != len(input_objectives):
        raise ValidationError(
            "Number of enriched objectives doesn't match input",
            context={
                "input_count": len(input_objectives),
                "response_count": len(response["objectives"]),
            },
        )


    for i, enriched_obj in enumerate(response["objectives"]):
        if "objective_number" not in enriched_obj:
            raise ValidationError(f"Missing objective_number in enriched objective at index {i}")

        if "research_objective" not in enriched_obj:
            raise ValidationError(f"Missing research_objective in enriched objective at index {i}")

        if "research_tasks" not in enriched_obj:
            raise ValidationError(f"Missing research_tasks in enriched objective at index {i}")


        input_obj = input_objectives[i]
        if len(enriched_obj["research_tasks"]) != len(input_obj["research_tasks"]):
            raise ValidationError(
                f"Task count mismatch for objective {i}",
                context={
                    "input_tasks": len(input_obj["research_tasks"]),
                    "enriched_tasks": len(enriched_obj["research_tasks"]),
                },
            )


async def batch_enrich_objectives_generation(
    task_description: str,
    *,
    input_objectives: list[ResearchObjective],
) -> BatchObjectiveEnrichmentDTO:
    """Generate batch enrichment with LLM."""
    return await handle_completions_request(
        prompt_identifier="batch_enrich_objectives",
        messages=task_description,
        response_type=BatchObjectiveEnrichmentDTO,
        response_schema=batch_enrichment_schema,
        model=ANTHROPIC_SONNET_MODEL,
        system_prompt=BATCH_ENRICH_OBJECTIVES_SYSTEM_PROMPT,
        validator=partial(validate_batch_enrichment_response, input_objectives=input_objectives),
    )


async def handle_batch_enrich_objectives(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
    form_inputs: ResearchDeepDive,
    enrichment_rag_results: str | None = None,
) -> list[ObjectiveEnrichmentDTO]:
    """Batch enrich all objectives in a single LLM call with shared retrieval."""


    objectives_text = "\n\n".join([
        f"Objective {obj['number']}: {obj['title']}\nTasks: {obj['research_tasks']}"
        for obj in research_objectives
    ])

    enrichment_prompt = BATCH_ENRICH_OBJECTIVES_USER_PROMPT.substitute(
        objectives_and_tasks=objectives_text,
        keywords=grant_section["keywords"],
        topics=grant_section["topics"],
        form_inputs=form_inputs,
    )


    if enrichment_rag_results is None:
        logger.info("Starting batch retrieval for %d objectives", len(research_objectives))
        enrichment_rag_results = await retrieve_documents(
            application_id=application_id,
            search_queries=grant_section["search_queries"],
            task_description=str(enrichment_prompt),
            max_tokens=2000,
        )
        logger.info("Retrieved %d documents for batch enrichment", len(enrichment_rag_results))
    else:
        logger.info("Using pre-retrieved results for batch enrichment")


    prompt_with_rag = enrichment_prompt.to_string(rag_results=enrichment_rag_results)
    logger.info("Prompt size for batch enrichment: %d chars (~%d tokens)",
                len(prompt_with_rag), len(prompt_with_rag) // 4)

    try:
        batch_result = await with_prompt_evaluation(
            prompt_identifier="batch_enrich_objectives",
            prompt_handler=batch_enrich_objectives_generation,
            prompt=prompt_with_rag,
            input_objectives=research_objectives,
            criteria=criteria,
            passing_score=80,
            increment=10,
        )
        logger.info("Successfully enriched %d objectives in batch", len(research_objectives))
    except Exception as e:
        logger.error("Batch enrichment failed: %s", str(e))
        logger.error("Error type: %s", type(e).__name__)
        raise


    enrichment_responses: list[ObjectiveEnrichmentDTO] = [
        {
            "research_objective": enriched["research_objective"],
            "research_tasks": enriched["research_tasks"],
        }
        for enriched in batch_result["objectives"]
    ]

    return enrichment_responses
