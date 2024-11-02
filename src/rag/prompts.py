import logging
from typing import Final

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam

from src.utils.exceptions import DeserializationError
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
    "required": ["properties"],
    "additionalProperties": False,
}

tools = [
    {
        "type": "function",
        "function": {
            "name": "response_handler",
            "description": "Generate an optimized search query for retrieval.",
            "parameters": json_schema,
        },
    }
]

REWRITE_MODEL: Final[str] = "gpt-4o"

SYSTEM_PROMPT: Final[str] = """This request is part of a RAG pipeline.
You are a helpful assistant specializing in finding the most relevant documents in an Azure AI Search index.
Your task is to rewrite the given input into effective search queries.
These queries should be specific and varied to ensure comprehensive retrieval of relevant information.
Use the provided to tools and respond using JSON only according to the tool definition.
"""


@exponential_backoff_retry(OpenAIError, DeserializationError)
async def create_search_queries(
    *,
    input_query: str,
) -> list[str]:
    """Generate an optimized search query for retrieval.

    Args:
        input_query: The input query to use for generating the search query.

    Returns:
        list[str]: The generated search queries.
    """
    client = get_azure_openai()

    response = await client.chat.completions.create(
        model=REWRITE_MODEL,
        response_format={"type": "json_object"},
        messages=[
            ChatCompletionSystemMessageParam(role="system", content=SYSTEM_PROMPT),
            ChatCompletionUserMessageParam(role="user", content=f"Input: {input_query}"),
        ],
        temperature=0.0,
        tools=tools,
    )
    if content := response.choices[0].message.tool_calls[0].function.arguments:
        return deserialize(content, list[str]) or [input_query]
    return [input_query]
