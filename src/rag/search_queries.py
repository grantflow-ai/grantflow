import logging
from typing import TypedDict

from openai.types.chat import ChatCompletionToolParam
from openai.types.shared_params import FunctionDefinition

from src.rag.prompts import SEARCH_QUERIES_SYSTEM_PROMPT, SEARCH_QUERIES_USER_PROMPT
from src.rag.utils import handle_tool_call_request

logger = logging.getLogger(__name__)

json_schema = {
    "type": "object",
    "properties": {
        "queries": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["queries"],
    "additionalProperties": False,
}


class ToolResponse(TypedDict):
    """The response from the tool call."""

    queries: list[str]
    """The generated search queries."""


async def create_search_queries(
    prompt: str,
) -> list[str]:
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
        tools=[
            ChatCompletionToolParam(
                type="function",
                function=FunctionDefinition(
                    name="response_handler",
                    parameters=json_schema,
                ),
            )
        ],
        response_type=ToolResponse,  # type: ignore[type-var]
    )

    queries = result["queries"]
    logger.debug("Generated search queries: %s", ",".join(queries))
    return queries
