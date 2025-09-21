from collections.abc import Callable
from datetime import UTC, datetime
from functools import partial
from textwrap import dedent
from typing import Any, Final, TypedDict

from anthropic import (
    NOT_GIVEN,
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
)
from anthropic import InternalServerError as AnthropicInternalServerError
from anthropic.types import ToolParam, ToolUseBlock
from google import genai
from google.api_core.exceptions import InternalServerError as GoogleInternalServerError
from google.api_core.exceptions import ServiceUnavailable
from google.cloud.exceptions import TooManyRequests
from packages.shared_utils.src.ai import (
    ANTHROPIC_SONNET_MODEL,
    GENERATION_MODEL,
    get_anthropic_client,
    get_google_ai_client,
)
from packages.shared_utils.src.constants import CONTENT_TYPE_JSON
from packages.shared_utils.src.exceptions import (
    BackendError,
    DeserializationError,
    InsufficientContextError,
    LLMTimeoutError,
    RagError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.retry import with_exponential_backoff_retry
from packages.shared_utils.src.serialization import deserialize, fix_string_json_values, serialize

from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

USER_MESSAGE_ROLE: Final[str] = "user"

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

    Select the key (integer id) of the best response from the object, choosing the response that best fulfills the original prompt requirements.
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
    best_response: int


def validate_select_best_response(tool_response: BestResponseSelection, *, candidates: dict[int, Any]) -> None:
    if tool_response["best_response"] not in candidates:
        raise ValidationError("The selected response id is not in a key in the candidates object.")


async def select_best_response[T](
    candidates: dict[int, T],
    prompt: str | PromptTemplate,
    trace_id: str,
) -> T:
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
        system_prompt=SELECT_BEST_RESPONSE_SYSTEM_PROMPT,
        trace_id=trace_id,
    )
    return candidates[response["best_response"]]


@with_exponential_backoff_retry(TooManyRequests, ServiceUnavailable)
async def make_google_completions_request[T](
    *,
    model: str = GENERATION_MODEL,
    prompt_identifier: str,
    response_type: type[T],
    system_prompt: str,
    response_schema: dict[str, Any] | None = None,
    messages: str | list[str],
    temperature: float = 0,
    top_p: float | None = None,
    top_k: int | None = None,
    candidate_count: int | None = None,
    trace_id: str,
    timeout: float = 120,
) -> T:
    client = get_google_ai_client()

    if not isinstance(messages, list):
        messages = [messages]

    message_parts = []
    for message in messages:
        if isinstance(message, str):
            message_parts.append(message)
        else:
            message_parts.append(str(message))

    config = genai.types.GenerateContentConfig(
        response_mime_type=CONTENT_TYPE_JSON,
        response_schema=response_schema,
        temperature=temperature,
        top_p=top_p,
        top_k=top_k,
        candidate_count=candidate_count,
        max_output_tokens=32768,
        system_instruction=system_prompt,
        safety_settings=[
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
            genai.types.SafetySetting(
                category=genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
            ),
        ],
    )

    content = "\n".join(message_parts)
    start_time = datetime.now(UTC)
    response = await client._aio.models.generate_content(  # noqa: SLF001
        model=model,
        contents=content,
        config=config,
        timeout=timeout,
    )
    elapsed_ms = (datetime.now(UTC) - start_time).total_seconds() * 1000

    usage_metadata = getattr(response, "usage_metadata", None)
    if usage_metadata:
        logger.info(
            "Gemini completion",
            prompt_identifier=prompt_identifier,
            model=model,
            elapsed_ms=round(elapsed_ms, 2),
            prompt_tokens=getattr(usage_metadata, "prompt_token_count", None),
            completion_tokens=getattr(usage_metadata, "candidates_token_count", None),
            total_tokens=getattr(usage_metadata, "total_token_count", None),
            trace_id=trace_id,
        )
    else:
        logger.info(
            "Gemini completion",
            prompt_identifier=prompt_identifier,
            model=model,
            elapsed_ms=round(elapsed_ms, 2),
            trace_id=trace_id,
        )

    if not candidate_count:
        return deserialize(response.text or "", response_type)

    prompt = "\n".join([message if isinstance(message, str) else str(message) for message in messages])

    candidates_list = response.candidates or []
    candidates_dict = {}
    for index, candidate in enumerate(candidates_list):
        candidate_text = ""
        if candidate.content and candidate.content.parts:
            for part in candidate.content.parts:
                if hasattr(part, "text") and part.text:
                    candidate_text += part.text
        candidates_dict[index + 1] = deserialize(candidate_text, response_type)

    return await select_best_response(
        candidates=candidates_dict,
        prompt=prompt,
        trace_id=trace_id,
    )


