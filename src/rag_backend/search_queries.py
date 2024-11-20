import logging
from string import Template
from typing import Final, TypedDict

from openai.types.chat import ChatCompletionToolParam
from openai.types.shared_params import FunctionDefinition

from src.rag_backend.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.rag_backend.utils import handle_tool_call_request

logger = logging.getLogger(__name__)

SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a RAG pipeline designed to assist in writing grant
application sections. Your function is to generate search queries that will retrieve relevant content from
an Azure AI Search index containing user-uploaded research materials.

You will receive a description of the next task in the RAG pipeline and any user provided inputs that will be used as
sources.

Your task is to analyze this description and generate at least 3 distinct search queries that balance specificity with breadth to capture relevant materials.
"""

SEARCH_QUERIES_USER_PROMPT: Final[Template] = Template("""
```markdown
${prompt}
```
""")

OUTPUT_INSTRUCTIONS: Final[str] = """
## Output

Respond using the provided tools with a JSON object strictly adhering to the following structure:

```json
{
    "queries": [
        "...",
    ]
}
```
"""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    queries: list[str]
    """The generated search queries."""


async def create_search_queries(prompt: str) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        prompt: The prompt to generate the search queries.


    Returns:
        list[str]: The generated search queries.
    """
    logger.debug("Generating search queries for prompt: %s", prompt)
    result = await handle_tool_call_request(
        system_prompt=SEARCH_QUERIES_SYSTEM_PROMPT.strip(),
        user_prompt=SEARCH_QUERIES_USER_PROMPT.substitute(
            prompt=prompt,
        ),
        output_instructions=OUTPUT_INSTRUCTIONS,
        tools=[
            ChatCompletionToolParam(
                type="function",
                function=FunctionDefinition(
                    name="response_handler",
                    parameters={
                        "type": "object",
                        "properties": {
                            "queries": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["queries"],
                        "additionalProperties": False,
                    },
                ),
            )
        ],
        response_type=ToolResponse,  # type: ignore[type-var]
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )

    queries = result["queries"]
    logger.debug("Generated search queries: %s", ",".join(queries))
    return queries
