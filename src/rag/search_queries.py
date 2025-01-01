from string import Template
from typing import Final, NamedTuple, TypedDict

from src.constants import FAST_TEXT_GENERATION_MODEL
from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger

logger = get_logger(__name__)

SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a RAG pipeline designed to assist in writing grant application sections.
Your function is to generate search queries that will retrieve relevant content from a vector store using cosine similarity.
"""

SEARCH_QUERIES_USER_PROMPT: Final[Template] = Template("""
Your task is to analyze the description of the next stage in the RAG pipeline and generate between 3-10 distinct search queries that will be executed against the vector store.
Make sure to optimize the queries for retrieval of relevant content - balance specificity with breadth to capture a range of relevant materials.
Here is the description of the next task in the RAG pipeline along with any inputs that will be used as sources in the generation:

<prompt>
${prompt}
</prompt>
""")

OUTPUT_INSTRUCTIONS: Final[str] = """
## Output

Respond using the provided tool with a JSON object strictly adhering to the following structure:

```jsonc
{
    "queries": [
        "Example query 1",
        "Example query 2",
        "Example query 3",
        "Example query 4",
        "Example query 5",
        // ... and so on as required.
    ]
}
```
"""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    queries: list[str]
    """The generated search queries."""


response_schema = {
    "type": "object",
    "properties": {
        "queries": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["queries"],
}


class SearchQueriesResponse(NamedTuple):
    """The response from the search queries generation."""

    queries: list[str]
    """The generated search queries."""
    tokens_used: int
    """The total number of tokens used."""
    billable_characters_used: int
    """The total number of billable characters used."""


async def handle_create_search_queries(prompt: str) -> SearchQueriesResponse:
    """Generate an optimized search query for retrieval.

    Args:
        prompt: The prompt to generate the search queries.


    Returns:
        The generated search queries, the total number of tokens, and the total billable characters.
    """
    total_tokens: int = 0
    total_billable_characters: int = 0
    queries: list[str] = []

    while len(queries) < 3:
        response, tokens_used, billable_characters_used = await handle_completions_request(
            prompt_identifier="search_queries",
            system_prompt=SEARCH_QUERIES_SYSTEM_PROMPT.strip(),
            user_prompt=SEARCH_QUERIES_USER_PROMPT.substitute(
                prompt=prompt,
            ),
            output_instructions=OUTPUT_INSTRUCTIONS,
            response_schema=response_schema,
            response_type=ToolResponse,
            model=FAST_TEXT_GENERATION_MODEL,
        )
        total_tokens += tokens_used
        total_billable_characters += billable_characters_used
        queries.extend(response["queries"])

    logger.info("Successfully generated search queries for the next stage in the RAG pipeline")
    return SearchQueriesResponse(
        queries=queries[:10], tokens_used=total_tokens, billable_characters_used=total_billable_characters
    )
