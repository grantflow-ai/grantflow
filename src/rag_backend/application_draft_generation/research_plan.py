import logging
from functools import partial
from json import dumps
from string import Template
from textwrap import dedent
from typing import Final

from src.rag_backend.application_draft_generation.research_aims import (
    AimGenerationResponse,
    handle_research_aim_text_generation,
)
from src.rag_backend.application_draft_generation.research_tasks import (
    TaskGenerationResponse,
    handle_research_task_text_generation,
)
from src.rag_backend.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag_backend.dto import GenerationResult, ResearchAimDTO
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request
from src.utils.sync import gather_with_delay

logger = logging.getLogger(__name__)

RESEARCH_AIM_SECTION_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to write the research aim number ${research_aim_number} section of the grant application.

The title of this research aim is: ${research_aim_title}

Your task is the write a continuous, cohesive text that describes the research aim and the research tasks that are part of this aim.
${previous_part_text}

Use the following sources to write the text:

1. The research aim data as JSON:
    <research_aim_data>
    ${research_aim_data}
    </research_aim_data>

2. The research tasks that are part of this aim as a JSON array:
    <research_tasks_data>
    ${research_tasks_data}
    </research_tasks_data>

3. The text of previous research aims and their tasks (if any) texts:
    <previous_aims_texts>
    ${previous_aims_texts}
    </previous_aims_texts>

**Important**:

The aim and tasks texts that are part of 1 and 2 above are already full texts that include all the required information.
Adjust these texts only if necessary to ensure better consistency and coherence between the different sections.
The texts though are missing some information that you need to add, if they apply in your judgement:

1. Consider any relations between a research aim and preceding aims. If there is a relation, e.g. the aim continues, builds, or depends upon a previous aim, mention this explicitly.
E.g. "Building upon the first aim...", "Depending on the results of aim 1...", "Based on the candidates identified in the previous aim..."
2. Consider any relations between a research task and the aim. If there is a relation, e.g. the task continues, builds, or depends upon a previous task, mention this explicitly.
E.g. "As was previously seen in task 1.1", "Depending on the result of task 2.3", "Based on the candidates identified in Task 1.2, in task 1.3 we will..."

Example Output:

```markdown
#### Aim <aim number>: <aim title>
Full aim text here.

##### Research Tasks

###### Task <task number>: <task title>
Full task text here.

###### Task <task number>: <task title>
Full task text here.

...
```
""")


async def generate_research_plan_text(
    previous_part_text: str | None,
    *,
    previous_aims_texts: list[str],
    research_aim_data: AimGenerationResponse,
    research_aim_number: int,
    research_aim_title: str,
    research_tasks_data: list[TaskGenerationResponse],
) -> GenerationResult:
    """Generate the text for the research plan.

    Args:
        previous_part_text: The previous part of the research plan text, if any.
        previous_aims_texts: The texts of the previous research aims.
        research_aim_data: The data for the research aim.
        research_aim_number: The number of the research aim.
        research_aim_title: The title of the research aim.
        research_tasks_data: The data for the research tasks.

    Returns:
        The generated text for the research plan.
    """
    user_prompt = RESEARCH_AIM_SECTION_GENERATION_USER_PROMPT.substitute(
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        research_aim_number=research_aim_number,
        research_aim_data=dumps(research_aim_data),
        research_tasks_data=dumps(research_tasks_data),
        previous_aims_texts=",".join(previous_aims_texts),
        research_aim_title=research_aim_title,
    ).strip()

    return await handle_tool_call_request(system_prompt=BASE_SYSTEM_PROMPT, user_prompt=user_prompt)


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
    research_aim_texts: list[str] = []

    for index, research_aim in enumerate(research_aims):
        aim_number = index + 1
        aim_response = await handle_research_aim_text_generation(
            aim_number=aim_number,
            application_id=application_id,
            research_aim=research_aim,
            workspace_id=workspace_id,
        )
        research_tasks = await gather_with_delay(
            *[
                handle_research_task_text_generation(
                    application_id=application_id,
                    requires_clinical_trials=research_aim["requires_clinical_trials"],
                    research_aim_id=research_aim["id"],
                    research_task=research_task,
                    research_task_number=f"{aim_number}.{index + 1}",
                    workspace_id=workspace_id,
                )
                for index, research_task in enumerate(research_aim["tasks"])
            ]
        )

        prompt_handler = partial(
            generate_research_plan_text,
            research_aim_data=aim_response,
            research_tasks_data=research_tasks,
            previous_aims_texts=research_aim_texts,
            research_aim_number=aim_number,
            research_aim_title=research_aim["title"],
        )

        research_aim_texts.append(
            await handle_segmented_text_generation(
                entity_type="research plan",
                entity_identifier=application_id,
                prompt_handler=prompt_handler,
            )
        )

    return dedent("\n\n".join(research_aim_texts))
