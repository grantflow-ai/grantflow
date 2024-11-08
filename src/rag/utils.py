import logging
from collections.abc import Callable, Coroutine
from typing import Any, Final

from openai import OpenAIError
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.rag.dto import GenerationResult
from src.utils.exceptions import OperationError
from src.utils.llm import get_generation_model
from src.utils.nlp import get_spacy_model
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize

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

TEXT_GENERATION_MODEL: Final[str] = "gpt-4o"

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


@exponential_backoff_retry(OpenAIError, OperationError)
async def handle_tool_call_request(
    system_prompt: str,
    user_prompt: str,
) -> GenerationResult:
    """Handle a tool call request for segmented text generation.

    Args:
        system_prompt: The system prompt.
        user_prompt: The user prompt.

    Raises:
        OperationError: If the response content is empty.

    Returns:
        The generated text.
    """
    client = get_generation_model()

    response = await client.chat.completions.create(
        model=TEXT_GENERATION_MODEL,
        response_format=ResponseFormatJSONObject(type="json_object"),
        messages=[
            ChatCompletionSystemMessageParam(role="system", content=system_prompt),
            ChatCompletionUserMessageParam(role="user", content=user_prompt),
        ],
        temperature=0.0,
        tools=SEGMENTED_GENERATION_TOOLS,
    )
    if response.choices[0].message.tool_calls and (
        content := response.choices[0].message.tool_calls[0].function.arguments
    ):
        logger.info("Successfully generated text segment")
        return deserialize(content, GenerationResult)

    logger.warning("Response content is empty, raising OperationError: %s", response.model_dump_json())
    raise OperationError(message="Response content is empty", context=response.model_dump_json())


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
        doc = nlp(segment)
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

    return " ".join(concatenated_text)
