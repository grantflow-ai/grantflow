from collections.abc import Callable
from typing import Any, Final

from google.cloud.exceptions import TooManyRequests
from jsonschema import ValidationError as JSONSchemaValidationError
from jsonschema.validators import validate
from vertexai.generative_models import (  # type: ignore[import-untyped]
    Content,
    GenerationConfig,
    Part,
)

from src.constants import CONTENT_TYPE_JSON, FAST_TEXT_GENERATION_MODEL, PREMIUM_TEXT_GENERATION_MODEL
from src.exceptions import DeserializationError, ValidationError
from src.utils.ai import get_google_ai_client
from src.utils.logger import get_logger
from src.utils.retry import with_exponential_backoff_retry
from src.utils.serialization import deserialize, serialize

logger = get_logger(__name__)

BASE_SYSTEM_PROMPT: Final[str] = """
You are an expert STEM grant application writer integrated into a RAG (Retrieval-Augmented Generation) system.
"""

DEFAULT_SYSTEM_PROMPT: Final[str] = f"""
{BASE_SYSTEM_PROMPT}

## Text Guidelines:
   - Write with maximum information density, conveying the most detail in the fewest possible words
   - Assume the reader is an expert; avoid basic definitions or general background information
   - Use precise, field-specific technical terminology without simplifying
   - Do not define acronyms; an acronyms table is given in a different part of the text
   - Follow the scientific terminology provided in the inputs
   - Maintain a formal and data-driven tone, emphasizing succinctness and specificity

## Handling Missing Information:
   When information is missing or insufficient, do not invent facts or complete the missing information instead.
   write `**[MISSING INFORMATION: description]**` where description is a concise description of the missing information.
"""


@with_exponential_backoff_retry(TooManyRequests)
async def make_completions_request[T](
    *,
    model: str = FAST_TEXT_GENERATION_MODEL,
    prompt_identifier: str,
    response_type: type[T],
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    response_schema: dict[str, Any] | None = None,
    messages: str | Part | list[str | Part],
) -> T:
    """Make a completions request to the model.

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
        generation_config=GenerationConfig(response_mime_type=CONTENT_TYPE_JSON, response_schema=response_schema),
    )
    logger.debug("Received content from model.", text=response.text)
    return deserialize(response.text, response_type)


def create_json_schema_validator(json_schema: dict[str, Any]) -> Callable[[Any], None]:
    """Create a JSON schema validator.

    Args:
        json_schema: The JSON schema.

    Returns:
        The validator function.
    """

    def validator(response: Any) -> None:
        try:
            validate(schema=json_schema, instance=response)
        except JSONSchemaValidationError as e:
            raise ValidationError(e.message) from e

    return validator


async def handle_completions_request[T](
    *,
    max_attempts: int = 3,
    messages: str | Part | list[str | Part],
    model: str = PREMIUM_TEXT_GENERATION_MODEL,
    prompt_identifier: str,
    response_schema: dict[str, Any] | None = None,
    response_type: type[T],
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    validator: Callable[[T], None] | None = None,
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
    errors: list[Exception] = []

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
            # if not validator and response_schema:
            #     validator = create_json_schema_validator(response_schema)  # noqa: ERA001

            if validator:
                validator(response)
            return response
        except ValidationError as e:
            attempts += 1
            error_message = f"""
            This is the content returned by the last API call with the provided prompt:

            {serialize(response).decode()}

            This is the error:
            {e}

            Following are the original messages sent to the model, which may help you identify the issue.
            Address the errors and return corrected content
            """

            response = None
            errors.append(e)
        except DeserializationError as e:
            attempts += 1
            error_message = f"""
            The last API call with the provided prompt returned either an invalid JSON object or an object that does not conform with the JSON schema.

            This is the error:
            {e}

            Following are the original messages sent to the model, which may help you identify the issue.
            Address the errors and return corrected content
            """
            errors.append(e)

    raise ValidationError(f"Failed to generate text after {max_attempts} attempts.", context={"errors": errors})
