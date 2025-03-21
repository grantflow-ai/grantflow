from typing import Literal, NotRequired, TypedDict


class ResearchComponentGenerationDTO(TypedDict):
    """DTO for enrichment data."""

    number: str
    """The number of the research objective as a string, either in the format '1' for objectives, or '1.1' for tasks."""
    title: str
    """The title of the research objective."""
    description: str
    """The description of the research objective."""
    instructions: str
    """Detailed instructions for text generation."""
    guiding_questions: list[str]
    """Guiding questions for the objective."""
    search_queries: list[str]
    """Search queries for the objective."""
    relationships: list[tuple[str, str]]
    """The relationships of the research objective to other objectives and tasks."""
    max_words: NotRequired[int]
    """The maximum word count for the generated text."""
    type: Literal["task", "objective"]
    """The type of the research component."""
