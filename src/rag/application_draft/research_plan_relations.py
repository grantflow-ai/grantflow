from collections import defaultdict
from string import Template
from typing import Final, TypedDict

from src.db.tables import ResearchAim
from src.rag.application_draft.dto import ResearchAimDTO, ResearchTaskDTO
from src.rag.application_draft.shared_prompts import BASE_SYSTEM_PROMPT
from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)


PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to analyze research aims and tasks for a grant application, identifying and describing any relations between them.

Here is the data you will work with:

<aims>
${aims}
</aims>

Your objective is to identify and describe relations between research aims and research tasks:

1. Relations between research aims: Determine if an aim builds upon, depends on, or continues from a previous aim.
2. Relations between tasks within aims: Determine if a task builds upon, depends on, or continues from a previous task either in the same research aim or a preceding research aim.
""")

PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_OUTPUT_INSTRUCTIONS = """
You must respond by invoking the provided function.
Return a JSON object adhering to the following format:

```json
{
    "relations": [["2", "Building upon the first aim..."], ["2.2", "Based on the candidates identified in Task 1.2, in task 1.3 we will..."]]
}
```

**Relations**:
- The relations array is a matrix, where each sub-array has two elements.
- The first element is the aim or task number.
- The second element is a detailed description of the relation between the aim or task and its predecessor.

**Important**:
- Only include aims and tasks that have identified relations. I.e. omit those that do not have any relations to other aims or tasks from the response object.
- relation description should be detailed and specific. Make sure to always include the aim or task number. Use phrases such as "Building upon the first aim...", "Depending on the results of aim 1...", or "Based on the candidates identified in Task 1.2, in task 1.3 we will...".
"""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    relations: list[tuple[str, str]]
    """The relations between research aims and tasks as a list of [identifier, description] pairs."""


response_schema = {
    "type": "object",
    "properties": {
        "relations": {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
    },
    "required": ["relations"],
}


async def set_relation_data(research_aims: list[ResearchAim]) -> list[ResearchAimDTO]:
    """Enrich the research aims and tasks with relationship information.

    Args:
        research_aims: The research aims to enrich.

    Returns:
        The enriched research aims and tasks.
    """
    result = await handle_completions_request(
        prompt_identifier="identify_relations",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_USER_PROMPT.substitute(
            aims=serialize(
                [
                    {
                        "title": research_aim.title,
                        "description": research_aim.description,
                        "aim_number": research_aim.aim_number,
                        "tasks": [
                            {
                                "title": research_task.title,
                                "description": research_task.description,
                                "task_number": f"{research_aim.aim_number}.{research_task.task_number}",
                            }
                            for research_task in research_aim.research_tasks
                        ],
                    }
                    for research_aim in sorted(research_aims, key=lambda x: x.aim_number)
                ]
            )
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
        output_instructions=PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_OUTPUT_INSTRUCTIONS,
    )
    logger.info("Generated relations for research aims and tasks")

    relations = defaultdict[str, list[str]](list)
    for identifier, relations_list in result.response["relations"]:
        relations[identifier].append(relations_list)

    return [
        ResearchAimDTO(
            id=str(research_aim.id),
            aim_number=research_aim.aim_number,
            title=research_aim.title,
            description=research_aim.description,
            requires_clinical_trials=research_aim.requires_clinical_trials,
            relations=relations.get(str(research_aim.aim_number), []),
            preliminary_results=research_aim.preliminary_results,
            risks_and_alternatives=research_aim.risks_and_alternatives,
            research_tasks=[
                ResearchTaskDTO(
                    id=str(research_task.id),
                    task_number=f"{research_aim.aim_number}.{research_task.task_number}",
                    title=research_task.title,
                    description=research_task.description,
                    relations=relations.get(f"{research_aim.aim_number}.{research_task.task_number}", []),
                )
                for research_task in research_aim.research_tasks
            ],
        )
        for research_aim in research_aims
    ]
