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
from src.rag_backend.dto import (
    DocumentDTO,
    GenerationResult,
    ResearchTaskDTO,
)
from src.rag_backend.search_queries import create_search_queries
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)

INPUTS_DESCRIPTION = """
## Inputs
You will be given a JSON object that contains the task number, title and (optional) description of a research task. Example:

```jsonc
{
    "task_number": "1.2" // a string always following the format 'x.y' where x is the research aim number, y is the task number.
    "title": "The title of the research task",
    "description": "The description of the research task"
}
```

You will also receive an array of objects containing the task number and text of the research tasks preceding the current research task, if any. Example:

```jsonc
[
    {
        "task_number": "1.2",
        "text": "The text content of the research task"
    }
]
```
"""

RESEARCH_TASK_WRITING_INSTRUCTIONS: Final[str] = """
## Instructions

Your task is to write a detailed research task description that is between 200-400 words long.
${part_generation_instructions}
A research task is a specific research task within a larger research aim.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART). It should cover the following aspects:

- Task goal and objectives
- Experimental design methodology
- Data collection methods
- Results analysis and interpretation framework
${clinical_trial_questions}

**IMPORTANT**: If there are any relations between the task and other tasks, mention this explicitly.
E.g. "As was previously seen in task 1.1", "Depending on the result of task 2.3", "Based on the candidates identified in Task 1.2, in task 1.3 we will..."

The generated text should not contain any headings. It should be a continuous text without bullet points, lists or tables.
"""

RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS: Final[str] = """
If the task includes randomized groups/interventions, what is the sample size, group/intervention information, and method of sample analysis?
If the task involves vertebrate animals/humans, what are the pertinent biological variables (e.g. subject sex, age etc.)?
If the task involves hazardous elements, what are the detailed hazard descriptions and planned safety measures and precautions?
If the task uses Human Embryonic Stem Cells (hESCs) not in the NIH Registry, what is the justification for non-registered hESC usage?
If the task uses Human Fetal Tissue (HFT), what is the necessity of HFT, documentation of alternative evaluation methods, and evidence of alternatives consideration?x

Note that these sections should be added only if they apply to the given research task.
"""

RESEARCH_TASK_GENERATION_SYSTEM_PROMPT: Final[Template] = Template(
    dedent(f"""
    {BASE_SYSTEM_PROMPT}
    {INPUTS_DESCRIPTION}
    {RAG_RETRIEVAL_INPUT_EXAMPLE}
    {RESEARCH_TASK_WRITING_INSTRUCTIONS}
    """).strip()
)

RESEARCH_TASK_GENERATION_USER_PROMPT: Final[Template] = Template("""
Here is the research task data as JSON:

```json
${research_task}
```

This is a full text of the research tasks that have been generated so far as a JSON array:
```json
${previous_tasks}
```

These are the results of the RAG retrieval provided as a JSON array:

```json
${rag_results}
```
${previous_part_text}
""")

RESEARCH_TASK_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to write a description for a research task.
This description should cover the following aspects:

- Task goal and objectives
- Experimental design methodology
- Data collection methods
- Results analysis and interpretation framework

The task data is provided as a JSON object:

```json
${research_task}
```
""")


class TaskGenerationResponse(TypedDict):
    """The response returned by the prompt logic."""

    title: str
    """The title of the research task."""
    text: str
    """The generated text."""
    task_number: str
    """The task number."""


async def generate_research_task_text(
    previous_part_text: str | None,
    *,
    previous_tasks: list[TaskGenerationResponse],
    requires_clinical_trials: bool,
    research_task: ResearchTaskDTO,
    research_task_number: str,
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a part of the research task text.

    Args:
        previous_part_text: The previous part of the research task text, if any.
        previous_tasks: The previous research tasks.
        requires_clinical_trials: Whether the research task includes clinical trials.
        research_task: The research task to generate text for.
        research_task_number: A string representing the research task number in format 1.2, 2.3, etc.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResult: The generated text for the research aim.
    """
    system_prompt = RESEARCH_TASK_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
        clinical_trial_questions=RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS if requires_clinical_trials else "",
    ).strip()

    user_prompt = RESEARCH_TASK_GENERATION_USER_PROMPT.substitute(
        research_task=dumps(
            {
                "task_number": research_task_number,
                "title": research_task["title"],
                "description": research_task["description"],
            }
        ),
        rag_results=dumps(retrieval_results),
        previous_tasks=dumps(previous_tasks),
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def handle_research_task_text_generation(
    *,
    application_id: str,
    previous_tasks: list[TaskGenerationResponse],
    requires_clinical_trials: bool,
    research_aim_id: str,
    research_task: ResearchTaskDTO,
    research_task_number: str,
    workspace_id: str,
) -> TaskGenerationResponse:
    """Generate the text for a research task.

    Args:
        application_id: The application ID.
        previous_tasks: The previous research tasks.
        requires_clinical_trials: Whether the research task includes clinical trials.
        research_aim_id: The ID of the research aim.
        research_task: The research task to generate text for.
        research_task_number: A string representing the research task number in format 1.2, 2.3, etc.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the research task.
    """
    search_queries = await create_search_queries(
        RESEARCH_TASK_QUERIES_PROMPT.substitute(
            research_task=dumps(
                {
                    "task_number": research_task_number,
                    "title": research_task["title"],
                    "description": research_task["description"],
                }
            )
        ),
    )
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_PARENT_ID} eq '{research_task['id']}' or {FIELD_NAME_PARENT_ID} eq '{research_aim_id}' or {FIELD_NAME_PARENT_ID} eq '{application_id}')"

    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_research_task_text,
        previous_tasks=previous_tasks,
        requires_clinical_trials=requires_clinical_trials,
        research_task=research_task,
        research_task_number=research_task_number,
        retrieval_results=search_result,
    )

    result = await handle_segmented_text_generation(
        entity_type="research_task",
        entity_identifier=research_task["id"],
        prompt_handler=handler,
    )

    logger.info("Generated research task %s", result)
    return TaskGenerationResponse(
        title=research_task["title"],
        text=result,
        task_number=research_task_number,
    )
