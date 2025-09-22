from time import time
from typing import Any, Final, TypedDict

from packages.shared_utils.src.ai import GENERATION_MODEL
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.text import concatenate_segments_with_spacy_coherence, count_words, normalize_markdown

from services.rag.src.constants import (
    CUSTOM_MODEL_REASON,
    GEMINI_FLASH_LITE_MODEL,
    GEMINI_FLASH_MODEL,
    MODEL_SELECTION_REASON,
)
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
You are a specialized long-form text generation component in a RAG system dedicated to generating STEM grant applications.

Your primary responsibility is to generate scientifically accurate, well-structured, and cohesive text that meets rigorous academic standards. You excel at:
1. **MAXIMIZING USE OF PROVIDED SCIENTIFIC DATA** - the sources contain real research papers and data from scientists
2. Synthesizing information from provided sources without fabricating details - quote and reference extensively
3. Maintaining consistent technical terminology and precise scientific language FROM THE PROVIDED SOURCES
4. Writing with high information density appropriate for expert reviewers USING RAG DATA
5. Ensuring logical flow between text segments in multi-part generation
6. Flagging missing information rather than inventing content
7. **Pre-identifying and incorporating scientific n-grams** from sources before writing
8. Using compound scientific terminology and domain-specific phrases for professional precision FROM RAG CONTEXT
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

    ## Source Materials (Scientific Papers Data)
    **CRITICAL: These are real research papers and scientific data provided by scientists. You MUST use this data extensively.**
    <sources>
    ${sources}
    </sources>

    ## Generation Guidelines
    1. **RAG Data Usage (PRIMARY REQUIREMENT)**:
       - **QUOTE AND REFERENCE EXTENSIVELY** from the provided scientific sources
       - These sources contain real research data that scientists want incorporated
       - Before writing, identify specific n-grams from sources:
         * At least 5 scientific 1-grams (technical terms)
         * 5-10 relevant 2-grams (compound terms)
         * 5-10 relevant 3-grams (technical phrases)
         * 5-10 relevant 4-grams (complex expressions)
       - Treat sources as your primary material - maximize their usage

    2. Content Analysis:
       - Carefully assess the task description and source materials
       - Identify all available and missing information critical to the task
       - **Focus on extracting maximum value from provided scientific data**

    3. Continuation Strategy:
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

    4. Scientific Terminology and N-gram Integration:
       - Prioritize scientific terms, bigrams, and 3-grams from the provided sources
       - Use compound scientific terminology naturally (e.g., "tumor microenvironment", "single-cell sequencing")
       - Incorporate technical bigrams and trigrams throughout the text for professional precision
       - Employ domain-specific 4-gram sequences where appropriate
       - Maintain consistent usage of specialized terminology from source materials
       - Create coherent technical phrases that enhance scientific rigor and specificity

    5. Information Integrity:
       - NEVER invent or fabricate facts, data, or methodologies not present in the sources
       - When critical information is missing, use this exact format: `**[MISSING INFORMATION: specific description]**`
       - Cite sources accurately if citation formats are provided in source materials

    ## Task Completion
    Generate the text segment following the guidelines above. Indicate completion status:
    - Mark as complete when the section is finished, even if it contains missing information markers
    - Mark as incomplete when more generation is needed to complete the full text

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
        full_prompt = LONG_FORM_GENERATION_USER_PROMPT.to_string(
            task_description=task_description,
            min_words=min_words,
            max_words=max_words,
            sources=sources,
            already_generated_text=result,
        )
        prompt = compress_prompt_text(full_prompt, aggressive=True)

        response = await handle_completions_request(
            prompt_identifier=prompt_identifier,
            response_schema=LONG_FORM_SCHEMA,
            messages=prompt,
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
        model_selection_reason=MODEL_SELECTION_REASON if model == GENERATION_MODEL else CUSTOM_MODEL_REASON,
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

        long_form_text = await handle_long_form_text_generation(
            max_words=buffered_max_words,
            min_words=buffered_min_words,
            prompt_identifier=f"{prompt_identifier}_shorten_{attempts}",
            task_description=compress_prompt_text(
                SHORTEN_TEXT_PROMPT.to_string(text=long_form_text, words_overflow=words_overflow), aggressive=True
            ),
            model=selected_model,
            timeout=timeout,
            trace_id=trace_id,
        )

        long_form_length = count_words(long_form_text)
        attempts += 1

    return long_form_text
