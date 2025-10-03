from functools import partial
from typing import TYPE_CHECKING, Final, TypedDict

from packages.db.src.json_objects import ResearchObjective
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.grant_application.dto import EnrichmentDataDTO, EnrichObjectiveInputDTO

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT: Final[str] = """
Enrich research objectives with detailed scientific content for grant applications.
Generate guiding questions, search queries, and metadata to support text generation.
"""

ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="enrich_research_objective",
    template="""
Enrich research objective with metadata for grant work plan generation.

## Input

<objective_and_tasks>${objective_and_tasks}</objective_and_tasks>
<rag_results>${rag_results}</rag_results>
<form_inputs>${form_inputs}</form_inputs>
<keywords>${keywords}</keywords>
<topics>${topics}</topics>

## Required Fields (7 per objective/task)

1. **enriched**: Enhanced version with scientific rationale and impact (min 50 chars)
2. **terms**: Exactly 5 fundamental scientific terms central to this research
3. **context**: Scientific background explaining why this research is needed (min 50 chars)
4. **instructions**: AI generation guidance (style, technical depth, formatting) (min 50 chars)
5. **description**: Purpose, methodology, expected results, dependencies, risks, innovation (min 50 chars)
6. **questions**: 3-10 questions addressing purpose, methodology, outcomes, challenges
7. **queries**: 3-10 concise phrases (3-7 words) for vector retrieval

Return enriched content for both research_objective and all research_tasks.
""",
)

enriched_object_schema = {
    "type": "object",
    "properties": {
        "enriched": {
            "type": "string",
            "minLength": 50,
            "description": "Enhanced objective with scientific rationale and impact",
        },
        "terms": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 5,
            "maxItems": 5,
            "description": "Exactly 5 fundamental scientific terms",
        },
        "context": {
            "type": "string",
            "minLength": 50,
            "description": "Scientific background explaining research rationale",
        },
        "instructions": {
            "type": "string",
            "minLength": 50,
            "description": "AI generation guidance (style, depth, formatting)",
        },
        "description": {
            "type": "string",
            "minLength": 50,
            "description": "Purpose, methodology, results, dependencies, risks, innovation",
        },
        "questions": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 10,
            "description": "Questions on purpose, methodology, outcomes, challenges",
        },
        "queries": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 10,
            "description": "Concise queries (3-7 words) for vector retrieval",
        },
    },
    "required": [
        "enriched",
        "terms",
        "context",
        "instructions",
        "description",
        "questions",
        "queries",
    ],
}

research_objective_enrichment_schema = {
    "type": "object",
    "properties": {
        "research_objective": enriched_object_schema,
        "research_tasks": {
            "type": "array",
            "items": enriched_object_schema,
            "description": "Array of enriched content for each research task, must match input tasks exactly",
        },
    },
    "required": ["research_objective", "research_tasks"],
}


class ObjectiveEnrichmentDTO(TypedDict):
    research_objective: EnrichmentDataDTO
    research_tasks: list[EnrichmentDataDTO]


