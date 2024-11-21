import logging
from asyncio import gather
from json import dumps
from string import Template
from typing import Final, TypedDict

from openai.types.chat import ChatCompletionToolParam
from openai.types.shared_params import FunctionDefinition

from src.rag_backend.application_draft_generation.research_aims import (
    handle_research_aim_text_generation,
)
from src.rag_backend.application_draft_generation.research_tasks import (
    handle_research_task_text_generation,
)
from src.rag_backend.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
)
from src.rag_backend.constants import SLEEP_INCREMENT
from src.rag_backend.dto import (
    EnrichedResearchAimDTO,
    EnrichedResearchTaskDTO,
    NumberedResearchAimDTO,
    NumberedResearchTaskDTO,
    ResearchAimDTO,
)
from src.rag_backend.utils import handle_tool_call_request
from src.utils.sync import delayed_async
from src.utils.text import strip_lines

logger = logging.getLogger(__name__)

PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are an expert grant application writer integrated into a RAG system.
Your sole task is to analyze and enrich research aims and tasks with their relationships using the provided tool.

Always respond by calling the specified function with the exact JSON format detailed in the instructions.
"""


PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to analyze research aims and tasks for a grant application, identifying and describing any relations between them.

Here is the data you will work with:

<numbered_aims_with_tasks>
${numbered_aims_with_tasks}
</numbered_aims_with_tasks>

Your objective is to identify and describe relations between research aims and research tasks:

1. Relations between research aims: Determine if an aim builds upon, depends on, or continues from a previous aim.
2. Relations between tasks within aims: Determine if a task builds upon, depends on, or continues from a previous task either in the same research aim or a preceding research aim.
""")

PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_OUTPUT_INSTRUCTIONS = """
You must respond exclusively by invoking the provided function.
Return a JSON object adhering to the following schema:

```json
{
    "relations": {
        "2": ["Relation description to aim 1", "..."],
        "2.2": ["Relation description to task 1.1", "Another relation description to a different e.g. 1.1", "..."]
    }
}
```

**Important**:
- Only include aims and tasks that have identified relations. I.e. omit those that do not have any relations to other aims or tasks from the response object.
- relation description should be detailed and specific. Make sure to always include the aim or task number. Use phrases such as "Building upon the first aim...", "Depending on the results of aim 1...", or "Based on the candidates identified in Task 1.2, in task 1.3 we will...".
"""

DRAFT_APPLICATION_TEMPLATE: Final[Template] = Template("""
## Research Plan

### Research Aims

${research_aims_text}
""")

RESEARCH_AIM_TEMPLATE: Final[Template] = Template("""
#### Aim ${aim_number}: ${title}

${aim_text}


##### Research Tasks

${tasks_text}
""")

RESEARCH_TASK_TEMPLATE: Final[Template] = Template("""
##### Task ${task_number}: ${title}

${task_text}
""")


class ToolResponse(TypedDict):
    """The response from the tool call."""

    relations: dict[str, list[str]]
    """The relations between research aims and tasks."""


async def enrich_research_aims_and_tasks_with_relationship_information(
    research_aims: list[ResearchAimDTO],
) -> list[EnrichedResearchAimDTO]:
    """Enrich the research aims and tasks with relationship information.

    Args:
        research_aims: The research aims to enrich.

    Returns:
        list[EnrichedResearchAimDTO]: The enriched research aims.
    """
    numbered_aims_with_tasks: list[NumberedResearchAimDTO] = []
    for aims_index, research_aim in enumerate(research_aims):
        aim_number = aims_index + 1
        tasks = [
            NumberedResearchTaskDTO(
                **research_task,
                task_number=f"{aim_number}.{tasks_index + 1}",
            )
            for tasks_index, research_task in enumerate(research_aim["tasks"])
        ]
        numbered_aims_with_tasks.append(
            NumberedResearchAimDTO(
                id=research_aim["id"],
                title=research_aim["title"],
                description=research_aim["description"],
                requires_clinical_trials=research_aim["requires_clinical_trials"],
                aim_number=str(aim_number),
                tasks=tasks,
            )
        )

    results = await handle_tool_call_request(
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_USER_PROMPT.substitute(
            numbered_aims_with_tasks=dumps(numbered_aims_with_tasks)
        ),
        response_type=ToolResponse,  # type: ignore[type-var]
        output_instructions=PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_OUTPUT_INSTRUCTIONS,
        tools=[
            ChatCompletionToolParam(
                type="function",
                function=FunctionDefinition(
                    name="response_handler",
                    parameters={
                        "type": "object",
                        "properties": {
                            "relations": {
                                "type": "object",
                                "additionalProperties": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                        },
                        "required": ["relations"],
                        "additionalProperties": False,
                    },
                ),
            )
        ],
    )
    logger.info("Generated relations for research aims: %s", dumps(results))

    relations = results["relations"]

    return [
        EnrichedResearchAimDTO(
            aim_number=research_aim["aim_number"],
            description=research_aim["description"],
            id=research_aim["id"],
            relations=relations.get(research_aim["aim_number"], []),
            requires_clinical_trials=research_aim["requires_clinical_trials"],
            title=research_aim["title"],
            tasks=[
                EnrichedResearchTaskDTO(
                    **research_task,
                    relations=relations.get(research_task["task_number"], []),
                )
                for research_task in research_aim["tasks"]
            ],
        )
        for research_aim in numbered_aims_with_tasks
    ]


async def handle_research_plan_text_generation(
    *,
    application_id: str,
    research_aims: list[ResearchAimDTO],
    workspace_id: str,
) -> str:
    """Generate the text for the research plan.

    Args:
        application_id: The application ID.
        research_aims: The research aims to generate text for.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the research plan.
    """
    enriched_research_aims = await enrich_research_aims_and_tasks_with_relationship_information(research_aims)
    research_aim_texts: list[str] = []

    for research_aim in enriched_research_aims:
        research_aim_text, research_tasks_texts = await gather(
            *[
                handle_research_aim_text_generation(
                    application_id=application_id,
                    research_aim=research_aim,
                    workspace_id=workspace_id,
                ),
                gather(
                    *[
                        delayed_async(
                            handle_research_task_text_generation(
                                application_id=application_id,
                                requires_clinical_trials=research_aim["requires_clinical_trials"],
                                research_aim_id=research_aim["id"],
                                research_task=research_task,
                                workspace_id=workspace_id,
                            ),
                            index * SLEEP_INCREMENT,
                        )
                        for index, research_task in enumerate(research_aim["tasks"])
                    ]
                ),
            ]
        )
        research_aim_texts.append(
            RESEARCH_AIM_TEMPLATE.substitute(
                aim_number=research_aim["aim_number"],
                title=research_aim["title"],
                aim_text=research_aim_text,
                tasks_text="\n\n".join(
                    RESEARCH_TASK_TEMPLATE.substitute(
                        task_number=research_task["task_number"],
                        title=research_task["title"],
                        task_text=research_task_text,
                    )
                    for research_task, research_task_text in zip(
                        research_aim["tasks"], research_tasks_texts, strict=False
                    )
                ),
            )
        )

    return DRAFT_APPLICATION_TEMPLATE.substitute(research_aims_text=strip_lines("\n\n".join(research_aim_texts)))
