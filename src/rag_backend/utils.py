import logging
from collections.abc import Callable, Coroutine
from json import dumps
from string import Template
from typing import Any, Final, TypedDict, TypeVar

from openai import OpenAIError, RateLimitError
from openai.types import ChatModel
from openai.types.chat import ChatCompletionSystemMessageParam, ChatCompletionToolParam, ChatCompletionUserMessageParam
from openai.types.shared_params import FunctionDefinition, ResponseFormatJSONObject

from src.rag_backend.constants import FAST_TEXT_GENERATION_MODEL, PREMIUM_TEXT_GENERATION_MODEL, TWO_SECONDS
from src.rag_backend.dto import GenerationResult
from src.utils.exceptions import DeserializationError, OpenAIFailureError
from src.utils.llm import get_generation_model
from src.utils.retry import exponential_backoff_retry
from src.utils.serialization import deserialize
from src.utils.sleep import sleep_with_message
from src.utils.text import concatenate_segments_with_spacy_coherence

T = TypeVar("T", bound=dict[str, Any])
logger = logging.getLogger(__name__)

SEGMENTED_GENERATION_TOOLS = [
    ChatCompletionToolParam(
        type="function",
        function=FunctionDefinition(
            name="response_handler",
            parameters={
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
            },
        ),
    )
]

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

EvaluationTools = [
    ChatCompletionToolParam(
        type="function",
        function=FunctionDefinition(
            name="response_handler",
            parameters={
                "type": "object",
                "properties": {
                    "choice": {
                        "type": "number",
                        "description": "The chosen option id",
                    },
                },
                "required": ["choice"],
                "additionalProperties": False,
            },
        ),
    )
]


EVALUATION_PROMPT: Final[Template] = Template("""
You are a critical evaluator tasked with selecting the best output among given options.
Here are the options as a JSON object where the keys are numerical ids (1,2,3 etc...) and the values are the choice contents:

<choices>
${choices}
</choices>

Choose the best content:
- **Information Density:** The response should contain relevant and concise information.
- **Correctness:** The response should be factually accurate.
- **Coherence:** The response should flow logically.
- **Quality:** The response should exhibit clarity and depth.
- **Style:** The response should maintain a professional and engaging tone.

Respond with a JSON object containing the chosen option's id. Example:

```jsonc
{
    "choice": 2
}
""")


class ChoiceResult(TypedDict):
    """The response returned by the evaluation logic."""

    choice: int
    """The chosen option id."""


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

    logger.info("Generating %s: %s", entity_type, entity_identifier)
    while api_call_num < 20:
        if api_call_num > 1:
            await sleep_with_message(api_call_num + TWO_SECONDS, "Segment generation buffer")

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


@exponential_backoff_retry(DeserializationError)
async def handle_tool_call_request(
    *,
    model: ChatModel = PREMIUM_TEXT_GENERATION_MODEL,
    output_instructions: str = SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS,
    response_type: type[T] = GenerationResult,  # type: ignore[assignment]
    system_prompt: str,
    tools: list[ChatCompletionToolParam] | None = None,
    user_prompt: str,
    num_choices: int = 2,  # Generate multiple choices
) -> T:
    """Handle a tool call request for segmented text generation.

    Args:
        model: The model to use for the generation.
        output_instructions: The output instructions.
        response_type: The response type.
        system_prompt: The system prompt.
        tools: The tools to use for the generation.
        user_prompt: The user prompt.
        num_choices: The number of choices to generate.

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
            tools=tools or SEGMENTED_GENERATION_TOOLS,
            temperature=0.7,  # Encourage diversity
            n=num_choices,  # Generate multiple completions
        )

        results: list[T] = []

        for choices in response.choices:
            if tool_calls := choices.message.tool_calls:
                results.extend([deserialize(tool_call.function.arguments, response_type) for tool_call in tool_calls])

        if results:
            logger.info("Successfully generated text segment")
            if num_choices > 1:
                return await evaluate_and_choose_best_choice(choices=results)

            return results[0]

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


async def evaluate_and_choose_best_choice(
    choices: list[T],
) -> T:
    """Evaluate and choose the best choice among the given options.

    Args:
        choices: The list of choices to evaluate.

    Raises:
        OpenAIFailureError: If an error occurs during the evaluation.

    Returns:
        The chosen option.
    """
    client = get_generation_model()
    mapped_choices = dict[int, T](enumerate(choices, start=1))
    try:
        prompt = EVALUATION_PROMPT.substitute(
            choices=dumps(mapped_choices),
        )

        response = await client.chat.completions.create(
            model=FAST_TEXT_GENERATION_MODEL,
            response_format=ResponseFormatJSONObject(type="json_object"),
            messages=[ChatCompletionUserMessageParam(role="user", content=prompt)],
            tools=EvaluationTools,
            temperature=0.0,
        )

        if response.choices[0].message.tool_calls:
            result = deserialize(response.choices[0].message.tool_calls[0].function.arguments, ChoiceResult)
            logger.info("Successfully generated text segment")
            return mapped_choices[result["choice"]]

        logger.warning("Response content is empty, raising OperationError: %s", response.model_dump_json())
        raise OpenAIFailureError(message="Response content is empty", context=response.model_dump_json())
    except OpenAIError as e:
        logger.warning("Received non-existing index from model: %s, choices: %s", e, dumps(list(mapped_choices.keys())))
        raise OpenAIFailureError(message="Error during evaluation", context=str(e)) from e
    except IndexError as e:
        logger.warning("Received non-existing index from model: %s, choices: %s", e, dumps(list(mapped_choices.keys())))
        raise OpenAIFailureError(message="Error during evaluation", context=str(e)) from e
