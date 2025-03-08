from time import time
from typing import Any, Final, TypedDict

from src.constants import ANTHROPIC_SONNET_MODEL, GENERATION_MODEL
from src.rag.completion import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.text import concatenate_segments_with_spacy_coherence, count_words, normalize_markdown

logger = get_logger(__name__)


MAX_API_CALLS: Final[int] = 5

LONG_FORM_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are a specialized long-form text generation component in a RAG system dedicated to generating STEM grant applications.

Your primary responsibility is to generate scientifically accurate, well-structured, and cohesive text that meets rigorous academic standards. You excel at:
1. Synthesizing information from provided sources without fabricating details
2. Maintaining consistent technical terminology and precise scientific language
3. Writing with high information density appropriate for expert reviewers
4. Ensuring logical flow between text segments in multi-part generation
5. Flagging missing information rather than inventing content
"""


LONG_FORM_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="long_form_generation",
    template="""
    ## Task Overview
    Generate a high-quality segment of text for a STEM grant application. This text will be part of a multi-step generation process for a complete grant application section.

    ## Task Requirements
    <task_description>
    ${task_description}
    </task_description>

    ## Previously Generated Text
    <already_generated_text>
    ${already_generated_text}
    </already_generated_text>

    **Length Requirements**: The complete text must be between ${min_words} words (minimum) and ${max_words} words (maximum).

    ## Source Materials
    Use ONLY the following sources for your generation. Do not incorporate external knowledge or make up information.
    <sources>
    ${sources}
    </sources>

    ## Generation Guidelines
    1. Content Analysis:
       - Carefully assess the task description and source materials
       - Identify all available and missing information critical to the task

    2. Continuation Strategy:
       - Seamlessly continue from the previously generated text
       - Maintain consistent scientific terminology, writing style, and narrative flow
       - Never repeat content already covered in previous segments

    3. Scientific Writing Principles:
       - Maximize information density with precise, field-specific terminology
       - Write for expert reviewers who understand technical concepts without explanation
       - Present methodologies, results, and implications with formal, data-driven language
       - Use passive voice and academic tone appropriate for grant applications
       - Arrange content in a logical sequence with clear transitions between ideas
       - Do not define acronyms; assume a separate acronyms table exists

    4. Information Integrity:
       - NEVER invent or fabricate facts, data, or methodologies not present in the sources
       - When critical information is missing, use this exact format: `**[MISSING INFORMATION: specific description]**`
       - Cite sources accurately if citation formats are provided in source materials

    ## Output Format
    Respond with a valid JSON object following this schema:
    ```json
    {
        "text": "The generated text segment with academic formatting and appropriate paragraph breaks",
        "is_complete": true or false
    }
    ```

    Set "is_complete" to:
    - true: When the section is finished, even if it contains missing information markers
    - false: When more generation is needed to complete the full text

    Note: Missing information markers do not make a text incomplete - they simply highlight gaps in the source materials.
""",
)

SHORTEN_TEXT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="shorten_text",
    template="""
    ## Scientific Text Revision Task
    You must reduce the length of this STEM grant application text while preserving scientific accuracy and core meaning.

    ## Text To Revise
    <text>
    ${text}
    </text>

    ## Requirements
    - Reduce the text by at least ${words_overflow} words
    - The final version must maintain all essential scientific information
    - Preserve the academic tone and formal structure

    ## Revision Strategy
    1. Prioritize content analysis:
       - Identify the central scientific claims, methodologies, and results
       - Distinguish between essential content and supporting/contextual information

    2. Apply targeted reduction techniques:
       - Remove redundancies and unnecessarily verbose descriptions
       - Condense lengthy explanations while maintaining technical precision
       - Eliminate tangential examples that aren't crucial to understanding
       - Consolidate similar points or methodological descriptions
       - Tighten transitions between concepts

    3. Preserve scientific integrity:
       - Do not remove critical data points, measurements, or core methodologies
       - Maintain all essential citations and references to prior work
       - Ensure any **[MISSING INFORMATION]** markers remain intact
       - Keep the logical flow of arguments and experimental descriptions

    ## Output Format
    Provide only the revised text with the reduced word count. Maintain appropriate formatting including paragraph structure and any special markup.
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
            system_prompt=LONG_FORM_GENERATION_SYSTEM_PROMPT,
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
