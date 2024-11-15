import logging
from functools import partial
from json import dumps
from string import Template
from textwrap import dedent
from typing import Final, TypedDict

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag_backend.ai_search import retrieve_documents
from src.rag_backend.application_draft_generation.prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
    RAG_RETRIEVAL_INPUT_EXAMPLE,
)
from src.rag_backend.application_draft_generation.research_tasks import (
    TaskGenerationResponse,
    handle_research_task_text_generation,
)
from src.rag_backend.dto import (
    DocumentDTO,
    GenerationResult,
    ResearchAimDTO,
)
from src.rag_backend.search_queries import create_search_queries
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)

INPUTS_DESCRIPTION = """
## Inputs
You will be given a JSON object that contains the aim number, its title and (optional) description of a research aim. Example:

```json
{
    "aim_number": 1, // an integer representing the research aim number
    "title": "The title of the research aim",
    "description": "The description of the research aim"
}
```

You will also receive an array of objects containing the aim number and text of the research aims preceding the current research aim, if any. Example:

```jsonc
[
    {
        "aim_number": 1,
        "text": "The text content of the first research aim"
    }
]
```

You will also receive an array of objects containing the task number and text of the research tasks that are part of this research aim. Example:

```jsonc
[
    {
        "task_number": "1.1", // A string in the format x.y where x is the aim number and y is the task number.
        "text": "The text of the first research task in this research aim"
    },
    {
        "task_number": "1.2",
        "text": "The text of the second research task in this research aim"
    }
    // ... can have more tasks
]
```
"""

RESEARCH_AIM_WRITING_INSTRUCTIONS: Final[str] = """
Your task is to write a detailed research aim description that is between 200-400 words long.
${part_generation_instructions}
A research aim or research objective is an overarching goal that the research aims to achieve.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART). It should cover the following aspects:

- The working hypothesis and general goals of the aim
- The methodology
- The expected results

__NOTE__: Methodology is an optional sub-section. It should be included only if a similar methodology is used in all research tasks

**IMPORTANT**: If there are any relations between the aim and other aims, mention this explicitly.
E.g. "Building upon the first aim...", "Depending on the results of aim 1...", "Based on the candidates identified in the previous aim..."

Example:

```markdown

### Title of the Research Aim

2-3 paragraphs explaining the working hypothesis and general goals of the research aim.

e.g. "This research aim will be to investigate the role of...", "We aim to develop a novel method for...", "This research aim will focus on..."

### Methodology: (optional)
2-3 paragraphs detailing the methods used in all/most research tasks

#### Expected Results

2-3 paragraphs explaining the expected results of the research aim.
```
"""

RESEARCH_AIM_GENERATION_SYSTEM_PROMPT: Final[Template] = Template(
    dedent(f"""
    {BASE_SYSTEM_PROMPT}
    {INPUTS_DESCRIPTION}
    {RAG_RETRIEVAL_INPUT_EXAMPLE}
    {RESEARCH_AIM_WRITING_INSTRUCTIONS}
""").strip()
)

RESEARCH_AIM_GENERATION_USER_PROMPT: Final[Template] = Template("""
Here is the research aim data as JSON:

```json
${research_aim}
```

This is a full text of the research aims that have been generated so far as a JSON array:
```json
${previous_aims}
```

This is a full text of the research tasks included in this Aim as a JSON array:

```json
${research_tasks}
```

These are the results of the RAG retrieval provided as a JSON array:

```json
${rag_results}
```
${previous_part_text}
""")

RESEARCH_AIM_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to write a description for a research aim.
A research aim or research objective is an overarching goal that the research seeks to achieve.
The description should cover the following aspects:

- The working hypothesis and general goals of the aim
- The methodology
- The expected results

The aim data is provided as a JSON object:

