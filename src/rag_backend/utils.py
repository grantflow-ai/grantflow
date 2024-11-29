import logging
from collections.abc import Callable, Coroutine
from typing import Any, Final, TypeVar

from google.api_core.exceptions import TooManyRequests
from vertexai.generative_models import (  # type: ignore[import-untyped]
    Content,
    GenerationConfig,
    Part,
)

from src.constants import CONTENT_TYPE_JSON, ONE_MINUTE_SECONDS, PREMIUM_TEXT_GENERATION_MODEL
from src.rag_backend.dto import GenerationResultDTO
from src.utils.ai import get_google_ai_client
from src.utils.exceptions import DeserializationError, ValidationError
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize
from src.utils.sleep import sleep_with_message
from src.utils.text import concatenate_segments_with_spacy_coherence

T = TypeVar("T", bound=dict[str, Any])

logger = logging.getLogger(__name__)

SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS: Final[str] = """
## Output

Respond with a valid JSON object containing the generated text and a boolean value indicating
whether the research aim text is complete or not. Example:

```jsonc
{
    "text": "The generated text",
    "is_complete": true // false if the text is not complete and requires further generation
}
```
"""


async def handle_segmented_text_generation(
    *,
    entity_type: str,
    entity_identifier: str,
    prompt_handler: Callable[[str | None], Coroutine[Any, Any, GenerationResultDTO]],
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

    logger.info("Generating %s: %s", entity_type, entity_identifier)
    while api_call_num < 20:
        logger.debug("%s generation API call number: %d", entity_identifier, api_call_num)
        last_generation_result = results[-1] if results else None

        result = await prompt_handler(
            last_generation_result,
        )

        results.append(result["text"])

        api_call_num += 1
        if result["is_complete"]:
            break

    logger.info(
        "Generated %s: %s, number of API calls: %d",
        entity_type,
        entity_identifier,
        api_call_num,
    )

    return concatenate_segments_with_spacy_coherence(results)


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


@exponential_backoff_retry(ValidationError)
async def handle_completions_request(
    *,
    model: str = PREMIUM_TEXT_GENERATION_MODEL,
    output_instructions: str = SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS,
    prompt_identifier: str,
    response_type: type[T] = GenerationResultDTO,  # type: ignore[assignment]
    system_prompt: str,
    response_schema: dict[str, Any] | None = None,
    user_prompt: str,
) -> T:
    """Handle a completions request to the model.

    Args:
        model: The model to use for the generation.
        output_instructions: The output instructions.
        prompt_identifier: The identifier of the prompt.
        response_type: The response type.
        system_prompt: The system prompt.
        response_schema: The response schema.
        user_prompt: The user prompt.

    Raises:
        ValidationError: If the response received from the model is invalid.

    Returns:
        The generated text.
    """
    client = get_google_ai_client(prompt_identifier=prompt_identifier, system_instructions=system_prompt, model=model)

    try:
        response = await client.generate_content_async(
            contents=[
                Content(
                    role="user",
                    parts=[Part.from_text(user_prompt), Part.from_text(output_instructions)],
                ),
            ],
            generation_config=GenerationConfig(
                response_mime_type=CONTENT_TYPE_JSON, response_schema=response_schema or SEGMENTED_GENERATION_SCHEMA
            ),
        )
        logger.debug("Received response from model: %s", response.text)
        return deserialize(response.text, response_type)
    except DeserializationError as e:
        logger.warning("Unexpected response from model: %s", e)
        raise ValidationError("Unexpected response from model") from e
    except TooManyRequests as e:
        logger.warning("Received rate limit error: %s", e)
        await sleep_with_message(ONE_MINUTE_SECONDS, "Received rate limit error, sleeping...")
        return await handle_completions_request(
            model=model,
            output_instructions=output_instructions,
            prompt_identifier=prompt_identifier,
            response_type=response_type,
            system_prompt=system_prompt,
            response_schema=response_schema,
            user_prompt=user_prompt,
        )
