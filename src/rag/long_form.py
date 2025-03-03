from time import time
from typing import Any, Final, TypedDict

from src.constants import ANTHROPIC_SONNET_MODEL, GENERATION_MODEL
from src.rag.completion import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.text import concatenate_segments_with_spacy_coherence, count_words, normalize_markdown

logger = get_logger(__name__)

# Maximum number of API calls for text generation
MAX_API_CALLS: Final[int] = 5

LONG_FORM_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="long_form_generation",
    template="""
    You are a specialized component long-form text generation component in a RAG system dedicated to generating STEM grant applications.

    ## Text Generation
    Your task is to generate a text segment, which is a part of a longer text that is being generated across multiple API calls.

    Here is the description of the text requirements:
        <task_description>
        ${task_description}
        <task_description>

    Here is the previously generated text:
        <already_generated_text>
        ${already_generated_text}
        </already_generated_text>

    **important**: The entire text should be at least ${min_words} words long and at most ${max_words} words long.

    ## Sources
    These are the sources for generation. Use these sources exclusively for generating the output.
    The sources are provided as a JSON object. The top-level keys of the object indicate the type of the source.
        <sources>
        ${sources}
        </sources>

    ## Instructions
    Follow these steps to complete the task:
        1. Begin by analyzing the task description.
        2. If a previously generated text is provided above:
            - Analyze the provided text segment, focusing on its content, style, and end point.
            - Continue the grant application writing from exactly where the previous segment ends.
            - Maintain consistency in style, tone, narrative and context with the original text.
            - Avoid repeating information already presented in the previous segment.

    ## Output
    Respond with a JSON object adhering to the following format:

    ```jsonc
    {
        "text": "The generated text segment",
        "is_complete": true // false if the text is incomplete and requires further generation
    }

    **Important!**:
        - if the text is complete but information is missing, is_complete should be true.
        - Remember: if you are missing information in the sources (inputs + rag results), do not invent facts or complete the missing information from your training data, instead write `**[MISSING INFORMATION: description]**` where description is a concise description of the missing information.
    ```
""",
)

SHORTEN_TEXT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="shorten_text",
    template="""
    ## Task
    Your task is to shorten the following text.

    Here is the text to be shortened:
        <text>
        ${text}
        </text>

    You should shorten it by at least ${words_overflow} words.

    ## Instructions
    Follow these instructions to complete the task:
        1. Begin by analyzing the text provided.
        2. Identify the core information and essential parts of the text.
        3. Shorten the text by removing the least necessary information.
        4. Ensure that the shortened text maintains the original meaning and context.
        5. Respond with the shortened text.

    ## Output
    Respond with the shortened text.
""",
)

