from typing import Final, TypedDict

from packages.db.src.json_objects import ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

from services.rag.src.autofill.constants import (
    RESEARCH_PLAN_MAX_TOKENS,
    TEMPERATURE,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries
from services.rag.src.utils.text_compression import compress_text

logger = get_logger(__name__)


class ResearchPlanDraftTask(TypedDict):
    num: int
    title: str
    desc: str


class ResearchPlanDraftObjective(TypedDict):
    num: int
    title: str
    desc: str
    tasks: list[ResearchPlanDraftTask]


class ResearchPlanDraft(TypedDict):
    objectives: list[ResearchPlanDraftObjective]


class ResearchPlanResponse(TypedDict):
    research_objectives: list[ResearchObjective]


RESEARCH_PLAN_SYSTEM_PROMPT: Final[str] = """
You are a professional grant writer embedded in a system designed to produce best-in-class grant applications. Your task is to generate well-structured research objectives and tasks based on the provided context and uploaded research materials.

Operating rules:
1) First, read the entire prompt and all available data/context before writing.
2) Follow the established pipeline and output schema exactly.
3) Plan your approach step-by-step before drafting (use internal reasoning) to ensure accuracy, coherence, and maximal alignment with funder expectations.

"""

RESEARCH_PLAN_DRAFT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_plan_draft_generation",
    template="""
    ## Pipeline Instructions

You are part of a system built to create best-in-class grant applications.
Follow this pipeline carefully before producing your output:

1. **Read all input data thoroughly** - including the application title, existing objectives (if provided), and research context.
2. **Detect existing objectives or goals** in the input:
   - If clear research objectives already exist and they are **specific, measurable, and achievable (SMA)**, use them directly.
   - If they exist but are not fully SMA, refine and structure them to meet SMA standards.
   - If no clear objectives are found, **infer them logically** from the provided research context using professional reasoning.
3. **For each identified or constructed objective**, generate **2-5 concrete, actionable research tasks** that directly support achieving the objective.
4. **Ensure consistency and coherence**: every task must clearly advance its parent objective, and all objectives must align logically with the application title and research context.
5. Verify that all written content (objectives and tasks) is **specific, measurable, and achievable**, and appropriate for a competitive research grant.

---

## Input Data

### Application Title
${application_title}

### Existing Research Objectives
${existing_objectives}

### Research Context
${context}

---

## Content Requirements
- Objectives must be **specific, measurable, and achievable (SMA)**.
- Tasks must be **concrete, actionable steps** aligned with each objective.
- Use **existing objectives** from the user input if they meet SMA standards; otherwise, **refine or generate** them logically from the context.
- Ensure a **logical flow** between objectives and tasks.
- Focus exclusively on **grant-appropriate research activities** grounded in the provided data.
- Note: If the context includes research protocol, preserve terminology and variables (species, instruments, etc.) when forming objectives and tasks
    """,
)


RESEARCH_PLAN_REFINEMENT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_plan_refinement",
    template="""
    You are reviewing a draft research plan for the grant application titled "${application_title}".

    ## Draft Research Plan (JSON)
    ${draft}

    ## Research Context
    ${context}

    ## Refinement Requirements
    1. Validate numbering, structure, and coverage of objectives and tasks.
    2. Strengthen clarity, cohesion, and scientific grounding using the context where possible.
    3. Keep 2-3 objectives, each with 2-5 tasks.
    4. Ensure objective descriptions are 100-500 words and task descriptions are 60-375 words.
    5. Adjust titles so they are specific, actionable, and free of fluff.

    Return the final research plan as JSON that matches the required schema exactly.
    """,
)

research_plan_draft_schema = {
    "type": "object",
    "properties": {
        "objectives": {
            "type": "array",
            "description": "Research objectives with tasks",
            "minItems": 2,
            "maxItems": 3,
            "items": {
                "type": "object",
                "properties": {
                    "num": {"type": "integer", "minimum": 1, "maximum": 3},
                    "title": {"type": "string", "minLength": 10, "maxLength": 200},
                    "desc": {"type": "string", "minLength": 50, "maxLength": 500},
                    "tasks": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 5,
                        "items": {
                            "type": "object",
                            "properties": {
                                "num": {"type": "integer", "minimum": 1, "maximum": 5},
                                "title": {"type": "string", "minLength": 10, "maxLength": 200},
                                "desc": {"type": "string", "minLength": 50, "maxLength": 500},
                            },
                            "required": ["num", "title", "desc"],
                        },
                    },
                },
                "required": ["num", "title", "desc", "tasks"],
            },
        },
    },
    "required": ["objectives"],
}

