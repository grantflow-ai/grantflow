from __future__ import annotations

from textwrap import dedent
from typing import TYPE_CHECKING, Final, TypedDict

from src.constants import FAST_TEXT_GENERATION_MODEL
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.serialization import serialize

if TYPE_CHECKING:
    from prompt_template import PromptTemplate as _PromptTemplate

logger = get_logger(__name__)

SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a Retrieval-Augmented Generation (RAG) pipeline designed to assist in writing grant application sections.
Your primary function is to generate search queries that will retrieve relevant content from a vector store using cosine similarity.
"""

SEARCH_QUERIES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="search_queries_generation",
    template="""
Here is the user prompt for the next stage of the RAG pipeline:

<user_prompt>
${user_prompt}
</user_prompt>

Your task is to generate between 3 and 10 distinct search queries based on this user prompt. These queries will be executed against the vector store to retrieve relevant information for the grant application section.

Instructions:
1. Analyze the user prompt carefully to understand the context and requirements of the grant application section.
2. Generate search queries that balance specificity with breadth to capture a range of relevant materials.
3. Ensure that the queries are optimized for the next task in the RAG pipeline, which involves retrieving and processing the relevant information.
4. Aim for diversity in your queries to cover different aspects of the topic.

Before providing your final output, wrap your thought process in <query_generation_process> tags. Follow these steps:
1. List the key concepts or themes in the user prompt.
2. Identify specific terminology that might be relevant to the grant application.
3. Brainstorm different aspects of the topic that could be covered in separate queries.
4. Consider potential synonyms or related terms that could broaden the search.
5. Generate initial queries based on steps 1-4.
6. Evaluate each generated query for relevance and effectiveness, refining as necessary.

It's OK for this section to be quite long, as thorough consideration will lead to better queries.

After your thought process, provide your final output as a JSON object strictly adhering to the following structure:

```json
{
    "queries": [
        "Query 1",
        "Query 2",
        "Query 3",
        // Additional queries as needed, up to 10
    ]
}
```

Ensure that you generate at least 3 queries and no more than 10 queries. Each query should be a string designed to effectively retrieve relevant information from the vector store.""",
)


class ToolResponse(TypedDict):
    """The response from the tool call."""

    queries: list[str]
    """The generated search queries."""


response_schema = {
    "type": "object",
    "properties": {
        "queries": {"type": "array", "items": {"type": "string"}, "minLength": 3, "maxLength": 10},
    },
    "required": ["queries"],
}


async def handle_create_search_queries(
    *, user_prompt: str | _PromptTemplate, search_queries: list[str] | None = None
) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        user_prompt: The description of the next task in the RAG pipeline.
        search_queries: The previously generated search queries.

    Returns:
        The generated search queries, the total number of tokens, and the total billable characters.
    """
    messages = [SEARCH_QUERIES_USER_PROMPT.to_string(user_prompt=str(user_prompt))]
    if search_queries:
        messages.append(
            dedent(f"""
        Here are previously generated search queries that you can use as a starting point:

        {serialize(search_queries).decode()}
        """)
        )

    queries: list[str] = []

    while len(queries) < 3:
        response = await handle_completions_request(
            prompt_identifier="search_queries",
            system_prompt=SEARCH_QUERIES_SYSTEM_PROMPT,
            messages=messages,
            response_schema=response_schema,
            response_type=ToolResponse,
            model=FAST_TEXT_GENERATION_MODEL,
        )
        queries.extend(response["queries"])

    logger.info("Successfully generated search queries for the next stage in the RAG pipeline")

    return queries[:10]
