from collections.abc import Callable
from functools import partial
from typing import Any, Final, TypedDict

from google.cloud.exceptions import TooManyRequests
from jsonschema import ValidationError as JSONSchemaValidationError
from jsonschema.validators import validate
from vertexai.generative_models import (  # type: ignore[import-untyped]
    Content,
    GenerationConfig,
    Part,
)

from src.constants import CONTENT_TYPE_JSON, GENERATION_MODEL
from src.exceptions import DeserializationError, ValidationError
from src.utils.ai import get_google_ai_client
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
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

**important**: When information is missing or insufficient, do not invent facts. Instead write `**[MISSING INFORMATION: description of the missing information]**`.
"""

SELECT_BEST_RESPONSE_SYSTEM_PROMPT: Final[str] = """
You are a specialist in selecting the best response from a list of generated responses.
"""

SELECT_BEST_RESPONSE_USE_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="select_best_response_use_prompt",
    template="""
    Your task is to select the best response.

    ## Prompt
    The responses were generated for the following prompt:

    <prompt>
    ${prompt}
    </prompt>

    ## Responses
    <responses>
    ${responses}
    </responses>

    Select the key (integer id) of the best response from the object.

    The response should be a single key (integer) from the object, which correlates with the best response value:

    ```json
    {
        "best_response": 1
    }
    ```
    """,
)

select_best_response_json_schema = {
    "type": "object",
    "properties": {
        "best_response": {"type": "integer", "minimum": 0},
    },
    "required": ["best_response"],
}


class BestResponseSelection(TypedDict):
    """The best response selection response."""

    best_response: int
    """The best response."""


def validate_select_best_response(tool_response: BestResponseSelection, *, candidates: dict[int, Any]) -> None:
    """Validate the best response selection.

    Args:
        tool_response: The tool response.
        candidates: The candidates.

    Raises:
        ValidationError: If the selected response is not in the candidates.
    """
    if tool_response["best_response"] not in candidates:
        raise ValidationError("The selected response id is not in a key in the candidates object.")


async def select_best_response[T](
    candidates: dict[int, T],
    prompt: str | PromptTemplate,
) -> T:
    """Select the best response from a list of candidates.

    Args:
        candidates: The list of candidates.
        prompt: The prompt.

    Returns:
        The best response.
    """
    response = await handle_completions_request(
        prompt_identifier="select_best_response_use_prompt",
        response_type=BestResponseSelection,
        response_schema=select_best_response_json_schema,
        messages=SELECT_BEST_RESPONSE_USE_PROMPT.to_string(
            prompt=prompt,
            responses=candidates,
        ),
        temperature=0.2,
        top_p=0.7,
        validator=partial(validate_select_best_response, candidates=candidates),
    )
    return candidates[response["best_response"]]


@with_exponential_backoff_retry(TooManyRequests)
async def make_completions_request[T](
    *,
    model: str = GENERATION_MODEL,
    prompt_identifier: str,
    response_type: type[T],
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    response_schema: dict[str, Any] | None = None,
    messages: str | Part | list[str | Part],
    # generation settings
    temperature: float = 0,
    top_p: float | None = None,
    top_k: int | None = None,
    candidate_count: int | None = None,
) -> T:
    """Make a completions request to the model.

    Args:
        model: The model to use for the generation.
        prompt_identifier: The identifier of the prompt.
        response_type: The response type.
        system_prompt: The system prompt.
        response_schema: The response schema.
        messages: The messages to send to the model.
        temperature: The temperature.
        top_p: The top-p value.
        top_k: The top-k value.
        candidate_count: The candidate count.

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
            response_schema=response_schema,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            candidate_count=candidate_count,
        ),
    )
    if not candidate_count:
        return deserialize(response.text, response_type)

    prompt = (
        messages
        if isinstance(messages, str)
        else "\n".join([message if isinstance(message, str) else message.text for message in messages])
    )

    return await select_best_response(
        candidates={index + 1: deserialize(r.text, response_type) for index, r in enumerate(response.candidates)},
        prompt=prompt,
    )


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
    model: str = GENERATION_MODEL,
    prompt_identifier: str,
    response_schema: dict[str, Any] | None = None,
    response_type: type[T],
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    validator: Callable[[T], None] | None = None,
    # generation settings
    temperature: float = 0,
    top_p: float | None = None,
    top_k: int | None = None,
    candidate_count: int | None = None,
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
        temperature: The temperature.
        top_p: The top-p value.
        top_k: The top-k value.
        candidate_count: The candidate count.

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
            msgs = [messages] if isinstance(messages, str) else messages
            if error_message:
                msgs = [*messages, error_message]

            response = await make_completions_request(
                model=model,
                prompt_identifier=prompt_identifier,
                response_type=response_type,
                system_prompt=system_prompt,
                response_schema=response_schema,
                messages=msgs,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                candidate_count=candidate_count,
            )
            # if not validator and response_schema:
            #     validator = create_json_schema_validator(response_schema)  # noqa: ERA001

            if validator:
                validator(response)
            return response
        except ValidationError as e:
            attempts += 1
            error_message = f"""
            The last response from the API failed validation due to the following error:
                <error>
                {e!s}
                </error>

            Your task is to fix the error and return the corrected response data:
                <data>
                {serialize(response).decode()}
                <data>

            1. Begin by analyzing the error message to understand the issue
            2. Apply the necessary changes to the response data to address the error
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
