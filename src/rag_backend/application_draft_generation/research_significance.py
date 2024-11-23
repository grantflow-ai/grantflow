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
from src.rag_backend.dto import DocumentDTO, GenerationResult
from src.rag_backend.search_queries import create_search_queries
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

SIGNIFICANCE_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to create the significance section for a grant application.
${previous_part_text}

Use the following sources to write the text:

1. Research Significance Description:
    <significance_description>
    ${significance_description}
    </significance_description>

2. The full text of the research plan section:
    <research_plan_text>
    ${research_plan_text}
    </research_plan_text>

3. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

4. Grant Funding Organization:
    <grant_funding_organization>
    ${grant_funding_organization}
    </grant_funding_organization>

5. CFP Code and Title:
    <cfp_title>
    ${cfp_title}
    </cfp_title>

6. Grant Application Title:
    <application_title>
    ${application_title}
    </application_title>

The significance section should highlight the importance of the problem or critical barrier that the project addresses, and how it impacts both the scientific field and human lives.
It should address the following implicit questions:

1. What is the core problem or challenge this project aims to address?
2. Why is this problem significant, and how does it impact human lives?
3. How does this problem relate to the stated aims of the funding program?
4. What is the current state of research in relevant fields?
5. What recent efforts have been made to solve this problem?
6. Why were those efforts insufficient?
7. What is the hypothesis for the right path to solving the problem?
8. How is this solution transformative compared to previous approaches?
9. How could this solution improve human lives in the future?

The significance section should open with an introductory paragraph or two that contextualizes the research project. It should go into detail about the research project itself.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~400-500 words).
""")

RESEARCH_SIGNIFICANCE_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to generate the significance section for a grant application.

This section should explain the importance of the problem or critical barrier that the project addresses, and how it impacts human lives.
The text should answer the following (implicit) questions:

- What is the problem or challenge the project aims to solve?
- Why is this problem significant and how does it impact human lives?
- How is the problem related to the stated aims of the program you are submitting to?
- What is the current state of research in the relevant fields related to the problem?
- What has been done in recent years to solve the problem?
- Why were those efforts insufficient?
- What is the hypothesis about the right path to solving the problem?
- How is this solution transformational in comparison to what has been done before?
- How could this solution improve human lives in the future?

This is the the description of the research significance provided by the user ${significance_description}
""")


async def generate_significance_text(
    previous_part_text: str | None,
    *,
    application_title: str,
    cfp_title: str,
    grant_funding_organization: str,
    retrieval_results: list[DocumentDTO],
    significance_description: str,
    research_plan_text: str,
) -> GenerationResult:
    """Generate a part of the significance text.

    Args:
        previous_part_text: The previous part of the significance text, if any.
        application_title: The title of the grant application.
        cfp_title: The CFP action code and title.
        grant_funding_organization: The funding organization for the grant.
        retrieval_results: The results of the RAG retrieval.
        significance_description: The description of the research significance.
        research_plan_text: The text of the research plan section.

    Returns:
        GenerationResult: The generated text for the significance section.
    """
    user_prompt = SIGNIFICANCE_GENERATION_USER_PROMPT.substitute(
        application_title=application_title,
        cfp_title=cfp_title,
        grant_funding_organization=grant_funding_organization,
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        rag_results=dumps(retrieval_results),
        significance_description=significance_description,
        research_plan_text=research_plan_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )


async def handle_significance_text_generation(
    *,
    application_id: str,
    application_title: str,
    cfp_title: str,
    grant_funding_organization: str,
    research_plan_text: str,
    significance_description: str,
    significance_id: str,
    workspace_id: str,
) -> str:
    """Generate the text for the significance section.

    Args:
        application_id: The ID of the grant application.
        application_title: The title of the grant application.
        cfp_title: The CFP action code and title.
        grant_funding_organization: The funding organization for the grant.
        research_plan_text: The text of the research plan section.
        significance_description: The description of the research significance.
        significance_id: The ID of the significance section.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the significance section.
    """
    search_queries = await create_search_queries(
        RESEARCH_SIGNIFICANCE_QUERIES_PROMPT.substitute(
            significance_description=significance_description,
        ).strip()
    )
    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_APPLICATION_ID} eq '{significance_id}' or {FIELD_NAME_APPLICATION_ID} eq '{application_id}')"
    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_significance_text,
        application_title=application_title,
        cfp_title=cfp_title,
        grant_funding_organization=grant_funding_organization,
        research_plan_text=research_plan_text,
        retrieval_results=search_result,
        significance_description=significance_description,
    )

    return await handle_segmented_text_generation(
        entity_type="significance",
        entity_identifier=significance_id,
        prompt_handler=handler,
    )
