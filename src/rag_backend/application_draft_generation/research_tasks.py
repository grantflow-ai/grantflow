import logging
from functools import partial
from json import dumps
from string import Template
from typing import Final, TypedDict

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag_backend.ai_search import retrieve_documents
from src.rag_backend.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag_backend.dto import (
    DocumentDTO,
    GenerationResult,
    ResearchTaskDTO,
)
from src.rag_backend.search_queries import create_search_queries
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)


RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS: Final[str] = """
5. If the task includes randomized groups/interventions, what is the sample size, group/intervention information, and method of sample analysis?
6. If the task involves vertebrate animals/humans, what are the pertinent biological variables (e.g. subject sex, age etc.)?
7. If the task involves hazardous elements, what are the detailed hazard descriptions and planned safety measures and precautions?
8. If the task uses Human Embryonic Stem Cells (hESCs) not in the NIH Registry, what is the justification for non-registered hESC usage?
9. If the task uses Human Fetal Tissue (HFT), what is the necessity of HFT, documentation of alternative evaluation methods, and evidence of alternatives consideration?x

Note that these sections should be added only if they apply to the given research task.
"""

RESEARCH_TASK_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write a research task description.
${previous_part_text}

Use the following sources to write the text:

1. Research Task Data as a JSON object:
    <research_task>
    ${research_task}
    </research_task>

2. Previously generated research tasks:
    <previous_tasks>
    ${previous_tasks}
    </previous_tasks>

3. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

A research task is a specific task within a larger research aim.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
It should address the following implicit questions:

1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?
${clinical_trial_questions}

**IMPORTANT**: If there are any relations between the task and other tasks, mention this explicitly.
E.g. "As was previously seen in task 1.1", "Depending on the result of task 2.3", "Based on the candidates identified in Task 1.2, in task 1.3 we will..."

Ensure that the text is continuous in style, tone and terminology with previous tasks.
Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~300-400 words).
""")

RESEARCH_TASK_QUERIES_PROMPT: Final[Template] = Template("""
A research task is a specific task within a larger research aim. The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
The description should address the following implicit questions:

1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?
${clinical_trial_questions}

Here is the research task data as a JSON object:
    <research_task>
    ${research_task}
    </research_task>
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
        clinical_trial_questions=RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS if requires_clinical_trials else "",
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
    ).strip()

    return await handle_tool_call_request(
        system_prompt=BASE_SYSTEM_PROMPT,
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
            ),
            clinical_trial_questions=RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS
            if requires_clinical_trials
            else "",
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
