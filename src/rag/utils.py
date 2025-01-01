from asyncio import gather
from collections.abc import Callable, Coroutine
from time import time
from typing import Any, Final, NamedTuple

from google.api_core.exceptions import TooManyRequests
from vertexai.generative_models import (  # type: ignore[import-untyped]
    Content,
    GenerationConfig,
    Part,
)

from src.constants import CONTENT_TYPE_JSON, PREMIUM_TEXT_GENERATION_MODEL
from src.exceptions import DeserializationError, ValidationError
from src.rag.dto import GenerationResultDTO
from src.utils.ai import get_google_ai_client
from src.utils.logging import get_logger
from src.utils.retry import with_exponential_backoff_retry
from src.utils.serialization import deserialize
from src.utils.text import concatenate_segments_with_spacy_coherence

logger = get_logger(__name__)


class CompletionsResult[T](NamedTuple):
    """The result of a completions request."""

    response: T
    """The generated text."""
    tokens_used: int
    """The number of tokens used for the generation."""
    billable_characters_used: int
    """The number of tokens used for the generation."""


class SegmentedTextGenerationResult(NamedTuple):
    """The result of segmented text generation."""

    content: str
    """The generated text."""
    number_of_api_calls: int
    """The number of API calls made."""
    generation_duration: int
    """The generated text."""
    tokens_used: int
    """The number of tokens used for the generation."""
    billable_characters_used: int
    """The number of tokens used for the generation."""


SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS: Final[str] = """
## Output

Respond with a valid JSON object containing the generated text and a boolean value indicating
whether the research aim text is complete or not. Example:

```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if the text is not complete and requires further generation
}

**Important**:
    - if the text is complete but information is missing, is_complete should be true.
```
"""

SEGMENTED_GENERATION_SCHEMA = {
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
}


def _default_validator[T](_: T) -> bool:
    return True


@with_exponential_backoff_retry(TooManyRequests, ValidationError)
async def handle_completions_request[T](
    *,
    model: str = PREMIUM_TEXT_GENERATION_MODEL,
    output_instructions: str = SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS,
    prompt_identifier: str,
    response_type: type[T],
    system_prompt: str,
    response_schema: dict[str, Any] | None = None,
    user_prompt: str,
    validator: Callable[[T], bool] = _default_validator,
) -> CompletionsResult[T]:
    """Handle a completions request to the model.

    Args:
        model: The model to use for the generation.
        output_instructions: The output instructions.
        prompt_identifier: The identifier of the prompt.
        response_type: The response type.
        system_prompt: The system prompt.
        response_schema: The response schema.
        user_prompt: The user prompt.
        validator: Custom validator function for the response.

    Raises:
        ValidationError: If the response received from the model is invalid.

    Returns:
        The generated text.
    """
    client = get_google_ai_client(prompt_identifier=prompt_identifier, system_instructions=system_prompt, model=model)

    try:
        contents = [
            Content(
                role="user",
                parts=[Part.from_text(user_prompt), Part.from_text(output_instructions)],
            )
        ]
        tokens, response = await gather(
            *[
                client.count_tokens_async(contents),
                client.generate_content_async(
                    contents=contents,
                    generation_config=GenerationConfig(
                        response_mime_type=CONTENT_TYPE_JSON,
                        response_schema=response_schema or SEGMENTED_GENERATION_SCHEMA,
                    ),
                ),
            ]
        )
        logger.debug("Received content from model.", text=response.text)
        data = deserialize(response.text, response_type)
        if not validator(data):
            raise ValidationError("Invalid response from model")

        return CompletionsResult(
            response=data,
            tokens_used=tokens.total_tokens,
            billable_characters_used=tokens.total_billable_characters,
        )
    except DeserializationError as e:
        logger.warning("Unexpected response from model.", exec_info=e)
        raise ValidationError("Unexpected response from model") from e


async def handle_segmented_text_generation(
    *,
    entity_type: str,
    entity_identifier: str = "",
    prompt_handler: Callable[[str | None], Coroutine[Any, Any, CompletionsResult[GenerationResultDTO]]],
) -> SegmentedTextGenerationResult:
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
    tokens_used = 0
    billable_characters_used = 0

    logger.info("Generating text", entity_identifier=entity_identifier, entity_type=entity_type)
    start_time = time()
    while api_call_num < 20:
        last_generation_result = results[-1] if results else None

        response, total_tokens, total_billable_characters = await prompt_handler(
            last_generation_result,
        )

        results.append(response["text"])

        api_call_num += 1
        tokens_used += total_tokens
        billable_characters_used += total_billable_characters
        if response["is_complete"]:
            break

    logger.info(
        "Generated text",
        entity_type=entity_type,
        entity_identifier=entity_identifier,
        api_call_num=entity_identifier,
    )

    return SegmentedTextGenerationResult(
        content=concatenate_segments_with_spacy_coherence(results),
        number_of_api_calls=api_call_num,
        generation_duration=int(time() - start_time),
        tokens_used=tokens_used,
        billable_characters_used=billable_characters_used,
    )
