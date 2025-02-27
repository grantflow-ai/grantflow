from time import time
from typing import Any, Final, TypedDict

from src.rag.completion import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.text import concatenate_segments_with_spacy_coherence, normalize_markdown

logger = get_logger(__name__)

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

    ### Length Constraints

    The entire text should have:
        - Min words: ${min_words}
        - Max words: ${max_words}

    ## Sources
    These are the sources for generation. Use these sources exclusively for generating the output.
    The sources are provided as a JSON object. The top-level keys of the object indicate the type of the source.
        <sources>
        ${sources}
        </sources>

    ## Instructions
    Follow these steps to complete the task:
        1. Begin by analyzing the the task description.
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
        - If the text is shorter than the minimum length, is_complete should be false.
        - Remember: if you are missing information in the sources (inputs + rag results), do not invent facts or complete the missing information from your training data, instead write `**[MISSING INFORMATION: description]**` where description is a concise description of the missing information.
    ```
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


async def generate_long_form_text(
    *,
    max_words: int,
    min_words: int,
    prompt_identifier: str,
    task_description: str,
    **sources: Any,
) -> str:
    """Generate long-form text.

    Args:
        max_words: The maximum number of words to generate.
        min_words: The minimum number of words to generate.
        prompt_identifier: The identifier of the entity to generate text for.
        task_description: The description of the task.
        **sources: Additional keyword arguments to pass to the prompt handler.

    Returns:
        The generated text.
    """
    result = ""

    api_call_num = 1

    logger.info("Generating text", entity_identifier=prompt_identifier)
    start_time = time()
    while api_call_num < 5:
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
        )

        result = concatenate_segments_with_spacy_coherence([result, response["text"]])

        api_call_num += 1
        if response["is_complete"]:
            break

    logger.info(
        "Generated text",
        prompt_identifier=prompt_identifier,
        api_call_num=api_call_num,
        generation_duration=int(time() - start_time),
    )

    return normalize_markdown(result)
