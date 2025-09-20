from typing import Any, Final, TypedDict

from packages.db.src.json_objects import ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.autofill.constants import (
    RESEARCH_PLAN_MAX_TOKENS,
    TEMPERATURE,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

logger = get_logger(__name__)


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


def _validate_objective_fields(obj: dict[str, Any], obj_number: int) -> None:
    if "title" not in obj or not obj["title"]:
        raise ValidationError(f"Objective {obj_number} missing or empty 'title'")

    if len(obj["title"]) < 10:
        raise ValidationError(
            f"Objective {obj_number} title too short (min 10 chars)",
            context={"title": obj["title"], "length": len(obj["title"])},
        )

    if "description" not in obj or not obj["description"]:
        raise ValidationError(f"Objective {obj_number} missing or empty 'description'")

    if len(obj["description"]) < 50:
        raise ValidationError(
            f"Objective {obj_number} description too short (min 50 chars)",
            context={"description": obj["description"][:50], "length": len(obj["description"])},
        )


def _validate_research_tasks(obj: dict[str, Any], obj_number: int) -> None:
    if "research_tasks" not in obj:
        raise ValidationError(f"Objective {obj_number} missing 'research_tasks'")

    tasks = obj["research_tasks"]
    if not isinstance(tasks, list):
        raise ValidationError(
            f"Objective {obj_number} research_tasks must be a list",
            context={"type": type(tasks).__name__},
        )

    if len(tasks) < 2 or len(tasks) > 5:
        raise ValidationError(
            f"Objective {obj_number} must have 2-5 tasks, got {len(tasks)}",
            context={"count": len(tasks)},
        )

    seen_task_numbers = set()
    for j, task in enumerate(tasks):
        if not isinstance(task, dict):
            raise ValidationError(
                f"Objective {obj_number} task {j + 1} must be a dictionary",
                context={"type": type(task).__name__},
            )

        if "number" not in task:
            raise ValidationError(f"Objective {obj_number} task {j + 1} missing 'number'")

        task_number = task["number"]
        if not isinstance(task_number, int) or task_number < 1 or task_number > 5:
            raise ValidationError(
                f"Task number must be an integer between 1 and 5, got {task_number}",
                context={"objective": obj_number, "task_index": j, "number": task_number},
            )

        if task_number in seen_task_numbers:
            raise ValidationError(
                f"Duplicate task number {task_number} in objective {obj_number}",
                context={"objective": obj_number, "task_number": task_number},
            )
        seen_task_numbers.add(task_number)

        if "title" not in task or not task["title"]:
            raise ValidationError(f"Objective {obj_number} task {task_number} missing or empty 'title'")

        if len(task["title"]) < 10:
            raise ValidationError(
                f"Objective {obj_number} task {task_number} title too short (min 10 chars)",
                context={"title": task["title"], "length": len(task["title"])},
            )

        if "description" not in task or not task["description"]:
            raise ValidationError(f"Objective {obj_number} task {task_number} missing or empty 'description'")

        if len(task["description"]) < 50:
            raise ValidationError(
                f"Objective {obj_number} task {task_number} description too short (min 50 chars)",
                context={"description": task["description"][:50], "length": len(task["description"])},
            )


def _validate_objective_number(obj: dict[str, Any], i: int, seen_numbers: set[int]) -> int:
    if "number" not in obj:
        raise ValidationError(f"Objective {i + 1} missing 'number' field")

    obj_number = obj["number"]
    if not isinstance(obj_number, int) or obj_number < 1 or obj_number > 3:
        raise ValidationError(
            f"Objective number must be an integer between 1 and 3, got {obj_number}",
            context={"index": i, "number": obj_number},
        )

    if obj_number in seen_numbers:
        raise ValidationError(
            f"Duplicate objective number: {obj_number}",
            context={"index": i, "number": obj_number},
        )
    seen_numbers.add(obj_number)
    return obj_number


def _validate_research_plan_response(response: Any) -> None:
    if not isinstance(response, dict):
        raise ValidationError(
            "Response must be a dictionary",
            context={"type": type(response).__name__},
        )

    if "research_objectives" not in response:
        raise ValidationError("Missing 'research_objectives' in response")

    objectives = response["research_objectives"]
    if not isinstance(objectives, list):
        raise ValidationError(
            "research_objectives must be a list",
            context={"type": type(objectives).__name__},
        )

    if len(objectives) < 2 or len(objectives) > 3:
        raise ValidationError(
            f"Expected 2-3 research objectives, got {len(objectives)}",
            context={"count": len(objectives)},
        )

    seen_numbers: set[int] = set()
    for i, obj in enumerate(objectives):
        if not isinstance(obj, dict):
            raise ValidationError(
                f"Objective {i + 1} must be a dictionary",
                context={"type": type(obj).__name__, "index": i},
            )

        obj_number = _validate_objective_number(obj, i, seen_numbers)
        _validate_objective_fields(obj, obj_number)

        _validate_research_tasks(obj, obj_number)


async def generate_research_plan_content(application: GrantApplication, trace_id: str) -> list[ResearchObjective]:
    logger.info(
        "Starting research plan generation",
        application_id=application.id,
        application_title=application.title,
        trace_id=trace_id,
    )

    prompt_with_title = RESEARCH_PLAN_USER_PROMPT.substitute(application_title=application.title)
    search_queries = await handle_create_search_queries(user_prompt=str(prompt_with_title))

    retrieval_results = await retrieve_documents(
        application_id=application.id,
        search_queries=search_queries,
        task_description=str(prompt_with_title),
        max_tokens=RESEARCH_PLAN_MAX_TOKENS,
    )

    logger.debug("Retrieved documents", application_id=application.id, documents_count=len(retrieval_results), trace_id=trace_id)

    prompt = prompt_with_title.to_string(context="\n".join(retrieval_results))

    response = await handle_completions_request(
        prompt_identifier="research_plan_generation",
        messages=prompt,
        system_prompt=RESEARCH_PLAN_SYSTEM_PROMPT,
        response_schema=research_plan_schema,
        response_type=ResearchPlanResponse,
        validator=_validate_research_plan_response,
        temperature=TEMPERATURE,
    )

    return response["research_objectives"]
