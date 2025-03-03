from functools import partial
from typing import Final

from src.exceptions import ValidationError
from src.rag.completion import handle_completions_request
from src.rag.grant_application.dto import ResearchComponentGenerationDTO
from src.utils.prompt_template import PromptTemplate

ALLOCATE_WORD_COUNTS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="allocate_word_counts",
    template="""
    Your task is to allocate maximum word counts to each research objective and its constituent tasks within a research plan, based on the total maximum word limit for the entire section.

    ## Sources

    Research Components:
        <research_components>
        ${research_components}
        </research_components>

    Maximum Word Limit for Research Plan:
        <max_words>
        ${max_words}
        </max_words>

    ## Instructions

    1. Analyze the Research Components:
        - Examine each research objective and its constituent research tasks in detail.
        - Assess the complexity and importance of each objective and task.
        - Consider the depth of information required for each component based on its description and instructions.

    2. Allocate Word Counts:
        - Calculate the maximum number of words for each objective and task description based on the total word limit provided.
        - The research plan section has a maximum word limit: ${max_words}
        - Ensure that the word count aligns with the level of detail and complexity required for each component.
        - Verify the total word count for the entire research plan section aligns with the numbers assigned to the objectives and tasks.
        - Assign each objective and each task the appropriate word limit based on its complexity and importance.

    3. Ensure Balance and Proportionality:
        - Distribute words proportionally according to the significance and complexity of each research component.
        - More complex and critical objectives and tasks should receive higher word allocations.
        - Ensure that no component receives too few words to adequately explain its purpose and methodology.
        - The sum of all allocated word counts must not exceed the total maximum word limit.

    ## Output Structure

    Respond with a JSON object that maps component identifiers to their allocated word count:

    ```json
    {
        "1": 200,
        "1.1": 150,
        "1.2": 200,
        "2": 200,
        "2.1": 125,
        "2.2": 125
    }
    ```

    Ensure that:
        1. Each objective and task has an allocated word count.
        2. The sum of all allocated word does not exceed ${max_words} words.
        3. Each component has sufficient words allocated to adequately explain its purpose.
    """,
)

word_allocation_schema = {"type": "object", "additionalProperties": {"type": "integer"}, "minProperties": 1}


def validate_word_allocation_response(
    response: dict[str, int], *, max_words: int, research_components: list[ResearchComponentGenerationDTO]
) -> None:
    """Validate the word allocation response.

    Args:
         response: The response to validate, mapping component IDs to word limits.
         max_words: The maximum word count for the entire research plan.
         research_components: The original research components.

    Raises:
          ValidationError: If the response is invalid.

    Returns:
          None
    """
    if not response:
        raise ValidationError("Empty response", context=response)

    valid_ids = {component["number"] for component in research_components}

    for component_id in valid_ids:
        if component_id not in response:
            raise ValidationError(
                f"Missing word allocation for component {component_id}",
                context={"component_id": component_id, "response": response},
            )

    for component_id in response:
        if component_id not in valid_ids:
            raise ValidationError(
                f"Unknown component ID in response: {component_id}",
                context={"component_id": component_id, "valid_ids": sorted(valid_ids)},
            )

    total_words = sum(response.values())
    if total_words > max_words:
        raise ValidationError(
            f"Total allocated words ({total_words}) exceed maximum limit ({max_words})",
            context={"total_allocated": total_words, "max_limit": max_words},
        )

    for component_id, word_count in response.items():
        if word_count < 50:
            raise ValidationError(
                f"Word count for component {component_id} is too low ({word_count})",
                context={"component_id": component_id, "word_count": word_count},
            )


async def allocate_word_counts(
    research_components: list[ResearchComponentGenerationDTO],
    *,
    max_words: int,
) -> dict[str, int]:
    """Allocate word counts to research objectives and tasks.

    Args:
        research_components: The research components without word allocations.
        max_words: The maximum word count for the entire research plan.

    Returns:
        A dictionary mapping component IDs to their allocated word counts.
    """
    prompt = ALLOCATE_WORD_COUNTS_USER_PROMPT.substitute(
        research_components=research_components,
        max_words=max_words,
    )

    return await handle_completions_request(
        prompt_identifier="allocate_word_counts",
        messages=prompt.to_string(),
        response_type=dict[str, int],
        response_schema=word_allocation_schema,
        validator=partial(
            validate_word_allocation_response, max_words=max_words, research_components=research_components
        ),
    )
