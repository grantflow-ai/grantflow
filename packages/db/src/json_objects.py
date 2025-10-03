from typing import NotRequired, TypedDict

from packages.db.src.enums import GrantTemplateStageEnum


class TableContext(TypedDict):
    row_index: int | None
    column_index: int | None
    table_dimensions: str | None


class Chunk(TypedDict):
    content: str
    page_number: NotRequired[int]


class ResearchTask(TypedDict):
    number: int
    title: str
    description: NotRequired[str]


class ResearchObjective(TypedDict):
    number: int
    title: str
    description: NotRequired[str]
    research_tasks: list[ResearchTask]


class OrganizationNamespace(TypedDict):
    """Organization identification data stored in CFP analysis."""
    id: str
    full_name: str
    abbreviation: str


class CFPContentSection(TypedDict):
    """Hierarchical content section from CFP extraction."""
    title: str
    subtitles: list[str]


class CFPAnalysisRequirementWithQuote(TypedDict):
    """Requirement extracted from CFP with source quote."""
    requirement: str
    quote_from_source: str
    category: str


class CFPConstraint(TypedDict):
    """Length or formatting constraint from CFP."""
    constraint_type: str
    constraint_value: str
    source_quote: str


class GrantElement(TypedDict):
    id: str
    order: int
    title: str
    evidence: str
    parent_id: str | None
    needs_applicant_writing: NotRequired[bool]


class GrantLongFormSection(GrantElement):
    depends_on: list[str]
    generation_instructions: str
    is_clinical_trial: bool | None
    is_detailed_research_plan: bool | None
    keywords: list[str]
    max_words: int
    search_queries: list[str]
    topics: list[str]
    requirements: NotRequired[list["CFPAnalysisRequirementWithQuote"]]
    guidelines: NotRequired[list[str]]
    length_limit: NotRequired[int | None]
    length_source: NotRequired[str | None]
    other_limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]


class ResearchDeepDive(TypedDict):
    background_context: NotRequired[str]
    hypothesis: NotRequired[str]
    rationale: NotRequired[str]
    novelty_and_innovation: NotRequired[str]
    team_excellence: NotRequired[str]
    preliminary_data: NotRequired[str]
    research_feasibility: NotRequired[str]
    impact: NotRequired[str]
    scientific_infrastructure: NotRequired[str]


class GrantTemplateRagJobCheckpoint(TypedDict):
    stage: GrantTemplateStageEnum
    cfp_subject: str
    title: str
    subtitles: list[str]
    organization_id: NotRequired[str | None]
    submission_date: NotRequired[str | None]


class CFPAnalysisCategory(TypedDict):
    """Requirement category from CFP analysis."""
    name: str
    count: int
    examples: list[str]


class CFPAnalysisConstraint(TypedDict):
    """Length or formatting constraint from CFP."""
    type: str  # word_limit, page_limit, char_limit, format
    value: str
    section: NotRequired[str | None]


class CFPAnalysisMetadata(TypedDict):
    """Metadata about the CFP analysis process."""
    total_sections: int
    total_requirements: int
    source_count: int


class CFPAnalysisData(TypedDict):
    """Requirements analysis from CFP extraction."""
    categories: list[CFPAnalysisCategory]
    constraints: list[CFPAnalysisConstraint]
    metadata: CFPAnalysisMetadata


class CFPAnalysis(TypedDict):
    """Complete CFP analysis result with content and metadata.

    This is the unified CFP analysis output combining organization identification,
    content extraction, and requirements analysis into a single structure.
    """
    subject: str
    content: list[CFPContentSection]
    deadline: str | None
    org_id: str | None
    analysis_metadata: CFPAnalysisData
    organization: NotRequired[OrganizationNamespace | None]
