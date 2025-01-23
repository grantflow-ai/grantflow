from functools import partial
from time import time
from typing import Final, TypedDict

from src.exceptions import EvaluationError
from src.rag.llm_evaluation import with_prompt_evaluation
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.text import concatenate_segments_with_spacy_coherence, normalize_markdown

logger = get_logger(__name__)

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


async def generate_segmeneted_text(
    user_prompt: str,
    *,
    prompt_identifier: str = "",
) -> str:
    """Generate segmented text.

    Args:
        user_prompt: The user prompt string to send to the model.
        prompt_identifier: The identifier of the entity to generate text for.

    Returns:
        The generated text.
    """
    results: list[str] = []

    api_call_num = 1

    logger.info("Generating text", entity_identifier=prompt_identifier)
    start_time = time()
    while api_call_num < 5:
        last_generation_result = results[-1] if results else None

        response = await handle_completions_request(
            prompt_identifier=prompt_identifier,
            response_schema=SEGMENTED_GENERATION_SCHEMA,
            system_prompt="Generate the next segment of text.",
            messages=[
                user_prompt,
                SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS,
                CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.to_string(last_generation_result=last_generation_result),
            ]
            if last_generation_result
            else [SEGMENTED_GENERATION_OUTPUT_INSTRUCTIONS, user_prompt],
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


async def handle_segmented_text_generation(
    *,
    prompt_identifier: str = "",
    user_prompt: str,
    retries: int = 3,
) -> str:
    """Handle the generation of segmented text.

    Args:
        prompt_identifier: The identifier of the entity to generate text for.
        user_prompt: The user prompt string to send to the model.
        retries: The number of retries to attempt.

    Returns:
        The generated text.
    """
    try:
        return await with_prompt_evaluation(
            prompt_handler=partial(generate_segmeneted_text, prompt_identifier=prompt_identifier),
            user_prompt=user_prompt,
            retries=retries,
        )
    except EvaluationError as e:
        logger.error("Failed to generate segmented text", prompt_identifier=prompt_identifier, error=e)
        return "**Failed to generate text for this section due to insufficient information.**"
