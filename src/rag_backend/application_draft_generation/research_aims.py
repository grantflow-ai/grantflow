import logging
from functools import partial
from json import dumps
from string import Template
from typing import Final

from src.constants import FIELD_NAME_APPLICATION_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag_backend.ai_search import retrieve_documents
from src.rag_backend.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag_backend.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.rag_backend.dto import (
    DocumentDTO,
    EnrichedResearchAimDTO,
    GenerationResult,
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

2. The titles of the research tasks that are included in this Aim:
    <research_tasks>
    ${research_task_titles}
    </research_tasks>

3. RAG Retrieval Results for additional context as a JSON array:
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

**Important**: The research aim JSON object includes an array of relations with other research aims. If the array is not empty, make sure to include
a detailed description of these relations in the text.

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


async def generate_research_aim_text(
    previous_part_text: str | None,
    *,
    research_aim: EnrichedResearchAimDTO,
    research_task_titles: list[str],
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a part of the research aim text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim: The research aim to generate text for.
        research_task_titles: The titles of the research tasks that are included in this aim.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResult: The generated text for the research aim.
    """
    user_prompt = RESEARCH_AIM_GENERATION_USER_PROMPT.substitute(
        research_aim=dumps(research_aim),
        rag_results=dumps(retrieval_results),
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        research_task_titles=",".join(research_task_titles),
    ).strip()

    return await handle_tool_call_request(
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )


async def handle_research_aim_text_generation(
    *,
    application_id: str,
    research_aim: EnrichedResearchAimDTO,
    workspace_id: str,
) -> str:
    """Generate the text for a research aim.

    Args:
        application_id: The application ID.
        research_aim: The research aim to generate text for.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the research aim.
    """
    research_aim_id = research_aim["id"]
    research_task_titles = [research_task["title"] for research_task in research_aim["tasks"]]

    search_queries = await create_search_queries(
        RESEARCH_AIM_QUERIES_PROMPT.substitute(research_aim=dumps(research_aim)),
    )
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_APPLICATION_ID} eq '{research_aim_id}' or {FIELD_NAME_APPLICATION_ID} eq '{application_id}')"
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
        research_aim=research_aim,
        retrieval_results=search_result,
        research_task_titles=research_task_titles,
    )

    result = await handle_segmented_text_generation(
        entity_type="research_aim",
        entity_identifier=research_aim["id"],
        prompt_handler=handler,
    )
    logger.debug("Generated research aim %s", result)

    return result