LONG_FORM_SCHEMA = {
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


class LongFormToolResponse(TypedDict):
    """The response from the long-form text generation."""

    text: str
    """The generated text."""
    is_complete: bool
    """Whether the text is complete or not."""


async def handle_long_form_text_generation(
    *,
    max_words: int,
    min_words: int,
    prompt_identifier: str,
    task_description: str,
    max_api_calls: int = MAX_API_CALLS,
    model: str = GENERATION_MODEL,
    **sources: Any,
) -> str:
    """Generate the long-form text for a given prompt.

    Args:
        max_words: The maximum number of words to generate.
        min_words: The minimum number of words to generate.
        prompt_identifier: The identifier of the entity to generate text for.
        task_description: The description of the task.
        max_api_calls: Maximum number of API calls to make for text generation.
        model: The model to use for text generation.
        **sources: Additional keyword arguments for the generation process.
            These are passed directly to the prompt template and may include
            retrieved documents, reference sources, or other context needed
            for text generation.

    Returns:
        The generated long-form text.
    """
    result = ""

    api_call_num = 1

    logger.info(
        "Starting text generation", entity_identifier=prompt_identifier, min_words=min_words, max_words=max_words
    )
    start_time = time()
    while api_call_num <= max_api_calls:
        logger.info(
            "Making API call for text generation",
            entity_identifier=prompt_identifier,
            api_call_num=api_call_num,
            current_word_count=count_words(result),
        )

        prompt = LONG_FORM_GENERATION_USER_PROMPT.to_string(
            task_description=task_description,
            min_words=min_words,
            max_words=max_words,
            sources=sources,
            already_generated_text=result,
        )

        response = await handle_completions_request(
            prompt_identifier=prompt_identifier,
            response_schema=LONG_FORM_SCHEMA,
            messages=prompt,
            response_type=LongFormToolResponse,
            model=model,
        )

        result = concatenate_segments_with_spacy_coherence([result, response["text"]])
        current_word_count = count_words(result)

        logger.info(
            "Text generation progress",
            entity_identifier=prompt_identifier,
            api_call_num=api_call_num,
            current_word_count=current_word_count,
            min_words=min_words,
            is_complete=response["is_complete"],
        )

        api_call_num += 1
        if response["is_complete"]:
            logger.info(
                "Text generation marked as complete by LLM",
                entity_identifier=prompt_identifier,
                word_count=current_word_count,
            )
            break

        if api_call_num > max_api_calls:
            logger.warning(
                "Reached maximum API calls for text generation",
                entity_identifier=prompt_identifier,
                max_api_calls=max_api_calls,
                word_count=current_word_count,
            )
            break

    # Validate word count meets minimum requirement
    word_count = count_words(result)
    if word_count < min_words:
        logger.warning(
            "Generated text is shorter than minimum required word count",
            entity_identifier=prompt_identifier,
            word_count=word_count,
            min_words=min_words,
        )

    logger.info(
        "Completed text generation",
        prompt_identifier=prompt_identifier,
        api_call_num=api_call_num - 1,
        generation_duration=int(time() - start_time),
        word_count=word_count,
    )

    return normalize_markdown(result)


async def generate_long_form_text(
    *,
    max_words: int,
    min_words: int,
    prompt_identifier: str,
    task_description: str,
    max_api_calls: int = MAX_API_CALLS,
    **sources: Any,
) -> str:
    """Generate long-form text.

    Args:
        max_words: The maximum number of words to generate.
        min_words: The minimum number of words to generate.
        prompt_identifier: The identifier of the entity to generate text for.
        task_description: The description of the task.
        max_api_calls: Maximum number of API calls to make for text generation.
        **sources: Additional keyword arguments to pass to the prompt handler.
            These are passed directly to the prompt template and may include
            retrieved documents, reference sources, or other context needed
            for text generation.

    Returns:
        The generated text.
    """
    logger.info(
        "Starting long-form text generation",
        prompt_identifier=prompt_identifier,
        min_words=min_words,
        max_words=max_words,
    )

    long_form_text = await handle_long_form_text_generation(
        max_words=max_words,
        min_words=min_words,
        prompt_identifier=prompt_identifier,
        task_description=task_description,
        max_api_calls=max_api_calls,
        **sources,
    )

    long_form_length = count_words(long_form_text)
    logger.info(
        "Initial text generation complete",
        prompt_identifier=prompt_identifier,
        word_count=long_form_length,
        max_words=max_words,
    )

    # Attempt to shorten text if it's too long
    max_shortening_attempts = 3
    attempts = 0
    while long_form_length > max_words and attempts < max_shortening_attempts:
        words_overflow = long_form_length - max_words

        logger.info(
            "Text too long, attempting to shorten",
            prompt_identifier=prompt_identifier,
            attempt=attempts,
            max_attempts=max_shortening_attempts,
            words_overflow=words_overflow,
            current_length=long_form_length,
            target_max=max_words,
        )

        long_form_text = await handle_long_form_text_generation(
            max_words=max_words,
            min_words=min_words,
            prompt_identifier=f"{prompt_identifier}_shorten_{attempts}",
            task_description=SHORTEN_TEXT_PROMPT.to_string(text=long_form_text, words_overflow=words_overflow),
            model=ANTHROPIC_SONNET_MODEL,
        )

        long_form_length = count_words(long_form_text)
        logger.info(
            "Shortening attempt result",
            prompt_identifier=prompt_identifier,
            attempt=attempts,
            new_word_count=long_form_length,
        )
        attempts += 1

    logger.info(
        "Long-form text generation completed successfully",
        prompt_identifier=prompt_identifier,
        final_word_count=count_words(long_form_text),
        min_words=min_words,
        max_words=max_words,
    )

    return long_form_text
