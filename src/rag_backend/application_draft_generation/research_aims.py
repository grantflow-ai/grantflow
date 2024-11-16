import logging
from functools import partial
from json import dumps
from string import Template
from typing import Final, TypedDict

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag_backend.ai_search import retrieve_documents
from src.rag_backend.application_draft_generation.research_tasks import (
    TaskGenerationResponse,
    handle_research_task_text_generation,
)
from src.rag_backend.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag_backend.dto import (
    DocumentDTO,
    GenerationResult,
    ResearchAimDTO,
)
from src.rag_backend.search_queries import create_search_queries
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)

RESEARCH_AIM_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write a research aim description.
${previous_part_text}

Use the following sources to write the text:

1. Research Aim Data as a JSON object:
    <research_aim>
    ${research_aim}
    </research_aim>

2. Previously generated research aims as a JSON array:
    <previous_aims>
    ${previous_aims}
    </previous_aims>

3. Research Tasks included in this Aim as a JSON array:
    <research_tasks>
    ${research_tasks}
    </research_tasks>

4. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

A research aim or research objective is an overarching goal that the research aims to achieve.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
It should address the following implicit questions:

1. What is the working hypothesis?
2. What are the general goals of the aim?
3. What is the methodology employed?
4. What are the expected results?

__NOTE__: Methodology is an optional sub-section. It should be included only if a similar methodology is used in all research tasks

**IMPORTANT**: If there are any relations between the aim and other aims, mention this explicitly.
E.g. "Building upon the first aim...", "Depending on the results of aim 1...", "Based on the candidates identified in the previous aim..."

Ensure that the text is continuous in style, tone and terminology with previous tasks.
Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~300-400 words).
""")

RESEARCH_AIM_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to write a description for a research aim.
A research aim or research objective is an overarching goal that the research seeks to achieve.
The description should address the following implicit questions:

1. What is the working hypothesis?
2. What are the general goals of the aim?
3. What is the methodology employed?
4. What are the expected results?

Here is the research task data as a JSON object:
    <research_aim>
    ${research_aim}
    </research_aim>
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
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        research_tasks=dumps(research_tasks),
    ).strip()

    return await handle_tool_call_request(
        system_prompt=BASE_SYSTEM_PROMPT,
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
    research_aim_id = research_aim["id"]
    for index, research_task in enumerate(research_aim["tasks"]):
        research_tasks.append(
            await handle_research_task_text_generation(
                application_id=application_id,
                previous_tasks=[*previous_tasks, *research_tasks],
                requires_clinical_trials=research_aim["requires_clinical_trials"],
                research_aim_id=research_aim_id,
                research_task=research_task,
                research_task_number=f"{aim_number}.{index + 1}",
                workspace_id=workspace_id,
            )
        )

    search_queries = await create_search_queries(
        RESEARCH_AIM_QUERIES_PROMPT.substitute(research_aim=dumps(research_aim)),
    )
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_PARENT_ID} eq '{research_aim_id}' or {FIELD_NAME_PARENT_ID} eq '{application_id}')"

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
