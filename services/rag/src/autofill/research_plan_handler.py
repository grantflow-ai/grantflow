from typing import Final, TypedDict

from packages.db.src.json_objects import ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.autofill.constants import (
    RESEARCH_PLAN_MAX_TOKENS,
    TEMPERATURE,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

logger = get_logger(__name__)


class OptimizedTask(TypedDict):
    num: int
    title: str
    desc: str


class OptimizedObjective(TypedDict):
    num: int
    title: str
    desc: str
    tasks: list[OptimizedTask]


class ResearchPlanResponseOptimized(TypedDict):
    objectives: list[OptimizedObjective]


class ResearchPlanResponse(TypedDict):
    research_objectives: list[ResearchObjective]


RESEARCH_PLAN_SYSTEM_PROMPT: Final[str] = """
You are a specialist in creating research plans for grant applications. Your task is to generate well-structured
research objectives and tasks based on the provided context and uploaded research materials.
"""

RESEARCH_PLAN_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_plan_generation",
    template="""
    Based on the following context, your task is to generate 2-3 research objectives.
    Each objective should include between 2-5 specific research tasks that are concrete and actionable.

    ## Application Title
    ${application_title}

    ## Research Context
    ${context}

    ## Content Requirements
        - Objectives should be specific, measurable, and achievable
        - Tasks should be concrete and actionable steps
        - Use insights from the provided research context
        - Build upon existing objectives if provided
        - Ensure logical flow between objectives
        - Focus on grant-appropriate research activities
    """,
)

research_plan_schema_optimized = {
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

research_plan_schema = {
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
                        "minLength": 50,
                        "maxLength": 500,
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
                                    "minLength": 50,
                                    "maxLength": 500,
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


def _transform_optimized_to_db_format(optimized: ResearchPlanResponseOptimized) -> list[ResearchObjective]:
    objectives: list[ResearchObjective] = []

    for obj in optimized["objectives"]:
        tasks = [
            {
                "number": task["num"],
                "title": task["title"],
                "description": task["desc"],
            }
            for task in obj["tasks"]
        ]

        objectives.append(
            ResearchObjective(
                number=obj["num"],
                title=obj["title"],
                description=obj["desc"],
                research_tasks=tasks,  # type: ignore[typeddict-item]
            )
        )

    return objectives


def _validate_research_plan_response_optimized(response: ResearchPlanResponseOptimized) -> None:
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


def _validate_research_plan_response(response: ResearchPlanResponse) -> None:
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

        description = obj.get("description", "")
        if len(description) < 50:
            raise ValidationError(
                f"Objective {obj_number} description too short (min 50 chars)",
                context={"description": description[:50], "length": len(description)},
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

            task_description = task.get("description", "")
            if len(task_description) < 50:
                raise ValidationError(
                    f"Objective {obj_number} task {task_number} description too short (min 50 chars)",
                    context={"description": task_description[:50], "length": len(task_description)},
                )


async def generate_research_plan_content(application: GrantApplication, trace_id: str) -> list[ResearchObjective]:
    prompt_with_title = RESEARCH_PLAN_USER_PROMPT.substitute(application_title=application.title)

    search_queries = await handle_create_search_queries(
        user_prompt=str(prompt_with_title), research_objectives=application.research_objectives or None
    )

    retrieval_results = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
        task_description=str(prompt_with_title),
        max_tokens=RESEARCH_PLAN_MAX_TOKENS,
        trace_id=trace_id,
    )

    raw_context = "\n".join(retrieval_results)
    compressed_context = compress_prompt_text(raw_context, aggressive=True)

    logger.debug(
        "Prepared and compressed context for research plan generation",
        original_context_chars=len(raw_context),
        compressed_context_chars=len(compressed_context),
        trace_id=trace_id,
    )

    full_prompt = prompt_with_title.to_string(context=compressed_context)

    response_optimized: ResearchPlanResponseOptimized = await handle_completions_request(
        prompt_identifier="research_plan_generation",
        messages=full_prompt,
        system_prompt=RESEARCH_PLAN_SYSTEM_PROMPT,
        response_schema=research_plan_schema_optimized,
        response_type=ResearchPlanResponseOptimized,
        validator=_validate_research_plan_response_optimized,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    return _transform_optimized_to_db_format(response_optimized)
