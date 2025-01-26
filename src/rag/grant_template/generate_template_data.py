from typing import Final, TypedDict

from jsonschema.exceptions import ValidationError as JSONValidationError
from jsonschema.validators import validate

from src.db.json_objects import GrantPart, GrantSection
from src.exceptions import ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

TOPIC_LABELS = [
    "background_context",
    "budget_justification",
    "clinical_trials",
    "collaboration_strategy",
    "data_management_plan",
    "ethical_considerations",
    "evaluation_framework",
    "expected_outcomes",
    "hypothesis",
    "impact",
    "knowledge_translation",
    "methodology",
    "milestones_and_timeline",
    "novelty_and_innovation",
    "policy_implications",
    "preliminary_data",
    "rationale",
    "research_environment",
    "research_feasibility",
    "research_objectives",
    "risks_and_mitigations",
    "scientific_infrastructure",
    "stakeholder_engagement",
    "sustainability_plan",
    "team_excellence",
    "training_and_development",
    "project_summary",
    "technical_approach",
    "technical_abstract",
]

GRANT_SECTIONS_EXTRACTION_SYSTEM_PROMPT: Final[str] = """"
You are a specialized system designed to analyze grant application requirements and generate structured specifications.
"""

GRANT_SECTIONS_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template="""
    # Grant Application Analysis System

    ## Definition and Scope

    A grant application text includes:
    - Written narrative sections authored by the applicant
    - All textual components requiring original writing

    ## Technical Model

    The grant application follows a hierarchical tree where:
    - Root node represents title page and front matter.
    - Exactly one section must be have the 'is_research_plan' flag set to true, and the following should apply to it
    - The research plan section comprises 50-66% of total length of the application.
    - Research plan can not depend on sections, only on parts in our model because it is generated first in our system.
    - Other sections can depend on the research plan.
    - The research plan includes a detailed discussion of methodology, research objectives and the research tasks to be done.
      Other sections can also touch upon these topics, but the research plan is the main part of the application where these are discussed in detail.
    - The research plan can have children as required - e.g. It is common for some formats to have the preliminary results section as a child of the research plan.
    - In other formats it is a sibling of the research plan.
    - Child nodes represent sections and subsections.
    - Parent-child relationships define section connections.
    - There is no limit on the number of sections and subsections, or the depth of the tree, which allows for nesting.
    - For example, a section can have subsections, and those subsections can have their own subsections.

    ## Sources

    ### Call for Proposals
        <cfp_content>
        ${cfp_content}
        </cfp_content>

    ### Organizational Guidelines
        <organization_guidelines>
        ${organization_guidelines}
        </organization_guidelines>

    ## Length Analysis Guidelines

    1. **Identify Length Limits:** Analyze the sources to identify all text length limits (characters, words, pages).
    2. **Convert to Words:**
       -  **Pages:**
          - Unspecified format: Assume Times New Roman, 11pt, 415 words/page.
          - Adjust for spacing: Single-spaced (+10%), double-spaced (-12%).
          - Adjust for font: Arial (-5%).
          - Adjust for font size: 12pt (-10%).
       -  **Characters:** Divide by 7 and round down (e.g., 5000 chars = 714 words).
    3. **Total Application Length:** Determine the maximum words for the entire application.
    4. **Adjust for Figures:** Subtract 12.5% from the total word count to accommodate figures.
    5. **Research Plan Length:**
       - If specified, use the source-defined maximum.
       - Otherwise, assume 60% of the adjusted total application length.
    6. **Default Section Lengths:** For sections without explicit limits, assign defaults:
       - Background: 500 words
       - Technical: 1000 words
       - Impact: 500 words
       - Timeline: 300 words
       - Resource: 300 words
    7. **Remaining Words:** Calculate the total words remaining after allocating to the research plan.
    8. **Adjust Non-Research Sections:** Proportionally adjust the lengths of non-research sections to ensure the total does not exceed the remaining word count.

    ## Search Query Guidelines

    For each section, generate:
    - Minimum of 3 search queries and maximum of 10
    - Optimized for vector store retrieval
    - Using domain-specific terminology
    - Focused on technical content

    ## Output Schema

    ```json
    {
        "parts": [
            {
                "name": "string",                       // Unique identifier
                "title": "string",                      // Part title
                "type": "string",                       // "part"
                "parent_id": "string"                   // Parent name or "<root>"
                "order": "int"                          // Order of appearance, 1 based index, the ordering is relative to the parent
            }
        ],
        "sections": [
            {
                "name": "string",                       // Unique identifier
                "title": "string",                      // Section heading
                "type": "string",                       // "section"
                "is_research_plan": "bool",             // True if research plan - must be true only once
                "parent_id": "string",                  // Parent name or "<root>"
                "keywords": ["string"],                 // List of technical terms specific to section
                "topics": ["string"],                   // List of topic labels for retrieval
                "generation_instructions": "string",    // Detailed generation guidelines
                "depends_on": ["string"],               // List of dependencies
                "max_words": "int",                     // Maximum word count (> 0)
                "search_queries": ["string"]            // 3-10 search queries for retrieval
                "order": "int"                          // Order of appearance, 1 based index, the ordering is relative to the parent
            }
        ]
    }
    ```

    ## Example Output

    ```jsonc
    {
        "parts": [
            {
                "name": "narrative",
                "title": "Narrative",
                "type": "part",
                "parent_id": "<root>",
                "order": 1"
            },
            {
                "name": "resources",
                "title": "Resources",
                "type": "part",
                "parent_id": "<root>",
                "order": 2"
            }
        ],
        "sections": [
            {
                "name": "abstract",
                "title": "Abstract",
                "type": "section",
                "is_research_plan": false,
                "parent_id": "<root>",
                "keywords": ["research goals", "objectives", "impact"],
                "topics": ["project_summary", "technical_abstract"],
                "generation_instructions": "Provide a concise summary of the proposed research project, including the project's goals, objectives, and significance. The abstract should be written in a clear and accessible style, as it will be read by a broad audience of scientists and administrators.",
                "depends_on": ["research_strategy"],
                "max_words": 300,
                "search_queries": [
                    "research objectives methodology impact",
                    "project goals innovation significance",
                    "technical approach outcomes"
                ],
                "order": 1
            },
            {
                "name": "research_strategy",
                "title": "Research Strategy",
                "type": "section",
                "is_research_plan": true,
                "parent_id": "narrative",
                "keywords": ["methodology", "experimental design", "data analysis"],
                "topics": [
                    "background_context",
                    "hypothesis",
                    "methodology",
                    "expected_outcomes"
                ],
                "generation_instructions": "Describe the overall research strategy, methodology, and analyses to be used to accomplish the specific aims of the project. Discuss potential problems and alternative strategies.",
                "depends_on": [],
                "max_words": 3000,
                "search_queries": [
                    "research methodology experimental design protocols",
                    "data collection analysis methods",
                    "experimental approach techniques",
                    "research strategy implementation"
                ],
                "order": 2
            },
            {
                "name": "preliminary_results",
                "title": "Preliminary Results",
                "type": "section",
                "is_research_plan": false,
                "parent_id": "research_strategy", // Child of research strategy
                "keywords": ["data", "analysis", "interpretation"],
                "topics": ["preliminary_data", "research_feasibility"],
                "generation_instructions": "Present any preliminary data that is relevant to the proposed research project. Discuss the significance of the data and how it supports the feasibility of the project.",
                "depends_on": ["research_strategy"],
                "max_words": 500,
                "search_queries": [
                    "preliminary data results analysis",
                    "research feasibility interpretation",
                    "data significance relevance"
                ],
                "order": 1
            },
            {
                "name": "risks_and_mitigations",
                "title": "Risks and Mitigations",
                "type": "section",
                "is_research_plan": false,
                "parent_id": "narrative",
                "keywords": ["risk assessment", "contingency plan", "mitigation strategies"],
                // ... other fields
            }
            // ... other sections
        ]
    }
    ```

    ## Requirements and Validation Rules

    1. All sections need unique names
    2. The root node and front matter are not included in the sections or parts -
        these are assumed to be part of the application structure and should not be included.
    3. Remove from the output all non-narrative sections or parts, e.g. those relating to:
        - Non-narrative elements - e.g. forms, tables, list of figures, attachments
        - Front-matter and back-matter (title page, author information, table of contents)
        - Addendums, notices, required statements, and other non-research content
        - Supporting documents (letters, CVs, references, etc.)
        - Bureaucratic sections (budget, compliance, eligibility, address information etc.)
    3. Define all parent-child relationships
    4. Specify section dependencies
    5. Partd are structural containers only, e.g. "Part 1.", "Part 2.", "Narrative", "Resources" etc. - they correlate to a heading in the application structure under which there are subsections.
    6. One section must be marked as research plan (is_research_plan: true)
    7. All sections must have max_words > 0
    8. Topics must be from the approved list
    9. Each section must have 3-10 search queries
    10. Dependencies cannot form cycles
    11. Parent relationships cannot form cycles
    12. Total word count must not exceed application maximum

    ## Topic Labels
    Use these labels for content classification:
        <section_labels>
        ${section_labels}
        </section_labels>

    * Add labels as required
    """,
)