def validate_enrichment_response(
    response: ObjectiveEnrichmentDTO, *, input_objective: ResearchObjective | None
) -> None:
    if "research_objective" not in response:
        raise ValidationError("Missing objective in response", context=response)

    objective = response["research_objective"]
    if not isinstance(objective, dict):
        raise ValidationError(
            "Objective must be a dictionary",
            context={
                "type": type(objective).__name__,
            },
        )

    for field in [
        "enriched",
        "terms",
        "context",
        "instructions",
        "description",
        "questions",
        "queries",
    ]:
        if field not in objective:
            raise ValidationError(f"Missing {field} in objective", context=objective)

    if len(objective["terms"]) != 5:
        raise ValidationError(
            "Objective must have exactly 5 core scientific terms",
            context={"terms_count": len(objective["terms"])},
        )

    if len(objective["questions"]) < 3:
        raise ValidationError(
            "Objective must have at least 3 guiding questions",
            context={"questions_count": len(objective["questions"])},
        )

    if len(objective["queries"]) < 3:
        raise ValidationError(
            "Objective must have at least 3 search queries", context={"queries_count": len(objective["queries"])}
        )

    if len(objective["enriched"].strip()) < 50:
        raise ValidationError("Objective enriched too short", context={"content": objective["enriched"]})

    if len(objective["context"].strip()) < 50:
        raise ValidationError("Objective context too short", context={"content": objective["context"]})

    if len(objective["instructions"].strip()) < 50:
        raise ValidationError("Objective instructions too short", context={"content": objective["instructions"]})

    if len(objective["description"].strip()) < 50:
        raise ValidationError("Objective description too short", context={"content": objective["description"]})

    if "research_tasks" not in response:
        raise ValidationError("Missing tasks in response", context=response)

    if (
        input_objective
        and input_objective.get("research_tasks")
        and len(response["research_tasks"]) != len(input_objective["research_tasks"])
    ):
        raise ValidationError(
            "Number of enriched tasks doesn't match input objective tasks",
            context={
                "input_tasks_count": len(input_objective["research_tasks"]),
                "response_tasks_count": len(response["research_tasks"]),
            },
        )

    for i, task in enumerate(response["research_tasks"]):
        for field in [
            "enriched",
            "terms",
            "context",
            "instructions",
            "description",
            "questions",
            "queries",
        ]:
            if field not in task:
                raise ValidationError(f"Missing {field} in task at index {i}", context=task)

        if len(task["terms"]) != 5:
            raise ValidationError(
                f"Task at index {i} must have exactly 5 core scientific terms",
                context={"terms_count": len(task["terms"])},
            )

        if len(task["questions"]) < 3:
            raise ValidationError(
                f"Task at index {i} must have at least 3 guiding questions",
                context={"questions_count": len(task["questions"])},
            )

        if len(task["queries"]) < 3:
            raise ValidationError(
                f"Task at index {i} must have at least 3 search queries",
                context={"queries_count": len(task["queries"])},
            )

        if len(task["enriched"].strip()) < 50:
            raise ValidationError(f"Task at index {i} enriched too short", context={"content": task["enriched"]})

        if len(task["context"].strip()) < 50:
            raise ValidationError(f"Task at index {i} context too short", context={"content": task["context"]})

        if len(task["instructions"].strip()) < 50:
            raise ValidationError(
                f"Task at index {i} instructions too short", context={"content": task["instructions"]}
            )

        if len(task["description"].strip()) < 50:
            raise ValidationError(f"Task at index {i} description too short", context={"content": task["description"]})


async def enrich_objective_generation(
    task_description: str,
    *,
    trace_id: str,
    input_objective: ResearchObjective | None = None,
) -> ObjectiveEnrichmentDTO:
    return await handle_completions_request(
        prompt_identifier="enrich_objective",
        messages=task_description,
        response_type=ObjectiveEnrichmentDTO,
        response_schema=research_objective_enrichment_schema,
        model=ANTHROPIC_SONNET_MODEL,
        system_prompt=ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT,
        validator=partial(validate_enrichment_response, input_objective=input_objective),
        trace_id=trace_id,
    )


async def handle_enrich_objective(
    dto: EnrichObjectiveInputDTO, *, job_manager: "JobManager[StageDTO]"
) -> ObjectiveEnrichmentDTO:
    enrichment_prompt = ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT.substitute(
        objective_and_tasks=dto["research_objective"],
        keywords=dto["keywords"],
        topics=dto["topics"],
        form_inputs=dto["form_inputs"],
    )

    compressed_context = compress_prompt_text(dto["retrieval_context"], aggressive=True)

    logger.debug(
        "Prepared and compressed context for objective enrichment",
        objective_number=dto["research_objective"]["number"],
        original_context_chars=len(dto["retrieval_context"]),
        compressed_context_chars=len(compressed_context),
        trace_id=dto["trace_id"],
    )

    full_prompt = enrichment_prompt.to_string(rag_results=compressed_context)

    return await with_evaluation(
        prompt_identifier="enrich_objective",
        prompt_handler=enrich_objective_generation,
        prompt=full_prompt,
        input_objective=dto["research_objective"],
        trace_id=dto["trace_id"],
        **get_evaluation_kwargs(
            "enrich_objectives",
            job_manager,
            section_config=dto.get("grant_section"),
            rag_context=dto.get("retrieval_context"),
            research_objectives=[dto["research_objective"]],
            keywords=dto.get("keywords"),
            topics=dto.get("topics"),
            is_json_content=True,
        ),
    )
