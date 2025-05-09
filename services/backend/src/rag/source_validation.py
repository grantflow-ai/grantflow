from typing import Any, Final, TypedDict

from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from services.backend.src.rag.completion import handle_completions_request
from services.backend.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

VALIDATE_SOURCES_SYSTEM_PROMPT: Final[str] = """
You are a specialized validation component in a RAG system that analyzes whether the provided sources
contain sufficient information to complete requested tasks. You excel at identifying information gaps
and determining if critical data is missing for successful task completion. You carefully consider the
required output length when evaluating information needs - shorter outputs require less comprehensive
sources, while longer outputs demand more detailed information.
"""

VALIDATE_SOURCES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="validate_sources",
    template="""
    Your task is to analyze whether the provided sources contain sufficient information to complete the requested task. You will evaluate if critical information is missing that would prevent successful task completion.

    ## Task Description

    <task_description>
    ${task_description}
    </task_description>

    ## Max Length

    <max_length>
    ${max_length}
    </max_length>

    ## Available Sources

    <sources>
    ${sources}
    </sources>

    ## Instructions

    1. First, analyze the max length to understand the scope and detail level expected:
       - If max length is short (under 1000 characters), you should only require essential core information and be more lenient in your validation
       - If max length is medium (1000-5000 characters), you should require moderate detail on key points
       - If max length is long (over 5000 characters), you should expect comprehensive information and be more stringent in your validation

    2. Carefully analyze the task description to identify the key information requirements based on expected output length:
       - What specific data or context is needed to complete the task at the appropriate level of detail?
       - What methodological details must be available, considering the depth possible in the output?
       - What domain knowledge is required for an output of this length?
       - What constraints or parameters need to be defined?

    3. Evaluate the available sources to determine if they contain all required information:
       - Check if all key concepts, terms, and references in the task description are addressed in the sources
       - Assess if the sources provide adequate context, background, and specifics for the expected output length
       - Verify if the sources include sufficient methodological details
       - Determine if any critical domain knowledge is missing

    4. Identify any specific gaps or missing information:
       - Note any key requirements mentioned in the task that aren't addressed in the sources
       - Identify ambiguities that cannot be resolved with the available information
       - Flag any incomplete or insufficient methodological details
       - Highlight if domain-specific knowledge is required but not provided

    5. Calculate the percentage of required information that is available in the sources:
       - Enumerate all discrete pieces of information needed for the task, scaled appropriately to the max length
       - Count how many of these pieces are adequately covered in the sources
       - Calculate the percentage of required information that is available
       - For shorter outputs, fewer pieces of information are required, so adjust your evaluation accordingly

    Important: The calculation MUST be relative to the max length of the expected text. A shorter max length means fewer details are required, while a longer max length requires more comprehensive information.

    ## Output Format

    Provide your assessment as a JSON object with the following structure:

    ```json
    {
        "percentage_available": 0-100,
        "missing_information": ["Missing information 1", "Missing information 2", ...]
    }
    ```

    - "percentage_available" should be a number between 0 and 100 indicating the percentage of required information that is available in the sources
    - "missing_information" should be an array of strings, each describing a specific piece of missing information
    - If all necessary information is present (100%), return an empty array for "missing_information"

    Each missing information entry should identify a specific piece of missing information and explain why it's required for task completion. Be specific, actionable, and clear about what information is needed. Avoid generic statements - precisely identify what's missing and why it matters.
    """,
)


class SourceValidationResult(TypedDict):
    percentage_available: float
    missing_information: list[str]


source_validation_schema = {
    "type": "object",
    "properties": {
        "percentage_available": {"type": "number", "minimum": 0, "maximum": 100},
        "missing_information": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["percentage_available", "missing_information"],
}


def validate_source_validation_response(response: SourceValidationResult) -> None:
    if "percentage_available" not in response:
        raise ValidationError("Missing 'percentage_available' field in response", context=response)

    if not isinstance(response["percentage_available"], (int | float)):
        raise ValidationError(
            "The 'percentage_available' field must be a number",
            context={"percentage_available": response["percentage_available"]},
        )

    if response["percentage_available"] < 0 or response["percentage_available"] > 100:
        raise ValidationError(
            "The 'percentage_available' field must be between 0 and 100",
            context={"percentage_available": response["percentage_available"]},
        )

    if "missing_information" not in response:
        raise ValidationError("Missing 'missing_information' field in response", context=response)

    if not isinstance(response["missing_information"], list):
        raise ValidationError(
            "The 'missing_information' field must be an array",
            context={"missing_information": response["missing_information"]},
        )

    if response["percentage_available"] < 100 and len(response["missing_information"]) == 0:
        raise ValidationError(
            "If percentage_available is less than 100%, missing_information must not be empty",
            context={
                "percentage_available": response["percentage_available"],
                "missing_information": response["missing_information"],
            },
        )

    if response["percentage_available"] == 100 and len(response["missing_information"]) > 0:
        raise ValidationError(
            "If percentage_available is 100%, missing_information must be empty",
            context={
                "percentage_available": response["percentage_available"],
                "missing_information": response["missing_information"],
            },
        )

    for item in response["missing_information"]:
        if not isinstance(item, str):
            raise ValidationError("Each item in 'missing_information' must be a string", context={"item": item})

        if len(item.strip()) < 10:
            raise ValidationError(
                "Each missing information description must be at least 10 characters long",
                context={"item": item, "min_length": 10},
            )


async def handle_source_validation(
    *,
    task_description: str,
    minimum_percentage: float = 50.0,
    max_length: int,
    **sources: Any,
) -> str | None:
    logger.debug(
        "Validating sources for task.",
        task_description_length=len(task_description),
        sources_length=len(sources),
        minimum_percentage=minimum_percentage,
    )

    prompt = VALIDATE_SOURCES_USER_PROMPT.to_string(
        task_description=task_description,
        sources=sources,
        max_length=max_length,
    )

    result = await handle_completions_request(
        prompt_identifier="validate_sources",
        messages=prompt,
        response_type=SourceValidationResult,
        response_schema=source_validation_schema,
        validator=validate_source_validation_response,
        system_prompt=VALIDATE_SOURCES_SYSTEM_PROMPT,
        model=ANTHROPIC_SONNET_MODEL,
    )

    if result["percentage_available"] < minimum_percentage:
        missing_info_bullets = [f"\t- {item}" for item in result["missing_information"]]
        return "Missing Information:\n" + "\n".join(missing_info_bullets)

    return None
