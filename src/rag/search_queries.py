import logging
from string import Template
from typing import Final

from typing_extensions import TypedDict

from src.constants import FAST_TEXT_GENERATION_MODEL
from src.rag.utils import handle_completions_request

logger = logging.getLogger(__name__)

SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a RAG pipeline designed to assist in writing grant application sections.
Your function is to generate search queries that will retrieve relevant content from an Azure AI Search index containing user-uploaded research materials.
"""

SEARCH_QUERIES_USER_PROMPT: Final[Template] = Template("""
Here is the description of the next task in the RAG pipeline, along with any user-provided inputs that will be used as sources:

<description>
{{description}}
</description>

Your task is to analyze this description and generate between 3 and 10 distinct search queries that balance specificity with breadth to capture relevant materials. Follow these steps:

1. Carefully read and analyze the provided description.
2. Identify key topics, concepts, and potential areas of focus within the description.
3. Generate a list of potential search queries based on your analysis.
4. Refine and prioritize your queries to ensure they are distinct and cover a range of relevant aspects.
5. Ensure you have at least 3 queries but no more than 10.
6. Format your final list of queries as a JSON object according to the specified structure.

Before formulating your final response, wrap your analysis and query generation process in <query_generation_process> tags:

1. List key topics and concepts from the description.
2. For each key topic/concept, brainstorm 2-3 potential search queries.
3. Evaluate each query for relevance and specificity.
4. Select the best queries, ensuring a balance of specificity and breadth.

This will help ensure thorough consideration of the description and creation of effective queries.

Remember:
- Generate at least 3 and at most 10 distinct queries.
- Ensure queries are relevant to the provided description.
- Balance specificity and breadth in your queries to capture a range of relevant materials.
- Provide only the JSON object as your final output, without any additional text or explanation.

Begin your response with your query generation process, followed by the JSON output.
""")

OUTPUT_INSTRUCTIONS: Final[str] = """
## Output

Respond using the provided tool with a JSON object strictly adhering to the following structure:

```json
{
    "queries": [
        "Example query 1",
        "Example query 2",
        "Example query 3"
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


async def create_search_queries(prompt: str) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        prompt: The prompt to generate the search queries.


    Returns:
        list[str]: The generated search queries.
    """
    logger.debug("Generating search queries for prompt: %s", prompt)
    result = await handle_completions_request(
        prompt_identifier="search_queries",
        system_prompt=SEARCH_QUERIES_SYSTEM_PROMPT.strip(),
        user_prompt=SEARCH_QUERIES_USER_PROMPT.substitute(
            prompt=prompt,
        ),
        output_instructions=OUTPUT_INSTRUCTIONS,
        response_schema=response_schema,
        response_type=ToolResponse,  # type: ignore[type-var]
        model=FAST_TEXT_GENERATION_MODEL,
    )

    queries = result["queries"]
    logger.debug("Generated search queries: %s", ",".join(queries))
    return queries[:10]