@with_exponential_backoff_retry(
    RateLimitError,
    AnthropicInternalServerError,
    APITimeoutError,
    APIConnectionError,
)
async def _make_anthropic_request(
    client: Any,
    **kwargs: Any,
) -> Any:
    return await client.messages.create(**kwargs)


async def make_anthropic_completions_request[T](
    *,
    model: str,
    response_schema: dict[str, Any],
    response_type: type[T],
    system_prompt: str,
    temperature: float = 0,
    top_k: int | None = None,
    top_p: float | None = None,
    user_prompt: str,
    trace_id: str,
    timeout: float = 120,
) -> T:
    anthropic_client = get_anthropic_client()

    start_time = datetime.now(UTC)

    try:
        response = await _make_anthropic_request(
            anthropic_client,
            model=model,
            max_tokens=8192,
            messages=[{"role": "user", "content": user_prompt}],
            system=system_prompt,
            tools=[
                ToolParam(
                    name="set_output",
                    description="returns the response output",
                    input_schema=response_schema,
                )
            ],
            temperature=temperature,
            top_p=top_p or NOT_GIVEN,
            top_k=top_k or NOT_GIVEN,
            timeout=timeout,
        )
    except (BadRequestError, AuthenticationError, PermissionDeniedError, NotFoundError) as e:
        error_message = str(e)

        if isinstance(e, BadRequestError) and "credit balance" in error_message.lower():
            logger.critical(
                "Anthropic API credit balance insufficient",
                model=model,
                error_type=type(e).__name__,
                error_message=error_message,
                request_id=getattr(e, "request_id", None),
                trace_id=trace_id,
            )
            raise BackendError(
                "Anthropic API credits exhausted. Please contact operations team to add credits.",
                context={"error_type": "CREDIT_EXHAUSTED", "provider": "anthropic"},
            ) from e

        logger.error(
            "Non-retryable Anthropic API error",
            model=model,
            error_type=type(e).__name__,
            error_message=error_message,
            elapsed_ms=(datetime.now(UTC) - start_time).total_seconds() * 1000,
            trace_id=trace_id,
        )
        raise BackendError(
            f"Anthropic API configuration error: {error_message}",
            context={"error_type": type(e).__name__, "provider": "anthropic"},
        ) from e
    except (RateLimitError, AnthropicInternalServerError, APITimeoutError, APIConnectionError) as e:
        logger.warning(
            "Retryable Anthropic API error",
            model=model,
            error_type=type(e).__name__,
            error_message=str(e),
            elapsed_ms=(datetime.now(UTC) - start_time).total_seconds() * 1000,
            trace_id=trace_id,
        )
        raise

    elapsed_ms = (datetime.now(UTC) - start_time).total_seconds() * 1000

    logger.info(
        "Anthropic completion",
        model=model,
        elapsed_ms=round(elapsed_ms, 2),
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        total_tokens=response.usage.input_tokens + response.usage.output_tokens,
        trace_id=trace_id,
    )

    tool_blocks = [block for block in response.content if isinstance(block, ToolUseBlock)]
    if not tool_blocks:
        raise ValidationError("The response does not contain a tool use blocks.")

    try:
        return deserialize(serialize(tool_blocks[0].input), response_type)
    except DeserializationError:
        return deserialize(
            serialize(fix_string_json_values(tool_blocks[0].model_dump(include={"input"})["input"])), response_type
        )


def format_error_for_llm(error: Exception) -> str:
    if isinstance(error, ValidationError):
        context_str = ""
        if hasattr(error, "context") and error.context:
            context_str = "\n\nContext:\n"
            for k, v in error.context.items():
                context_str += f"- {k}: {v}\n"

        return dedent(f"""
            ValidationError: {error!s}
            {context_str}
            Validation failures require specific corrections to the output structure or content.
            Please correct the issues described above.
        """)

    if isinstance(error, InsufficientContextError):
        return dedent(f"""
            InsufficientContextError: {error!s}
            This indicates the information provided is inadequate to complete the task.
            Please identify what additional information is needed and request it explicitly.
        """)

    return f"Error ({type(error).__name__}): {error!s}"