```json
${research_aim}
```
""")


class AimGenerationResponse(TypedDict):
    """The response returned by the prompt logic."""

    title: str
    """The title of the research aim."""
    text: str
    """The generated text."""
    aim_number: int
    """The aim number."""


async def generate_research_aim_text(
    previous_part_text: str | None,
    *,
    aim_number: int,
    previous_aims: list[AimGenerationResponse],
    research_aim: ResearchAimDTO,
    research_tasks: list[TaskGenerationResponse],
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a part of the research aim text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        aim_number: The number of the research aim.
        previous_aims: The previous research aims.
        research_aim: The research aim to generate text for.
        research_tasks: The generated research
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResult: The generated text for the research aim.
    """
    system_prompt = RESEARCH_AIM_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = RESEARCH_AIM_GENERATION_USER_PROMPT.substitute(
        research_aim=dumps(
            {
                "aim_number": aim_number,
                "title": research_aim["title"],
                "description": research_aim["description"],
            }
        ),
        previous_aims=dumps(previous_aims),
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
        research_tasks=dumps(research_tasks),
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def handle_research_aim_text_generation(
    *,
    aim_number: int,
    application_id: str,
    previous_aims: list[AimGenerationResponse],
    previous_tasks: list[TaskGenerationResponse],
    research_aim: ResearchAimDTO,
    workspace_id: str,
) -> tuple[AimGenerationResponse, list[TaskGenerationResponse]]:
    """Generate the text for a research aim.

    Args:
        aim_number: The number of the research aim.
        application_id: The application ID.
        previous_aims: The previous research aims.
        previous_tasks: The previous research tasks.
        research_aim: The research aim to generate text for.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the research aim.
    """
    research_tasks: list[TaskGenerationResponse] = []
    for index, research_task in enumerate(research_aim["tasks"]):
        research_tasks.append(
            await handle_research_task_text_generation(
                application_id=application_id,
                previous_tasks=[*previous_tasks, *research_tasks],
                requires_clinical_trials=research_aim["requires_clinical_trials"],
                research_aim_id=research_aim["id"],
                research_task=research_task,
                research_task_number=f"{aim_number}.{index + 1}",
                workspace_id=workspace_id,
            )
        )

    search_queries = await create_search_queries(
        RESEARCH_AIM_QUERIES_PROMPT.substitute(research_aim=dumps(research_aim)),
    )
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_PARENT_ID} eq '{research_aim["id"]}' or {FIELD_NAME_PARENT_ID} eq '{application_id}')"

    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_research_aim_text,
        aim_number=aim_number,
        previous_aims=previous_aims,
        research_aim=research_aim,
        retrieval_results=search_result,
        research_tasks=research_tasks,
    )

    result = await handle_segmented_text_generation(
        entity_type="research_aim",
        entity_identifier=research_aim["id"],
        prompt_handler=handler,
    )
    logger.info("Generated research aim %s", result)

    return AimGenerationResponse(
        text=result,
        aim_number=aim_number,
        title=research_aim["title"],
    ), research_tasks


async def generate_research_plan(
    *,
    application_id: str,
    research_aims: list[ResearchAimDTO],
    workspace_id: str,
) -> str:
    """Generate a research plan for a grant application.

    Args:
        application_id: The application ID.
        research_aims: A list of research aims to include in the research plan.
        workspace_id: The workspace ID.

    Returns:
        The generated research plan.
    """
    generation_output: list[
        tuple[
            AimGenerationResponse,
            list[TaskGenerationResponse],
        ]
    ] = []

    for index, research_aim in enumerate(research_aims):
        generation_output.append(
            await handle_research_aim_text_generation(
                aim_number=index + 1,
                application_id=application_id,
                previous_aims=[aim for aim, _ in generation_output],
                previous_tasks=[task for _, tasks in generation_output for task in tasks],
                research_aim=research_aim,
                workspace_id=workspace_id,
            )
        )

    research_plan_section_text = dedent("""
    ## Research Plan
    ### Research Aims
    """)

    for aim, tasks in generation_output:
        research_plan_section_text += f"""
        #### Aim {aim["aim_number"]}: {aim["title"]}
        {aim["text"]}
        """
        for task in tasks:
            research_plan_section_text += f"""
            ##### Task {task["task_number"]}: {task["title"]}
            {task["text"]}
            """

    return research_plan_section_text
