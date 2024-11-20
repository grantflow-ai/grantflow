import logging
from collections.abc import Callable, Coroutine
from typing import Any, Final, TypeVar

from openai import OpenAIError, RateLimitError
from openai.types import ChatModel
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.rag_backend.constants import FAST_TEXT_GENERATION_MODEL
from src.rag_backend.dto import GenerationResult
from src.utils.exceptions import DeserializationError, OpenAIFailureError
from src.utils.llm import get_generation_model
from src.utils.nlp import get_spacy_model
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize
from src.utils.sleep import sleep_with_message

T = TypeVar("T", bound=dict[str, Any])

SEGMENTED_GENERATION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "text": {
            "type": "string",
            "description": "The output text that was generated",
        },
        "is_complete": {
            "type": "boolean",
            "description": "Whether the text is complete or requires further prompts for generation",
        },
    },
    "required": ["text", "is_complete"],
    "additionalProperties": False,
}

SEGMENTED_GENERATION_TOOLS = [
    ChatCompletionToolParam(
        type="function",
        function=FunctionDefinition(
            name="response_handler",
            parameters=SEGMENTED_GENERATION_JSON_SCHEMA,
        ),
    )
]

TWO_SECONDS: Final[int] = 2

SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS: Final[str] = """
## Output

Respond using the provided tools with a valid JSON object containing the generated text and a boolean value indicating
whether the research aim text is complete or not. Example:

```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if the text is not complete and requires further generation
}
```
"""

logger = logging.getLogger(__name__)


async def handle_segmented_text_generation(
    *,
    entity_type: str,
    entity_identifier: str,
    prompt_handler: Callable[[str | None], Coroutine[Any, Any, GenerationResult]],
) -> str:
    """Handle the generation of segmented text.

    Args:
        entity_type: The type of entity to generate text for.
        entity_identifier: The identifier of the entity to generate text for.
        prompt_handler: The handler for the prompt.

    Returns:
        The generated text.
    """
    results: list[str] = []
    api_call_num = 1
    is_complete = False
    last_generation_result: str | None = None

    logger.info("Generating %s: %s", entity_type, entity_identifier)
    while not is_complete and api_call_num < 20:
        logger.debug("%s generation API call number: %d", entity_identifier, api_call_num)
        result = await prompt_handler(
            last_generation_result,
        )

        api_call_num += 1
        results.append(result["text"])
        last_generation_result = result["text"]
        is_complete = result["is_complete"]

    logger.info(
        "Generated %s: %s, completed: %s, number of API calls: %d",
        entity_type,
        entity_identifier,
        str(is_complete),
        api_call_num,
    )

    return concatenate_segments_with_spacy_coherence(results)


@exponential_backoff_retry(DeserializationError)
async def handle_tool_call_request(
    *,
    model: ChatModel = FAST_TEXT_GENERATION_MODEL,
    output_instructions: str = SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS,
    response_type: type[T] = GenerationResult,  # type: ignore[assignment]
    system_prompt: str,
    tools: list[ChatCompletionToolParam] | None = None,
    user_prompt: str,
) -> T:
    """Handle a tool call request for segmented text generation.

    Args:
        model: The model to use for the generation.
        output_instructions: The output instructions.
        response_type: The response type.
        system_prompt: The system prompt.
        tools: The tools to use for the generation.
        user_prompt: The user prompt.

    Raises:
        OpenAIFailureError: If an error occurs during the tool call request.
        DeserializationError: If an error occurs during deserialization.

    Returns:
        The generated text.
    """
    client = get_generation_model()

    try:
        response = await client.chat.completions.create(
            model=model,
            response_format=ResponseFormatJSONObject(type="json_object"),
            messages=[
                ChatCompletionSystemMessageParam(role="system", content=system_prompt),
                ChatCompletionUserMessageParam(role="user", content=user_prompt),
                ChatCompletionSystemMessageParam(role="system", content=output_instructions),
            ],
            temperature=0.0,
            tools=tools or SEGMENTED_GENERATION_TOOLS,
        )
        if response.choices[0].message.tool_calls:
            result = deserialize(response.choices[0].message.tool_calls[0].function.arguments, response_type)
            logger.info("Successfully generated text segment")
            return result

        logger.warning("Response content is empty, raising OperationError: %s", response.model_dump_json())
        raise OpenAIFailureError(message="Response content is empty", context=response.model_dump_json())
    except OpenAIError as e:
        logger.info("Received an error from OpenAI: %s, %s", type(e).__name__, getattr(e, "body", ""))
        if isinstance(e, RateLimitError):
            retry_time = int(e.response.headers.get("Retry-After", TWO_SECONDS))
            logger.warning("Received a rate limit error from OpenAI. Waiting for %d seconds", retry_time)
            await sleep_with_message(int(retry_time), "Waiting for rate limit to reset")
            return await handle_tool_call_request(
                model=model,
                output_instructions=output_instructions,
                response_type=response_type,
                system_prompt=system_prompt,
                tools=tools,
                user_prompt=user_prompt,
            )
        logger.warning("Received an error from Azure OpenAI: %s", e)
        raise OpenAIFailureError(message="Received an error from Azure OpenAI", context=str(e)) from e
    except DeserializationError as e:
        logger.warning("Unexpected response from model: %s", e)
        raise


def concatenate_segments_with_spacy_coherence(segments: list[str], max_overlap_sentences: int = 2) -> str:
    """Concatenate segmented text responses with coherence check using spaCy.

    Args:
        segments: A list of text segments.
        max_overlap_sentences: Maximum number of overlapping sentences to check for coherence.

    Returns:
        The concatenated and coherent text.
    """
    nlp = get_spacy_model()

    concatenated_text: list[str] = []
    context_buffer: list[str] = []

    for segment in segments:
        normalized_segment = "\n".join([fragment.strip() for fragment in segment.split("\n")]).strip()
        doc = nlp(normalized_segment)
        sentences = [sent.text for sent in doc.sents]

        overlap_index = 0
        if context_buffer and sentences:
            for overlap_count in range(1, min(len(context_buffer), max_overlap_sentences) + 1):
                if sentences[:overlap_count] == context_buffer[-overlap_count:]:
                    overlap_index = overlap_count
                    break

            sentences = sentences[overlap_index:]

        concatenated_text.append(" ".join(sentences))

        context_buffer = sentences[-max_overlap_sentences:]

    return " ".join([v.strip() for v in concatenated_text])