section_extraction_json_schema = {
    "type": "object",
    "required": ["parts", "sections"],
    "properties": {
        "parts": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "title", "type", "parent_id", "order"],
                "properties": {
                    "name": {"type": "string"},
                    "title": {"type": "string"},
                    "type": {"type": "string", "enum": ["part"]},
                    "parent_id": {"type": "string"},
                    "order": {"type": "integer", "minimum": 1},
                },
            },
        },
        "sections": {
            "type": "array",
            "minItems": 3,
            "items": {
                "type": "object",
                "required": [
                    "name",
                    "title",
                    "type",
                    "is_research_plan",
                    "parent_id",
                    "keywords",
                    "topics",
                    "generation_instructions",
                    "depends_on",
                    "max_words",
                    "search_queries",
                    "order",
                ],
                "properties": {
                    "name": {"type": "string"},
                    "title": {"type": "string"},
                    "type": {"type": "string", "enum": ["section"]},
                    "is_research_plan": {"type": "boolean"},
                    "parent_id": {"type": "string"},
                    "keywords": {"type": "array", "items": {"type": "string"}, "minItems": 3},
                    "topics": {"type": "array", "items": {"type": "string"}, "minItems": 2},
                    "generation_instructions": {"type": "string"},
                    "depends_on": {"type": "array", "items": {"type": "string"}},
                    "max_words": {"type": "integer", "minimum": 1, "maximum": 10000},
                    "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                    "order": {"type": "integer", "minimum": 1},
                },
            },
        },
    },
}