async def handle_completions_request[T](
    *,
    max_attempts: int = 3,
    messages: str | list[str],
    model: str = GENERATION_MODEL,
    prompt_identifier: str,
    response_schema: dict[str, Any] | None = None,
    response_type: type[T],
    system_prompt: str,
    validator: Callable[[T], None] | None = None,
    temperature: float = 0,
    top_p: float | None = None,
    top_k: int | None = None,
    candidate_count: int | None = None,
    timeout: float = 120,  # 2 minutes timeout for LLM API calls ~keep
    trace_id: str,
) -> T:
    attempts = 0

    response: T | None = None
    error_message: str | None = None
    errors: list[Exception] = []

    while attempts < max_attempts:
        try:
            msgs = [messages] if isinstance(messages, str) else messages
            if error_message:
                msgs = [*messages, error_message]

            if model == ANTHROPIC_SONNET_MODEL:
                if not isinstance(messages, str):
                    raise BackendError("User prompt must be a string")

                if not response_schema:
                    raise BackendError("Response schema must be provided")

                response = await make_anthropic_completions_request(
                    model=model,
                    response_type=response_type,
                    system_prompt=system_prompt,
                    user_prompt=str(msgs),
                    response_schema=response_schema,
                    temperature=temperature,
                    top_p=top_p,
                    top_k=top_k,
                    trace_id=trace_id,
                    timeout=timeout,
                )
            else:
                response = await make_google_completions_request(
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
                    trace_id=trace_id,
                    timeout=timeout,
                )

            if validator:
                validator(response)
            return response
        except ValidationError as e:
            attempts += 1
            logger.warning(
                "Validation error in completion request",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                error=str(e),
                error_context=e.context if hasattr(e, "context") else None,
                trace_id=trace_id,
            )
            error_message = f"""
            The last response from the API failed validation due to the following error:
                <error>
                {format_error_for_llm(e)}
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
        except (TimeoutError, APITimeoutError):
            attempts += 1
            logger.warning(
                "LLM API call timed out",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                timeout_seconds=timeout,
                trace_id=trace_id,
            )
            timeout_error = LLMTimeoutError(
                f"LLM API call timed out after {timeout} seconds",
                context={"timeout": timeout, "prompt_identifier": prompt_identifier}
            )
            errors.append(timeout_error)

            # If this is the last attempt, raise our custom timeout error
            if attempts >= max_attempts:
                raise timeout_error
        except DeserializationError as e:
            attempts += 1
            logger.warning(
                "Deserialization error in completion request",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                error=str(e),
                trace_id=trace_id,
            )
            error_message = f"""
            The last API call with the provided prompt returned an invalid JSON object.

            This is the error:
            <error>
            {e!s}
            </error>

            Following are the original messages sent to the model, which may help you identify the issue.
            Address the errors and return corrected content
            """
            errors.append(e)
        except BackendError as e:
            if e.context and e.context.get("error_type") == "CREDIT_EXHAUSTED":
                logger.critical(
                    "Anthropic credits exhausted, attempting fallback to Google",
                    prompt_identifier=prompt_identifier,
                    attempt=attempts,
                    max_attempts=max_attempts,
                    trace_id=trace_id,
                )
                if model == ANTHROPIC_SONNET_MODEL:
                    model = GENERATION_MODEL
                    attempts -= 1
                    continue
                raise BackendError(
                    "All AI providers unavailable. Please contact operations.",
                    context={"error_type": "ALL_PROVIDERS_FAILED"},
                ) from e
            raise
        except AnthropicInternalServerError as e:
            logger.warning(
                "Internal server error received from Anthropic in completion request. Switching to Google.",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                error=str(e),
                error_type=type(e).__name__,
                trace_id=trace_id,
            )
            if model == ANTHROPIC_SONNET_MODEL:
                model = GENERATION_MODEL
                attempts -= 1
            else:
                errors.append(e)
                attempts += 1
        except GoogleInternalServerError as e:
            logger.warning(
                "Internal server error received from Google in completion request. Switching to Anthropic.",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                error=str(e),
                error_type=type(e).__name__,
                trace_id=trace_id,
            )
            if model == GENERATION_MODEL:
                model = ANTHROPIC_SONNET_MODEL
                attempts -= 1
            else:
                errors.append(e)
                attempts += 1
        except (ServiceUnavailable, TooManyRequests) as e:
            logger.warning(
                "Google API temporarily unavailable, switching to Anthropic",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                error=str(e),
                error_type=type(e).__name__,
                trace_id=trace_id,
            )
            if model == GENERATION_MODEL:
                model = ANTHROPIC_SONNET_MODEL
                attempts -= 1
            else:
                errors.append(e)
                attempts += 1
        except (RateLimitError, APITimeoutError, APIConnectionError) as e:
            logger.warning(
                "Anthropic API temporarily unavailable, switching to Google",
                prompt_identifier=prompt_identifier,
                attempt=attempts,
                max_attempts=max_attempts,
                error=str(e),
                error_type=type(e).__name__,
                trace_id=trace_id,
            )
            if model == ANTHROPIC_SONNET_MODEL:
                model = GENERATION_MODEL
                attempts -= 1
            else:
                errors.append(e)
                attempts += 1

    raise RagError(
        f"Failed to generate text after {max_attempts} attempts.",
        context={
            "errors": errors,
            "prompt_identifier": prompt_identifier,
            "attempts": [
                {
                    "attempt": i + 1,
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "error_context": getattr(e, "context", None),
                }
                for i, e in enumerate(errors)
            ],
            "recovery_instruction": "Review the errors from each attempt to understand the persistent issues",
        },
    )