research_plan_refinement_schema = {
    "type": "object",
    "properties": {
        "research_objectives": {
            "type": "array",
            "description": "Array of research objective objects with nested research tasks",
            "minItems": 2,
            "maxItems": 3,
            "items": {
                "type": "object",
                "properties": {
                    "number": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 3,
                        "description": "Sequential number of the objective (1, 2, or 3)",
                    },
                    "title": {
                        "type": "string",
                        "minLength": 10,
                        "maxLength": 200,
                        "description": "Clear, concise title of the research objective",
                    },
                    "description": {
                        "type": "string",
                        "minLength": 200,
                        "maxLength": 2000,
                        "description": "Detailed description of what this objective aims to achieve",
                    },
                    "research_tasks": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 5,
                        "description": "Specific tasks to accomplish this objective",
                        "items": {
                            "type": "object",
                            "properties": {
                                "number": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 5,
                                    "description": "Sequential task number within the objective",
                                },
                                "title": {
                                    "type": "string",
                                    "minLength": 10,
                                    "maxLength": 200,
                                    "description": "Clear, actionable task title",
                                },
                                "description": {
                                    "type": "string",
                                    "minLength": 120,
                                    "maxLength": 1500,
                                    "description": "Detailed description of the task methodology and deliverables",
                                },
                            },
                            "required": ["number", "title", "description"],
                        },
                    },
                },
                "required": ["number", "title", "description", "research_tasks"],
            },
        },
    },
    "required": ["research_objectives"],
}


def _format_existing_objectives(objectives: list[ResearchObjective] | None) -> str:
    if not objectives:
        return "No existing objectives provided."

    lines: list[str] = []
    for objective in objectives:
        title = objective["title"]
        description = objective.get("description", "")
        lines.append(f"- Objective {objective['number']}: {title}")
        if description:
            lines.append(f"  Description: {description}")

        lines.extend(f"    * Task {task['number']}: {task['title']}" for task in objective.get("research_tasks", []))

    return "\n".join(lines)


def _transform_refined_to_db_format(response: ResearchPlanResponse) -> list[ResearchObjective]:
    objectives: list[ResearchObjective] = []

    for obj in response["research_objectives"]:
        tasks = [
            {
                "number": task["number"],
                "title": task["title"],
                "description": task["description"],
            }
            for task in obj["research_tasks"]
        ]

        objectives.append(
            ResearchObjective(
                number=obj["number"],
                title=obj["title"],
                description=obj["description"],
                research_tasks=tasks,  # type: ignore[typeddict-item]
            )
        )

    return objectives


def _validate_research_plan_draft(response: ResearchPlanDraft) -> None:
    objectives = response["objectives"]

    if len(objectives) < 2 or len(objectives) > 3:
        raise ValidationError(
            f"Expected 2-3 research objectives, got {len(objectives)}",
            context={"count": len(objectives)},
        )

    seen_numbers: set[int] = set()
    for i, obj in enumerate(objectives):
        obj_number = obj["num"]

        if obj_number in seen_numbers:
            raise ValidationError(
                f"Duplicate objective number: {obj_number}",
                context={"index": i, "number": obj_number},
            )
        seen_numbers.add(obj_number)

        if len(obj["title"]) < 10:
            raise ValidationError(
                f"Objective {obj_number} title too short (min 10 chars)",
                context={"title": obj["title"], "length": len(obj["title"])},
            )

        description = obj["desc"]
        if len(description) < 50:
            raise ValidationError(
                f"Objective {obj_number} description too short (min 50 chars)",
                context={"description": description[:50], "length": len(description)},
            )

        tasks = obj["tasks"]
        if len(tasks) < 2 or len(tasks) > 5:
            raise ValidationError(
                f"Objective {obj_number} must have 2-5 tasks, got {len(tasks)}",
                context={"count": len(tasks)},
            )

        seen_task_numbers: set[int] = set()
        for task in tasks:
            task_number = task["num"]

            if task_number in seen_task_numbers:
                raise ValidationError(
                    f"Duplicate task number {task_number} in objective {obj_number}",
                    context={"objective": obj_number, "task_number": task_number},
                )
            seen_task_numbers.add(task_number)

            if len(task["title"]) < 10:
                raise ValidationError(
                    f"Objective {obj_number} task {task_number} title too short (min 10 chars)",
                    context={"title": task["title"], "length": len(task["title"])},
                )

            task_description = task["desc"]
            if len(task_description) < 50:
                raise ValidationError(
                    f"Objective {obj_number} task {task_number} description too short (min 50 chars)",
                    context={"description": task_description[:50], "length": len(task_description)},
                )