class TemplateSectionsResponse(TypedDict):
    """Response from the tool for generating grant template sections."""

    parts: list[GrantPart]
    """The parts."""
    sections: list[GrantSection]
    """The grant sections."""


def detect_cycle(graph: dict[str, list[str]], start: str, visited: set[str], path: set[str]) -> bool:
    """Detect cycles in a directed graph using DFS.

    Args:
        graph: Adjacency list representation of graph
        start: Current node being visited
        visited: Set of all visited nodes
        path: Set of nodes in current DFS path

    Returns:
        bool: True if cycle detected, False otherwise
    """
    visited.add(start)
    path.add(start)

    for neighbor in graph.get(start, []):
        if neighbor in path or (neighbor not in visited and detect_cycle(graph, neighbor, visited, path)):
            return True

    path.remove(start)
    return False


def validate_template_sections(response: TemplateSectionsResponse) -> None:  # noqa: PLR0912
    """Validate the extracted template sections.

    Args:
        response: The template sections response to validate.

    Raises:
        ValidationError: If validation fails.
    """
    try:
        validate(instance=response, schema=section_extraction_json_schema)
    except JSONValidationError as e:
        raise ValidationError(f"Invalid format: {e!s}") from e

    all_names = [s["name"] for s in response["parts"]] + [s["name"] for s in response["sections"]]
    if len(all_names) != len(set(all_names)):
        raise ValidationError("Section and heading names must be unique")

    valid_parents = {"<root>"} | set(all_names)
    for section in response["parts"] + response["sections"]:
        if section["parent_id"] not in valid_parents:
            raise ValidationError(f"Invalid parent_id {section['parent_id']} in section {section['name']}")

    parent_graph: dict[str, list[str]] = {}
    for section in response["parts"] + response["sections"]:
        if section["parent_id"] != "<root>":
            parent_graph[section["name"]] = [section["parent_id"]]

    for section_name in parent_graph:
        if detect_cycle(parent_graph, section_name, set(), set()):
            raise ValidationError(f"Circular parent dependency in {section_name}")

    research_plans = [s for s in response["sections"] if s["is_research_plan"]]
    if len(research_plans) != 1:
        raise ValidationError("Exactly one section must be research plan")

    for section in response["sections"]:
        invalid_deps = set(section["depends_on"]) - set(all_names)
        if invalid_deps:
            raise ValidationError(f"Invalid dependencies in {section['name']}: {invalid_deps}")

    dependency_graph = {s["name"]: s["depends_on"] for s in response["sections"]}
    for section_name in dependency_graph:
        if detect_cycle(dependency_graph, section_name, set(), set()):
            raise ValidationError(f"Circular dependency in {section_name}")


async def extract_sections(task_description: str) -> TemplateSectionsResponse:
    """Extract sections from the user input.

    Args:
        task_description: The task description.

    Returns:
        The extracted sections.
    """
    return await handle_completions_request(
        prompt_identifier="grant_template_extraction",
        messages=task_description,
        response_schema=section_extraction_json_schema,
        response_type=TemplateSectionsResponse,
        validator=validate_template_sections,
        system_prompt=GRANT_SECTIONS_EXTRACTION_SYSTEM_PROMPT,
    )


async def handle_generate_grant_template(
    *, cfp_content: str, organization_id: str | None
) -> list[GrantPart | GrantSection]:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The funding organization to use for the grant template.

    Returns:
        Complete grant template configuration including format and sections
    """
    prompt = GRANT_SECTIONS_EXTRACTION_USER_PROMPT.substitute(
        cfp_content=cfp_content,
        section_labels=TOPIC_LABELS,
    )
    result: TemplateSectionsResponse = await with_prompt_evaluation(
        prompt_handler=extract_sections,
        prompt=prompt.to_string(
            organization_guidelines=(
                await retrieve_documents(organization_id=organization_id, task_description=prompt)
                if organization_id
                else []
            )
        ),
    )

    return [*result["parts"], *result["sections"]]
