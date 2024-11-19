import logging
from asyncio import gather
from functools import partial
from json import dumps
from string import Template
from typing import Final

from src.rag_backend.application_draft_generation.research_aims import (
    AimGenerationResponse,
    handle_research_aim_text_generation,
)
from src.rag_backend.application_draft_generation.research_tasks import TaskGenerationResponse
from src.rag_backend.application_draft_generation.shared_prompts import BASE_SYSTEM_PROMPT
from src.rag_backend.dto import GenerationResult, ResearchAimDTO
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)

RESEARCH_AIMS_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to generate the research aims section of a grant application proposal.
${previous_part_text}

Use the results of the previous stages in the RAG pipeline:

<research_aims_and_tasks>
${research_aims_and_tasks}
</research_aims_and_tasks>

Instructions:

1. Consider any relations between a research aim and preceding aims. If there is a relation, e.g. the aim continues, builds, or depends upon a previous aim, mention this explicitly.
E.g. "Building upon the first aim...", "Depending on the results of aim 1...", "Based on the candidates identified in the previous aim..."
2. Consider any relations between a research task and the aim. If there is a relation, e.g. the task continues, builds, or depends upon a previous task, mention this explicitly.
E.g. "As was previously seen in task 1.1", "Depending on the result of task 2.3", "Based on the candidates identified in Task 1.2, in task 1.3 we will..."
3. Do not remove content from the existing texts at all. You can modify the language to ensure better consistency and coherence between the different sections, but do not omit any information, referenced, citations etc.

Example Output:

```markdown
#### Aim 1: Aim 1 Title
Aim Text Here...

##### Research Tasks

###### Task 1.1: Task 1.1 Title
Task 1.1 Text Here...

###### Task 1.2: Task 1.2 Title
Task 1.2 Text Here...

#### Aim 2: Aim 2 Title
Aim Text Here...

###### Task 2.1: Task 2.1 Title
Task 2.1 Text Here...
```

""")


async def generate_research_plan_text(
    previous_part_text: str | None,
    *,
    research_aims_and_tasks: list[
        tuple[
            AimGenerationResponse,
            list[TaskGenerationResponse],
        ]
    ],
) -> GenerationResult:
    """Generate the text for the research plan.

    Args:
        previous_part_text: The previous part of the research plan text, if any.
        research_aims_and_tasks: The research aims and tasks to generate text for.

    Returns:
        The generated text for the research plan.
    """
    user_prompt = RESEARCH_AIMS_GENERATION_USER_PROMPT.substitute(
        research_aims_and_tasks=dumps(research_aims_and_tasks), previous_part_text=previous_part_text
    ).strip()

    return await handle_tool_call_request(
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
    )


async def generate_research_plan(
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
    research_aims_and_tasks: list[
        tuple[
            AimGenerationResponse,
            list[TaskGenerationResponse],
        ]
    ] = await gather(
        *[
            handle_research_aim_text_generation(
                aim_number=index + 1,
                application_id=application_id,
                research_aim=research_aim,
                workspace_id=workspace_id,
            )
            for index, research_aim in enumerate(research_aims)
        ]
    )

    prompt_handler = partial(generate_research_plan_text, research_aims_and_tasks=research_aims_and_tasks)

    return await handle_segmented_text_generation(
        entity_type="research plan",
        entity_identifier=application_id,
        prompt_handler=prompt_handler,
    )
