from collections.abc import Callable
from time import time
from typing import Any, Final, TypedDict

from google.cloud.exceptions import TooManyRequests
from vertexai.generative_models import (  # type: ignore[import-untyped]
    Content,
    GenerationConfig,
    Part,
)

from src.constants import CONTENT_TYPE_JSON, PREMIUM_TEXT_GENERATION_MODEL
from src.exceptions import DeserializationError, ValidationError
from src.utils.ai import get_google_ai_client
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.retry import with_exponential_backoff_retry
from src.utils.serialization import deserialize, serialize
from src.utils.text import concatenate_segments_with_spacy_coherence, normalize_markdown

logger = get_logger(__name__)

BASE_SYSTEM_PROMPT: Final[str] = """
You are an expert STEM grant application writer integrated into a RAG (Retrieval-Augmented Generation) system.
"""

DEFAULT_SYSTEM_PROMPT: Final[str] = f"""
{BASE_SYSTEM_PROMPT}

When generating text, strictly follow these guidelines:
   - Write with maximum information density, conveying the most detail in the fewest possible words
   - Assume the reader is an expert; avoid basic definitions or general background information
   - Use precise, field-specific technical terminology without simplifying
   - Do not define acronyms; an acronyms table is given in a different part of the text.
   - Follow the scientific terminology provided in the inputs
   - Maintain a formal and data-driven tone, emphasizing succinctness and specificity
   - When information is missing or insufficient, do not invent facts or complete the missing information.
   - Instead, write `**MISSING INFORMATION: <description>**` where `<description>` is a concise description of the missing information.
"""


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

CONSECUTIVE_PART_GENERATION_INSTRUCTIONS: Final[PromptTemplate] = PromptTemplate(
    name="consecutive_part_generation",
    template="""
Here is the last segment of text that was generated:

<last_generation_result>
${last_generation_result}
</last_generation_result>

Instructions:
1. Analyze the provided text segment, focusing on its content, style, and end point.
2. Continue the grant application writing from exactly where the previous segment ends.
3. Maintain consistency in style, tone, and context with the original text.
4. Avoid repeating information already presented in the previous segment.
""",
)

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


class SegmentedToolGenerationToolResponse(TypedDict):
    """The response from the segmented generation tool."""

    text: str
    """The generated text."""
    is_complete: bool
    """Whether the text is complete or not."""


def _default_validator[T](_: T) -> None:
    return None


@with_exponential_backoff_retry(TooManyRequests)
async def make_completions_request[T](
    *,
    model: str,
    prompt_identifier: str,
    response_type: type[T],
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    response_schema: dict[str, Any] | None = None,
    messages: str | Part | list[str | Part],
) -> T:
    """Make a completions request to the model.

    Args:
        model:
        prompt_identifier:
        response_type:
        system_prompt:
        response_schema:
        messages:

    Args:
        model: The model to use for the generation.
        prompt_identifier: The identifier of the prompt.
        response_type: The response type.
        system_prompt: The system prompt.
        response_schema: The response schema.
        messages: The messages to send to the model.

    Returns:
        The generated text.
    """
    client = get_google_ai_client(prompt_identifier=prompt_identifier, system_instructions=system_prompt, model=model)

    contents = [
        Content(
            role="user",
            parts=[Part.from_text(messages)]
            if isinstance(messages, str)
            else [Part.from_text(message) if isinstance(message, str) else message for message in messages],
        )
    ]
    response = await client.generate_content_async(
        contents=contents,
        generation_config=GenerationConfig(
            response_mime_type=CONTENT_TYPE_JSON,
            response_schema=response_schema or SEGMENTED_GENERATION_SCHEMA,
        ),
    )
    logger.debug("Received content from model.", text=response.text)
    return deserialize(response.text, response_type)


async def handle_completions_request[T](
    *,
    max_attempts: int = 3,
    messages: str | Part | list[str | Part],
    model: str = PREMIUM_TEXT_GENERATION_MODEL,
    prompt_identifier: str,
    response_schema: dict[str, Any] | None = None,
    response_type: type[T],
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    validator: Callable[[T], None] = _default_validator,
) -> T:
    """Handle a completions request to the model.

    Args:
        max_attempts: The maximum number of attempts to make.
        messages: The messages to send to the model.
        model: The model to use for the generation.
        prompt_identifier: The identifier of the prompt.
        response_schema: The response schema.
        response_type: The response type.
        system_prompt: The system prompt.
        validator: Custom validator function for the response.

    Raises:
        ValidationError: If the response is invalid.

    Returns:
        The generated text.
    """
    attempts = 0

    response: T | None = None
    error_message: str | None = None

    while attempts < max_attempts:
        try:
            msgs = messages
            if error_message:
                msgs = [error_message, *messages]

            response = await make_completions_request(
                model=model,
                prompt_identifier=prompt_identifier,
                response_type=response_type,
                system_prompt=system_prompt,
                response_schema=response_schema,
                messages=msgs,
            )

            validator(response)
            return response
        except ValidationError as e:
            attempts += 1
            error_message = f"""
            This is the content returned by the last API call with the provided prompt:

            {serialize(response).decode()}

            This is the error:
            {e!s}

            Following are the original messages sent to the model, which may help you identify the issue.
            Address the errors and return corrected content
            """

            response = None
        except DeserializationError as e:
            attempts += 1
            error_message = f"""
            The last API call with the provided prompt returned either an invalid JSON object or an object that does not conform with the JSON schema.

            This is the error:
            {e!s}

            Following are the original messages sent to the model, which may help you identify the issue.
            Address the errors and return corrected content
            """

    raise ValidationError(f"Failed to generate text after {max_attempts} attempts.")


async def handle_segmented_text_generation(
    *,
    prompt_identifier: str = "",
    messages: str | Part | list[str | Part],
) -> str:
    """Handle the generation of segmented text.

    Args:
        prompt_identifier: The identifier of the entity to generate text for.
        messages: The messages to send to the model.

    Returns:
        The generated text.
    """
    results: list[str] = []

    parts: list[str] = [Part.from_text(SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS)]
    if isinstance(messages, str):
        parts.append(Part.from_text(messages))
    else:
        parts.extend([Part.from_text(message) if isinstance(message, str) else message for message in messages])

    api_call_num = 1

    logger.info("Generating text", entity_identifier=prompt_identifier)
    start_time = time()
    while api_call_num < 20:
        last_generation_result = results[-1] if results else None

        response = await handle_completions_request(
            prompt_identifier=prompt_identifier,
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            response_schema=SEGMENTED_GENERATION_SCHEMA,
            messages=[
                *([messages] if isinstance(messages, str) else messages),
                SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS,
                CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.to_string(last_generation_result=last_generation_result),
            ]
            if last_generation_result
            else parts,
            response_type=SegmentedToolGenerationToolResponse,
        )

        results.append(response["text"])

        api_call_num += 1
        if response["is_complete"]:
            break

    logger.info(
        "Generated text",
        prompt_identifier=prompt_identifier,
        api_call_num=api_call_num,
        generation_duration=int(time() - start_time),
    )

    return normalize_markdown(concatenate_segments_with_spacy_coherence(results))
