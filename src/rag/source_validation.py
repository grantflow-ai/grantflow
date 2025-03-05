from typing import Any, Final, TypedDict

from src.exceptions import ValidationError
from src.rag.completion import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

VALIDATE_SOURCES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="validate_sources",
    template="""
    Your task is to analyze whether the provided sources contain sufficient information to complete the requested task. You will evaluate if critical information is missing that would prevent successful task completion.

    ## Task Description

    <task_description>
    ${task_description}
    </task_description>

    ## Available Sources

    <sources>
    ${sources}
    </sources>

    ## Instructions

    1. Carefully analyze the task description to identify the key information requirements:
       - What specific data or context is needed to complete the task?
       - What methodological details must be available?
       - What domain knowledge is required?
       - What constraints or parameters need to be defined?

    2. Evaluate the available sources to determine if they contain all required information:
       - Check if all key concepts, terms, and references in the task description are addressed in the sources
       - Assess if the sources provide adequate context, background, and specifics
       - Verify if the sources include sufficient methodological details
       - Determine if any critical domain knowledge is missing

    3. Identify any specific gaps or missing information:
       - Note any key requirements mentioned in the task that aren't addressed in the sources
       - Identify ambiguities that cannot be resolved with the available information
       - Flag any incomplete or insufficient methodological details
       - Highlight if domain-specific knowledge is required but not provided

    ## Output Format

    Provide your assessment as a JSON object with the following structure:

    ```json
    {
        "error": null or "Markdown list of missing information"
    }
    ```

    - If all necessary information is present, return {"error": null}
    - If critical information is missing, return {"error": "- Missing item 1: explanation\n- Missing item 2: explanation\n..."} formatted as a markdown bullet point list

    Each bullet point should identify a specific piece of missing information and explain why it's required for task completion. The error message must be formatted as a proper markdown list with each item on a new line starting with "- ". Be specific, actionable, and clear about what information is needed. Avoid generic statements - precisely identify what's missing and why it matters.
    """,
)


class SourceValidationResult(TypedDict):
    """Result of source validation."""

    error: str | None
    """Error message describing missing information, or null if sources are sufficient."""


source_validation_schema = {
    "type": "object",
    "properties": {
        "error": {"type": "string", "nullable": True},
    },
    "required": ["error"],
}


def validate_source_validation_response(response: SourceValidationResult) -> None:
    """Validate the source validation response.

    Args:
        response: The response to validate.

    Raises:
        ValidationError: If the response is invalid.
    """
    if "error" not in response:
        raise ValidationError("Missing 'error' field in response", context=response)

    if isinstance(response["error"], str):
        if len(response["error"].strip()) < 20:
            raise ValidationError(
                "Error message is too brief", context={"error_message": response["error"], "min_length": 20}
            )

        lines = [line.strip() for line in response["error"].strip().split("\n") if line.strip()]
        if not all(line.startswith("- ") for line in lines):
            raise ValidationError(
                "Error message must be formatted as a markdown bullet point list with each item starting with '- '",
                context={"error_message": response["error"]},
            )

        if len(lines) < 1:
            raise ValidationError(
                "Error message must contain at least one bullet point", context={"error_message": response["error"]}
            )


async def handle_source_validation(
    *,
    task_description: str,
    **sources: Any,
) -> str | None:
    """Validate whether the sources contain sufficient information to complete the task.

    Args:
        task_description: The description of the task to be completed.
        **sources: The available sources of information.

    Returns:
        A result indicating whether the sources are sufficient or what information is missing.
    """
    logger.debug(
        "Validating sources for task.", task_description_length=len(task_description), sources_length=len(sources)
    )

    prompt = VALIDATE_SOURCES_USER_PROMPT.to_string(
        task_description=task_description,
        sources=sources,
    )

    result = await handle_completions_request(
        prompt_identifier="validate_sources",
        messages=prompt,
        response_type=SourceValidationResult,
        response_schema=source_validation_schema,
        validator=validate_source_validation_response,
    )
    return result["error"]
