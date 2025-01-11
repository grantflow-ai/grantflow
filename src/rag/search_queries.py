from typing import Any, Final, TypedDict

from src.constants import FAST_TEXT_GENERATION_MODEL
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.serialization import serialize
from src.utils.template import Template

logger = get_logger(__name__)

SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a RAG pipeline designed to assist in writing grant application sections.
Your function is to generate search queries that will retrieve relevant content from a vector store using cosine similarity.
The queries should balance specificity with breadth to capture a range of relevant materials.
"""

SEARCH_QUERIES_USER_PROMPT: Final[Template] = Template("""
Your task is to generate between 3-10 distinct search queries that will be executed against the vector store.
The queries should be optimized for the next task in the RAG pipeline. Use the following sources:

# Next Task Description
<task_description>
${task_description}
</task_description>

<inputs>
${inputs}
</inputs>
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


async def handle_create_search_queries(*, task_description: str, **inputs: Any) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        task_description: The description of the next task in the RAG pipeline.
        **inputs: The inputs for the search query generation

    Returns:
        The generated search queries, the total number of tokens, and the total billable characters.
    """
    queries: list[str] = []

    while len(queries) < 3:
        response = await handle_completions_request(
            prompt_identifier="search_queries",
            system_prompt=SEARCH_QUERIES_SYSTEM_PROMPT.strip(),
            user_prompt=SEARCH_QUERIES_USER_PROMPT.substitute(
                task_description=task_description, inputs=serialize(inputs).decode() if inputs else ""
            ).strip(),
            output_instructions=OUTPUT_INSTRUCTIONS,
            response_schema=response_schema,
            response_type=ToolResponse,
            model=FAST_TEXT_GENERATION_MODEL,
        )
        queries.extend(response["queries"])

    logger.info("Successfully generated search queries for the next stage in the RAG pipeline")

    return queries[:10]
