import logging
from typing import Final, TypedDict

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.utils.exceptions import OperationError
from src.utils.llm import get_generation_model
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize

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

tools = [
    ChatCompletionToolParam(
        type="function",
        function=FunctionDefinition(
            name="response_handler",
            parameters=json_schema,
        ),
    )
]


class ToolResponse(TypedDict):
    """The response from the tool call."""

    queries: list[str]
    """The generated search queries."""


REWRITE_MODEL: Final[str] = "gpt-4o"

SYSTEM_PROMPT: Final[str] = """
You are a specialized query generation component within a RAG pipeline designed to assist in writing grant
application sections. Your function is to generate search queries that will retrieve relevant content from
an Azure AI Search index containing user-uploaded research materials.

## Your Task:
You will receive a description of the next task in the RAG pipeline and any user provided inputs that will be used as
sources.

1. Analyze these and identify:
   - The specific grant section being addressed
   - Scientific domain and methodologies
   - Key research problems or gaps
   - Technical approaches and innovations
2. Generate 3-5 distinct search queries that:
   - Target relevant scientific precedents and methodologies
   - Identify similar research problems and solutions
   - Find supporting evidence for significance claims
   - Locate methodological innovations in the field

## Guidelines:
- Include technical terminology specific to the research domain
- Target evidence supporting significance claims
- Focus on methodological innovations when relevant
- Include queries for competing or alternative approaches
- Consider interdisciplinary connections

## Important Considerations:
- Queries should balance specificity with breadth to capture relevant materials
- Consider both theoretical foundations and practical applications
- Include searches for potential criticisms or limitations
- Target evidence of research impact and significance
- Look for methodological innovations and technical advances
- Consider cross-disciplinary implications and applications
"""


@exponential_backoff_retry(OpenAIError, OperationError)
async def create_search_queries(
    user_prompt: str,
) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        user_prompt: The user prompt to generate the search queries.


    Raises:
        OperationError: If the response does not contain the expected tool call.

    Returns:
        list[str]: The generated search queries.
    """
    client = get_generation_model()

    logger.debug("Generating search queries for user prompt: %s", user_prompt)
    response = await client.chat.completions.create(
        model=REWRITE_MODEL,
        response_format=ResponseFormatJSONObject(type="json_object"),
        messages=[
            ChatCompletionSystemMessageParam(role="system", content=SYSTEM_PROMPT.strip()),
            ChatCompletionUserMessageParam(role="user", content=user_prompt.strip()),
        ],
        temperature=0.0,
        tools=tools,
    )

    tool_calls = response.choices[0].message.tool_calls
    if not tool_calls:
        logger.warning(
            "OpenAI response does not contain the expected tool call, raising OperationError. Response: %s",
            response.model_dump_json(),
        )
        raise OperationError(message="OpenAI response does not contain the expected tool call")

    content = deserialize(tool_calls[0].function.arguments, ToolResponse)
    if not content or not content.get("queries"):
        logger.warning("OpenAI response is empty, raising OperationError. Response: %s", response.model_dump_json())
        raise OperationError(message="OpenAI response is empty")

    logger.debug("Generated search queries: %s", ",".join(content))
    return content["queries"]
