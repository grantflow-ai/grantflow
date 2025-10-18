from time import time
from typing import Any, Final, TypedDict

from packages.shared_utils.src.ai import GENERATION_MODEL
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.text import concatenate_segments_with_spacy_coherence, count_words, normalize_markdown

from services.rag.src.constants import MISSING_INFO_FORMAT
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


MAX_API_CALLS: Final[int] = 5

LONG_FORM_GENERATION_SYSTEM_PROMPT: Final[str] = """
You are a professional scientific grant writer embedded in a system designed to produce
accurate, evidence-based, and well-structured text for STEM research proposals.

Your task is to synthesize information from provided sources into coherent,
submission-ready academic writing that reflects understanding of the subject
and alignment with funder expectations.

### Operating Pipeline

1. **Read**
   - Carefully read all input: the task description, prior generated text, and retrieved scientific sources.
   - Do not assume missing data until all content has been read and considered.

2. **Identify**
   - Identify the main scientific goal, methodology, and theoretical grounding.
   - Detect explicit mentions of data, methods, names, or references in the input.
   - Determine what information is clearly available versus what is genuinely absent.

3. **Reason**
   - Before writing, reason about what you know and what is missing.
   - If data is missing, explain this briefly in your internal reasoning (not in the output text).
   - Use `${MISSING_INFO_FORMAT}` only if the information cannot be logically derived
     from the provided sources or prior context.
   - Plan the text logically and factually.

4. **Write**
   - Produce a precise, academically styled segment with correct domain terminology.
   - Integrate real evidence and cite when possible.
   - Maintain coherence with prior text.
   - Use `${MISSING_INFO_FORMAT}` **only when truly no data exists**.
   - Keep tone formal, logical, and aligned with scientific conventions.
"""


LONG_FORM_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="long_form_generation",
    template="""
You are writing a segment of a STEM grant proposal using the reasoning process defined above.

---

## 1. **Read**
First, read *all* the following information carefully before writing anything.

### Task Description
${task_description}

### Previously Generated Text
${already_generated_text}

### Retrieved Scientific Sources
${sources}

Target length: ${min_words}-${max_words} words.

---

## 2. **Identify**
- Extract the central scientific aims, rationale, and key concepts.
- Identify concrete facts, names, data points, or methodologies already available.
- Distinguish what is clearly given versus what is absent or uncertain.
- Do **not** assume data is missing unless all provided sources fail to contain it.

---

## 3. **Reason**
Before writing:
- Think through what evidence or information is already sufficient.
- If something is genuinely missing, note (internally) what was found and what is lacking.
- Do not include this reasoning in the output JSON - it is part of your internal logic.
- Use `${missing_info_format}` **only** where no data is found after full review.
- Plan structure logically (intro -> evidence -> significance).

---

## 4. **Write**
Generate a well-structured academic text segment that:
- Synthesizes and paraphrases real information from the sources.
- Connects logically with the previously written text.
- Uses accurate scientific terminology and maintains factual precision.
- Uses `${missing_info_format}` **only when information is unavailable after complete reading**.

---

### Output
Return a JSON object:
- **text**: the generated segment (markdown or plain text)
- **is_complete**: `true` if the section is finished, `false` if continuation is needed.

> Notes:
> - Missing markers do *not* imply incompleteness, only real data absence.
> - Use internal reasoning to decide whether information is missing.
""",
)

SHORTEN_TEXT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="shorten_text",
    template="""
You are revising a STEM grant text to meet word-count constraints while preserving
scientific accuracy and logical integrity.

---

## 1. **Read**
Read the full text below before editing. Identify what content is core and what is verbose.

### Original Text
${text}

Required reduction: at least ${words_overflow} words.

---

## 2. **Identify**
- Determine which sections are redundant or overly detailed.
- Keep essential data, structure, and factual content intact.
- Preserve all `${MISSING_INFO_FORMAT}` placeholders and citations.
- Identify parts that can be tightened without loss of meaning.

---

## 3. **Reason**
Before rewriting:
- Think through what must remain to preserve clarity and integrity.
- Plan to remove repetition and compress explanations.
- Do not remove indicators of missing data.
- Reason internally about trade-offs but do not describe them in the output.

---

## 4. **Rewrite**
Produce a shorter version that:
- Reduces word count by at least ${words_overflow}.
- Keeps all essential details and logical flow.
- Maintains academic tone and factual precision.
- Preserves all `${MISSING_INFO_FORMAT}` markers.

---

### Output
Return only the revised text (no commentary or reasoning).
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

    logger.info(
        "Starting long-form text generation",
        prompt_identifier=prompt_identifier,
        min_words=min_words,
        max_words=max_words,
        buffer_words=buffer_words,
        buffered_min_words=buffered_min_words,
        buffered_max_words=buffered_max_words,
        selected_model=model,
        trace_id=trace_id,
    )

    long_form_text = await handle_long_form_text_generation(
        max_words=buffered_max_words,
        min_words=buffered_min_words,
        prompt_identifier=prompt_identifier,
        task_description=task_description,
        max_api_calls=max_api_calls,
        model=model,
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
            model=model,
            timeout=timeout,
            trace_id=trace_id,
        )

        long_form_length = count_words(long_form_text)
        attempts += 1

    return long_form_text