def _validate_research_plan_refinement(response: ResearchPlanResponse) -> None:
    objectives = response["research_objectives"]

    if len(objectives) < 2 or len(objectives) > 3:
        raise ValidationError(
            f"Expected 2-3 research objectives, got {len(objectives)}",
            context={"count": len(objectives)},
        )

    seen_numbers: set[int] = set()
    for i, obj in enumerate(objectives):
        obj_number = obj["number"]

        if obj_number in seen_numbers:
            raise ValidationError(
                f"Duplicate objective number: {obj_number}",
                context={"index": i, "number": obj_number},
            )
        seen_numbers.add(obj_number)

        if len(obj["title"]) < 10:
            raise ValidationError(
                f"Objective {obj_number} title too short (min 10 chars)",
                context={"title": obj["title"], "length": len(obj["title"])},
            )

        description = obj.get("description", "").strip()
        objective_word_count = len(description.split())
        if objective_word_count < 100 or objective_word_count > 300:
            raise ValidationError(
                f"Objective {obj_number} description should be 100-300 words",
                context={
                    "objective_number": obj_number,
                    "word_count": objective_word_count,
                    "description_preview": description[:100],
                },
            )

        tasks = obj["research_tasks"]
        if len(tasks) < 2 or len(tasks) > 5:
            raise ValidationError(
                f"Objective {obj_number} must have 2-5 tasks, got {len(tasks)}",
                context={"count": len(tasks)},
            )

        seen_task_numbers: set[int] = set()
        for task in tasks:
            task_number = task["number"]

            if task_number in seen_task_numbers:
                raise ValidationError(
                    f"Duplicate task number {task_number} in objective {obj_number}",
                    context={"objective": obj_number, "task_number": task_number},
                )
            seen_task_numbers.add(task_number)

            if len(task["title"]) < 10:
                raise ValidationError(
                    f"Objective {obj_number} task {task_number} title too short (min 10 chars)",
                    context={"title": task["title"], "length": len(task["title"])},
                )

            task_description = task.get("description", "").strip()
            task_word_count = len(task_description.split())
            if task_word_count < 60 or task_word_count > 200:
                raise ValidationError(
                    f"Objective {obj_number} task {task_number} description should be 60-200 words",
                    context={
                        "objective_number": obj_number,
                        "task_number": task_number,
                        "word_count": task_word_count,
                        "description_preview": task_description[:100],
                    },
                )


async def generate_research_plan_content(application: GrantApplication, trace_id: str) -> list[ResearchObjective]:
    existing_objectives_text = _format_existing_objectives(application.research_objectives)
    draft_prompt = RESEARCH_PLAN_DRAFT_PROMPT.substitute(
        application_title=application.title,
        existing_objectives=existing_objectives_text,
    )

    search_queries = await handle_create_search_queries(
        user_prompt=str(draft_prompt), research_objectives=application.research_objectives or None
    )

    retrieval_results = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
        task_description=str(draft_prompt),
        max_tokens=RESEARCH_PLAN_MAX_TOKENS,
        trace_id=trace_id,
    )

    raw_context = "\n".join(retrieval_results)
    compressed_context = compress_text(raw_context, aggressive=True)

    logger.debug(
        "Prepared and compressed context for research plan generation",
        original_context_chars=len(raw_context),
        compressed_context_chars=len(compressed_context),
        existing_objectives_provided=bool(application.research_objectives),
        trace_id=trace_id,
    )

    full_draft_prompt = draft_prompt.to_string(context=compressed_context)

    draft_response: ResearchPlanDraft = await handle_completions_request(
        prompt_identifier="research_plan_draft_generation",
        messages=full_draft_prompt,
        system_prompt=RESEARCH_PLAN_SYSTEM_PROMPT,
        response_schema=research_plan_draft_schema,
        response_type=ResearchPlanDraft,
        validator=_validate_research_plan_draft,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    logger.info(
        "Draft research plan generated",
        objectives_count=len(draft_response["objectives"]),
        trace_id=trace_id,
    )

    refinement_prompt = RESEARCH_PLAN_REFINEMENT_PROMPT.to_string(
        application_title=application.title,
        context=compressed_context,
        draft=serialize(draft_response).decode(),
    )

    refined_response: ResearchPlanResponse = await handle_completions_request(
        prompt_identifier="research_plan_refinement",
        messages=refinement_prompt,
        system_prompt=RESEARCH_PLAN_SYSTEM_PROMPT,
        response_schema=research_plan_refinement_schema,
        response_type=ResearchPlanResponse,
        validator=_validate_research_plan_refinement,
        temperature=0.4,
        trace_id=trace_id,
    )

    logger.info(
        "Refined research plan generated",
        objectives_count=len(refined_response["research_objectives"]),
        trace_id=trace_id,
    )

    return _transform_refined_to_db_format(refined_response)
