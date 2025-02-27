from typing import NotRequired, TypedDict


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
    page_number: NotRequired[int]
    """Page number where the chunk appears"""


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
    research_tasks: list[ResearchTask]
    """The research tasks for the research objective"""


class GrantElement(TypedDict):
    """DTO for a grant element."""

    id: str
    """Section identifier."""
    order: int
    """Order of the section in the grant application."""
    title: str
    """Section heading title."""


class GrantLongFormSection(GrantElement):
    """DTO for a grant section data."""

    depends_on: list[str]
    """Sections that must be generated before this one."""
    generation_instructions: str
    """Detailed content generation instructions."""
    is_clinical_trial: bool | None
    """Whether the section is a clinical trial section."""
    is_detailed_workplan: bool | None
    """Whether the section is the work plan."""
    keywords: list[str]
    """Technical terms specific to section."""
    max_words: int
    """Maximum word count if specified."""
    parent_id: str | None
    """Parent section name."""
    search_queries: list[str]
    """Search queries to retrieve information for the section."""
    topics: list[str]
    """Topics that the section covers."""
