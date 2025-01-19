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
    research_tasks: list[ResearchTask]
    """The research tasks for the research objective"""
    relationships: NotRequired[list[str]]
    """The relations of the research objective to other objectives."""


class GrantSection(TypedDict):
    """A section in the grant template."""

    name: str
    """Unique section identifier."""
    title: str
    """Section heading title."""
    instructions: str
    """Detailed content generation instructions."""
    keywords: list[str]
    """Technical terms specific to section."""
    depends_on: list[str]
    """Sections that must be generated before this one."""
    min_words: NotRequired[int]
    """Minimum word count if specified."""
    max_words: NotRequired[int]
    """Maximum word count if specified."""
    topics: list[str]
    """Topics that the section covers."""


class ApplicationDetails(TypedDict):
    """DTO for an application details."""

    background_context: NotRequired[str]
    """The background context of the application."""
    hypothesis: NotRequired[str]
    """The hypothesis of the application."""
    impact: NotRequired[str]
    """The impact of the application."""
    milestones_and_timeline: NotRequired[str]
    """The milestones and timeline of the application."""
    novelty_and_innovation: NotRequired[str]
    """The novelty and innovation of the application."""
    preliminary_data: NotRequired[str]
    """The preliminary data of the application."""
    rationale: NotRequired[str]
    """The rationale of the application."""
    research_feasibility: NotRequired[str]
    """The research feasibility of the application."""
    risks_and_mitigations: NotRequired[str]
    """The risks and planned mitigation strategies of the application."""
    scientific_infrastructure: NotRequired[str]
    """The scientific infrastructure of the application."""
    team_excellence: NotRequired[str]
    """The team excellence of the application."""


class TextGenerationResult(TypedDict):
    """DTO for a text generation result."""

    content: str
    """The generated content."""
    type: str
    """The type of the generated content."""
