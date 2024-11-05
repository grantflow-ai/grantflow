import logging
from textwrap import dedent
from typing import Final

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.utils.exceptions import DeserializationError, OperationError
from src.utils.llm import get_azure_openai
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


REWRITE_MODEL: Final[str] = "gpt-4o"

SYSTEM_PROMPT: Final[str] = """
This request is part of a RAG pipeline.
You are a helpful assistant specializing in finding the most relevant documents in an Azure AI Search index.
Your task is to translate the given input into effective search queries.
These queries should be specific and varied to ensure comprehensive retrieval of relevant information.
Use the provided tools to respond with a valid JSON object.
"""


@exponential_backoff_retry(OpenAIError, DeserializationError, OperationError)
async def create_search_queries(
    input_query: str,
) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        input_query: The input query to use for generating the search query.


    Raises:
        OperationError: If the response does not contain the expected tool call.

    Returns:
        list[str]: The generated search queries.
    """
    client = get_azure_openai()

    response = await client.chat.completions.create(
        model=REWRITE_MODEL,
        response_format=ResponseFormatJSONObject(type="json_object"),
        messages=[
            ChatCompletionSystemMessageParam(role="system", content=dedent(SYSTEM_PROMPT.strip())),
            ChatCompletionUserMessageParam(role="user", content=f"Input: {input_query}".strip()),
        ],
        temperature=0.0,
        tools=tools,
    )

    tool_calls = response.choices[0].message.tool_calls
    if not tool_calls:
        raise OperationError(message="OpenAI response does not contain the expected tool call")

    content = deserialize(tool_calls[0].function.arguments, list[str])

    if not content:
        raise OperationError(message="OpenAI response is empty")

    return content
