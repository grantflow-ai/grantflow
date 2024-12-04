import logging
from asyncio import gather
from collections import defaultdict
from string import Template
from typing import Final

from typing_extensions import TypedDict

from src.db.tables import ResearchAim
from src.rag.application_draft_generation.research_aims import (
    handle_research_aim_text_generation,
)
from src.rag.application_draft_generation.research_tasks import (
    handle_research_task_text_generation,
)
from src.rag.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
)
from src.rag.utils import handle_completions_request
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)

PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are an expert grant application writer integrated into a RAG system.
Your sole task is to analyze and enrich research aims and tasks with their relationships using the provided tool.

Always respond by calling the specified function with the exact JSON format detailed in the instructions.
"""

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
You must respond exclusively by invoking the provided function.
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

RESEARCH_PLAN_SECTION_TEMPLATE: Final[Template] = Template("""
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
###### Task ${task_number}: ${title}

${task_text}
""")


class ToolResponse(TypedDict):
    """The response from the tool call."""

    relations: list[tuple[str, str]]
    """The relations between research aims and tasks."""


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
    "required": [],
}


async def enrich_research_aims_and_tasks_with_relationship_information(
    research_aims: list[ResearchAim],
) -> list[ResearchAim]:
    """Enrich the research aims and tasks with relationship information.

    Args:
        research_aims: The research aims to enrich.

    Returns:
        list[EnrichedResearchAim]: The enriched research aims.
    """
    results = await handle_completions_request(
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
                                "task_number": research_task.task_number,
                            }
                            for research_task in research_aim.research_tasks
                        ],
                    }
                    for research_aim in research_aims
                ]
            )
        ),
        response_type=ToolResponse,  # type: ignore[type-var]
        output_instructions=PARSE_AND_ENRICH_RESEARCH_AIMS_FOR_GENERATION_OUTPUT_INSTRUCTIONS,
        response_schema=response_schema,
    )
    logger.info("Generated relations for research aims: %s", serialize(results))

    relations = defaultdict[str, list[str]](list)
    for relation in results["relations"]:
        relations[relation[0]].append(relation[1])

    for aim in research_aims:
        aim.relations = relations.get(str(aim.aim_number), [])
        for task in aim.research_tasks:
            task.relations = relations.get(task.task_number, [])

    return research_aims


async def handle_research_plan_text_generation(
    *,
    application_id: str,
    research_aims: list[ResearchAim],
) -> str:
    """Generate the text for the research plan.

    Args:
        application_id: The application ID.
        research_aims: The research aims to generate text for.

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
                ),
                gather(
                    *[
                        handle_research_task_text_generation(
                            application_id=application_id,
                            requires_clinical_trials=research_aim.requires_clinical_trials,
                            research_task=research_task,
                        )
                        for index, research_task in enumerate(research_aim.research_tasks)
                    ]
                ),
            ]
        )
        research_aim_texts.append(
            RESEARCH_AIM_TEMPLATE.substitute(
                aim_number=research_aim.aim_number,
                title=research_aim.title,
                aim_text=research_aim_text,
                tasks_text="\n\n".join(
                    RESEARCH_TASK_TEMPLATE.substitute(
                        task_number=research_task.task_number,
                        title=research_task.title,
                        task_text=research_task_text,
                    )
                    for research_task, research_task_text in zip(
                        research_aim.research_tasks, research_tasks_texts, strict=False
                    )
                ),
            )
        )

    return RESEARCH_PLAN_SECTION_TEMPLATE.substitute(research_aims_text="\n\n".join(research_aim_texts))
