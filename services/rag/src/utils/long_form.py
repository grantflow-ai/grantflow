from time import time
from typing import Any, Final, TypedDict

from packages.shared_utils.src.ai import (
    CUSTOM_MODEL_REASON,
    GEMINI_FLASH_LITE_MODEL,
    GEMINI_FLASH_MODEL,
    GENERATION_MODEL,
    MODEL_SELECTION_REASON,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.text import concatenate_segments_with_spacy_coherence, count_words, normalize_markdown

from services.rag.src.constants import MISSING_INFO_FORMAT
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


MAX_API_CALLS: Final[int] = 5


def select_optimal_model_for_length(max_words: int) -> str:
    if max_words <= 600:
        return GEMINI_FLASH_MODEL
    return GEMINI_FLASH_LITE_MODEL


LONG_FORM_GENERATION_SYSTEM_PROMPT: Final[str] = """
Generate scientifically accurate, well-structured text for STEM grant applications.
Synthesize information from provided sources, maintaining technical precision and academic tone.
Flag missing information rather than fabricating content.
"""


LONG_FORM_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="long_form_generation",
    template="""
Generate text segment for STEM grant application section.

## Input

<task_description>${task_description}</task_description>

<already_generated_text>${already_generated_text}</already_generated_text>

<sources>${sources}</sources>

Length: ${min_words}-${max_words} words

## Requirements

1. Source Usage: Quote and reference extensively from provided scientific sources (real research papers and data)

2. Continuation: Seamlessly continue from previously generated text with consistent terminology and flow

3. Writing Style:
   - High information density with field-specific terminology
   - Expert-level writing (no acronym definitions)
   - Formal academic tone with passive voice
   - Logical sequence with clear transitions

4. Information Integrity:
   - Never fabricate facts or methodologies
   - Use `${missing_info_format}` for missing information
   - Cite sources when citation formats provided

## Output

Return JSON with:
- text: Generated segment
- is_complete: true if section finished, false if more generation needed

Note: Missing information markers don't make text incomplete - they highlight gaps in sources.
""",
)

SHORTEN_TEXT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="shorten_text",
    template="""
Reduce STEM grant text length while preserving scientific accuracy.

## Input

<text>${text}</text>

## Requirements

- Reduce by at least ${words_overflow} words
- Maintain essential scientific information and academic tone
- Preserve [MISSING INFORMATION] markers, citations, and logical flow

## Strategy

1. Remove redundancies and verbose descriptions
2. Condense explanations while maintaining technical precision
3. Eliminate tangential examples
4. Consolidate similar points
5. Tighten transitions

Return only the revised text with reduced word count.
""",
)

LONG_FORM_SCHEMA = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "is_complete": {"type": "boolean"},
    },
    "required": ["text", "is_complete"],
}


class LongFormToolResponse(TypedDict):
    text: str
    is_complete: bool


async def handle_long_form_text_generation(
    *,
    max_words: int,
    min_words: int,
    prompt_identifier: str,
    task_description: str,
    max_api_calls: int = MAX_API_CALLS,
    model: str = GENERATION_MODEL,
    timeout: float = 300,
    trace_id: str,
    **sources: Any,
) -> str:
    result = ""

    api_call_num = 1

    time()
    while api_call_num <= max_api_calls:
        compressed_sources = compress_prompt_text(str(sources), aggressive=True)

        full_prompt = LONG_FORM_GENERATION_USER_PROMPT.to_string(
            task_description=task_description,
            min_words=min_words,
            max_words=max_words,
            sources=compressed_sources,
            already_generated_text=result,
            missing_info_format=MISSING_INFO_FORMAT,
        )

        response = await handle_completions_request(
            prompt_identifier=prompt_identifier,
            response_schema=LONG_FORM_SCHEMA,
            messages=full_prompt,
            response_type=LongFormToolResponse,
            model=model,
            system_prompt=LONG_FORM_GENERATION_SYSTEM_PROMPT,
            temperature=0.4,
            top_p=0.9,
            timeout=timeout,
            trace_id=trace_id,
        )

        result = concatenate_segments_with_spacy_coherence([result, response["text"]])
        current_word_count = count_words(result)

        api_call_num += 1
        if response["is_complete"]:
            break

        if api_call_num > max_api_calls:
            logger.warning(
                "Reached maximum API calls for text generation",
                entity_identifier=prompt_identifier,
                max_api_calls=max_api_calls,
                word_count=current_word_count,
                trace_id=trace_id,
            )
            break

    word_count = count_words(result)
    if word_count < min_words:
        logger.warning(
            "Generated text is shorter than minimum required word count",
            entity_identifier=prompt_identifier,
            word_count=word_count,
            min_words=min_words,
            trace_id=trace_id,
        )

    return normalize_markdown(result)


async def generate_long_form_text(
    *,
    max_words: int,
    min_words: int,
    prompt_identifier: str,
    task_description: str,
    max_api_calls: int = MAX_API_CALLS,
    model: str = GENERATION_MODEL,
    buffer_words: int = 150,
    timeout: float = 300,
    trace_id: str,
    **sources: Any,
) -> str:
    buffered_min_words = min_words + buffer_words
    buffered_max_words = max_words + buffer_words

    optimal_model = select_optimal_model_for_length(max_words)
    selected_model = optimal_model if model == GENERATION_MODEL else model

    logger.info(
        "Starting long-form text generation",
        prompt_identifier=prompt_identifier,
        min_words=min_words,
        max_words=max_words,
        buffer_words=buffer_words,
        buffered_min_words=buffered_min_words,
        buffered_max_words=buffered_max_words,
        selected_model=selected_model,
        model_selection_reason=MODEL_SELECTION_REASON if selected_model == GENERATION_MODEL else CUSTOM_MODEL_REASON,
        trace_id=trace_id,
    )

    long_form_text = await handle_long_form_text_generation(
        max_words=buffered_max_words,
        min_words=buffered_min_words,
        prompt_identifier=prompt_identifier,
        task_description=task_description,
        max_api_calls=max_api_calls,
        model=selected_model,
        timeout=timeout,
        trace_id=trace_id,
        **sources,
    )

    long_form_length = count_words(long_form_text)
    logger.info(
        "Initial text generation complete",
        prompt_identifier=prompt_identifier,
        word_count=long_form_length,
        max_words=max_words,
        trace_id=trace_id,
    )

    max_shortening_attempts = 3
    attempts = 0
    while long_form_length > max_words and attempts < max_shortening_attempts:
        words_overflow = long_form_length - max_words

        compressed_text = compress_prompt_text(long_form_text, aggressive=True)

        long_form_text = await handle_long_form_text_generation(
            max_words=buffered_max_words,
            min_words=buffered_min_words,
            prompt_identifier=f"{prompt_identifier}_shorten_{attempts}",
            task_description=SHORTEN_TEXT_PROMPT.to_string(text=compressed_text, words_overflow=words_overflow),
            model=selected_model,
            timeout=timeout,
            trace_id=trace_id,
        )

        long_form_length = count_words(long_form_text)
        attempts += 1

    return long_form_text
