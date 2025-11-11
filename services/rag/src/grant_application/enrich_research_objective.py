from functools import partial
from typing import TYPE_CHECKING, Final, TypedDict

import msgspec
from packages.db.src.json_objects import ResearchObjective
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_application.dto import EnrichmentDataDTO, EnrichObjectiveInputDTO

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT: Final[str] = """
You are a professional grant writer embedded in a system designed to produce best-in-class grant applications.
Your role is to enrich research objectives and their tasks with detailed scientific rationale, methodology, and metadata
to support subsequent text generation, retrieval, and evaluation.

### Operating Pipeline
1. **Read** all input materials thoroughly - including the research objective, tasks, context, retrieved data, form inputs, keywords, and topics.
2. **Identify**:
   - The scientific focus and goal of the research objective and its associated tasks.
   - Any clear objectives, terms, or examples already stated by the user - if present, use them directly.
   - If user input lacks clarity, infer a logically consistent objective and terminology using your reasoning.
3. **Reason**:
   - Before writing, plan how each field (context, instructions, description, etc.) will support the objective.
   - Use your reasoning to connect the scientific rationale, experimental design, and innovation logic.
   - Seek alignment with funder expectations (clarity, novelty, feasibility).
4. **Write**:
   - Generate structured enriched content that follows the schema precisely.
   - Keep all original tone, terms, and technical details from input materials.
   - When improving clarity, use examples, references, and specific details - these are the best proof of credibility.
   - Ensure each part of the output (objective + tasks) is specific, measurable, and achievable.

### Style and Fidelity
- Preserve original domain language, tone, and hierarchy of detail.
- Integrate researcher names, works, or technical references found in the context where relevant.
- Prefer concise, factual enrichment over verbose generalization.
- Every section should logically build toward a unified scientific narrative."
"""


ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="enrich_research_objective",
    template="""
    Enrich the following research objective and its tasks with metadata and scientific depth for grant proposal generation.

    ## Pipeline
    1. **Read the data you received** - the full context, keywords, topics, and form inputs.
    2. **Identify** whether the user input already contains a clear objective or not.
       - If yes -> use it directly.
       - If not -> infer it logically from the available context.
    3. **Reason** before writing:
       - Map how each component will serve the objective.
       - Identify and retain critical terms, examples, and scientific details.
       - Ensure each enriched output field is specific, measurable, and achievable.
    4. **Write**:
       - Produce structured enriched content for both the research objective and its tasks.
       - Keep original tone and terminology.
       - Prefer concrete examples, researcher names, methods, and specific terms rather than general statements.

    ## Input Data
    <objective_and_tasks>${objective_and_tasks}</objective_and_tasks>
    <rag_results>${rag_results}</rag_results>
    <form_inputs>${form_inputs}</form_inputs>
    <keywords>${keywords}</keywords>
    <topics>${topics}</topics>

    ## Output Requirements
    - Retain all domain-specific terminology and relevant examples.
    - Use concise academic writing style appropriate for grants.
    - Ensure coherence between objectives and tasks.
    - Use specific, measurable, and realistic details.
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

ENRICH_RESEARCH_OBJECTIVE_REFINEMENT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="refine_enrich_research_objective",
    template="""
    You are a professional grant writer and scientific editor embedded in a system designed to produce best-in-class grant applications.
    Your task is to review and refine enriched research objectives and tasks while preserving schema structure, terminology, and meaning.

    ## Reasoning Pipeline
    1. **Read** all provided inputs - the original objective, enrichment draft, RAG context, keywords, and topics.
    2. **Identify**:
       - Weak, unclear, or redundant parts in each enrichment field.
       - Missing or inconsistent logic between objectives and tasks.
       - Opportunities to clarify methodology, dependencies, and innovation.
    3. **Reason**:
       - Plan improvements logically before writing.
       - Maintain scientific tone and fidelity to the original domain.
       - Strengthen the link between scientific rationale, methods, and expected results.
       - Preserve all original technical terms, researcher names, and examples.
    4. **Write**:
       - Produce the refined output following the exact schema and field names.
       - Keep every field present with the same constraints.
       - Replace generic phrases with specific, evidence-based details or realistic examples.
       - Improve flow, coherence, and readability without changing meaning or data.

    ## Input
    <objective_and_tasks>${objective_and_tasks}</objective_and_tasks>
    <rag_results>${rag_results}</rag_results>
    <form_inputs>${form_inputs}</form_inputs>
    <keywords>${keywords}</keywords>
    <topics>${topics}</topics>

    ## Content and Style Rules
    - Always preserve schema structure.
    - Never remove or rename fields.
    - Maintain academic tone, professional voice, and factual precision.
    - Include examples, researcher names, and references naturally.
    - Ensure internal consistency and logical sequence across objectives and tasks.
    - Final output must be technically and stylistically ready for grant submission.
    """,
)


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
        model=GEMINI_FLASH_MODEL,
        system_prompt=ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT,
        validator=partial(validate_enrichment_response, input_objective=input_objective),
        trace_id=trace_id,
    )


async def refine_objective_enrichment(
    *,
    dto: EnrichObjectiveInputDTO,
) -> ObjectiveEnrichmentDTO:
    form_inputs_dict = (
        msgspec.structs.asdict(dto["form_inputs"])
        if isinstance(dto["form_inputs"], msgspec.Struct)
        else dto["form_inputs"]
    )

    compressed_context = compress_prompt_text(dto["retrieval_context"], aggressive=True)

    refinement_prompt = ENRICH_RESEARCH_OBJECTIVE_REFINEMENT_PROMPT.substitute(
        objective_and_tasks=dto["research_objective"],
        keywords=dto["keywords"],
        topics=dto["topics"],
        form_inputs=form_inputs_dict,
    )

    full_refinement_prompt = refinement_prompt.to_string(rag_results=compressed_context)

    return await handle_completions_request(
        prompt_identifier="refine_enrich_objective",
        messages=full_refinement_prompt,
        response_type=ObjectiveEnrichmentDTO,
        response_schema=research_objective_enrichment_schema,
        model=GEMINI_FLASH_MODEL,
        system_prompt=ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT,
        validator=partial(validate_enrichment_response, input_objective=dto["research_objective"]),
        trace_id=dto["trace_id"],
    )


async def handle_enrich_objective(
    dto: EnrichObjectiveInputDTO, *, job_manager: "JobManager[StageDTO]"
) -> ObjectiveEnrichmentDTO:
    await job_manager.ensure_not_cancelled()

    form_inputs_dict = (
        msgspec.structs.asdict(dto["form_inputs"])
        if isinstance(dto["form_inputs"], msgspec.Struct)
        else dto["form_inputs"]
    )

    enrichment_prompt = ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT.substitute(
        objective_and_tasks=dto["research_objective"],
        keywords=dto["keywords"],
        topics=dto["topics"],
        form_inputs=form_inputs_dict,
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

    draft = await enrich_objective_generation(
        full_prompt,
        trace_id=dto["trace_id"],
        input_objective=dto["research_objective"],
    )

    await job_manager.ensure_not_cancelled()

    refined = await refine_objective_enrichment(dto=dto)

    return refined or draft
