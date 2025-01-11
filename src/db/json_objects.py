from typing import NotRequired, TypedDict

from src.db.enums import ContentTopicEnum, GrantSectionEnum


class TableContext(TypedDict):
    """Context information for table cells."""

    row_index: int | None
    """Zero-based row index in the table"""
    column_index: int | None
    """Zero-based column index in the table"""
    table_dimensions: str | None
    """Table dimensions in format 'rowsxcolumns'"""


class Chunk(TypedDict):
    """DTO for a chunk of text."""

    content: str
    """The actual text content of the chunk."""
    content_hash: str
    """Hash string of the content, meant for deduplication of query results."""
    index: int
    """Sequential index in document order."""
    page_number: NotRequired[int]
    """Page number where the chunk appears"""
    element_type: NotRequired[str]
    """Type of document element (page, table_cell, paragraph, figure, formula)."""
    parent: NotRequired[str]
    """The parent element name or other identifier (e.g., table_1, para_2, formula_3)."""
    table_context: NotRequired[TableContext]
    """Additional context for table cells."""
    role: NotRequired[str]
    """Role or type of the content (e.g., paragraph role, cell kind, formula kind)."""
    languages: NotRequired[list[str]]
    """Detected language for the chunk."""
    confidence: NotRequired[float]
    """Confidence score for the extracted chunk."""


class ResearchTask(TypedDict):
    """DTO for a research task data."""

    number: int
    """The number of the task."""
    title: str
    """The title of the task."""
    description: NotRequired[str]
    """The description of the task."""
    relationships: NotRequired[list[str]]
    """The relations of the research task to other tasks and objectives."""


class ResearchObjective(TypedDict):
    """DTO for a research objective data."""

    number: int
    """The number of the research objective."""
    title: str
    """The title of the research objective."""
    description: NotRequired[str]
    """The description of the research objective."""
    preliminary_results: NotRequired[str]
    """The preliminary results of the research objective."""
    risks_and_alternatives: NotRequired[str]
    """The risks and alternatives of the research objective."""
    requires_clinical_trials: bool
    """Whether the research objective requires clinical trials."""
    research_tasks: list[ResearchTask]
    """The research tasks for the research objective"""
    relationships: NotRequired[list[str]]
    """The relations of the research objective to other objectives."""


class SectionTopic(TypedDict):
    """DTO for a section topic."""

    search_terms: list[str]
    """The search terms for the topic."""
    type: ContentTopicEnum
    """The type of the topic."""
    weight: float
    """The weight of the topic. Range between 0-1"""


class GrantSection(TypedDict):
    """DTO for a grant section."""

    max_words: NotRequired[int]
    """The maximum number of words in the section."""
    min_words: NotRequired[int]
    """The minimum number of words in the section."""
    search_terms: list[str]
    """The search terms for the section."""
    topics: list[SectionTopic]
    """The topics for the section."""
    type: GrantSectionEnum
    """The type of the section."""


class TextGenerationResult(TypedDict):
    """DTO for a text generation result."""

    content: str
    type: GrantSectionEnum
