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
    template=r"""
    # Grant Application Analysis System

    You are analyzing the provided information to produce a **structured JSON output** representing a **grant application**.
    **Focus only on narrative sections** (original writing). **Exclude** non-narrative elements, bureaucratic sections, addenda, and front/back matter.

    ## Sources

    ### Call for Proposals
        <cfp_content>
        ${cfp_content}
        </cfp_content>

    ### Organizational Guidelines
        <organization_guidelines>
        ${organization_guidelines}
        </organization_guidelines>

    ## Topic Labels
    Use these labels for content classification:
        <section_labels>
        ${section_labels}
        </section_labels>

    Note: Add labels as required

    ## Definition and Scope

    A grant application text includes:
        - Written narrative sections authored by the applicant
        - All textual components requiring original writing

    ## Technical Model

    Our system models a grant application's structure as a tree of nodes. The nodes can either be a `part` or a `section`, with parts being purely structural headings, and sections being a heading and textual content.

    1. The `<root>` node epresents the title page and front matter (excluded from the output).
    2. Exactly **one section** must have the `is_research_plan` flag set to `true`:
        - The research plan must comprise **50-66%** of the total application length.
        - The research plan **cannot depend on any sections**, only on parts, as it is generated first in the system.
        - Other sections can **depend on the research plan**.
        - The research plan includes a detailed discussion of:
             - **Methodology**
             - **Research objectives**
             - **Research tasks**
         *Note:* Other sections may reference these topics, but the research plan serves as the primary section for detailed discussion.
        - The research plan can have **child sections**, as required:
            - For example, **preliminary results** may be structured as a child section in some formats.
            - In other formats, **preliminary results** may appear as a sibling section.

    3. Parent/Child and Siblings:
      - All parts and sections are children of a parent - if the part or section are top-level, the parent is `<root>`, otherwise the parent is a part or section.
      - A section can be the child of a part and vice-versa - this correlates with how headings can be nested in levels.
      - The maximum depth of the tree is 6, including the root node. This reflects the maximal level of heading available in markdown.
      - For example, a section or part can have children, and those children can have their own children, forming a hierarchical tree up to 6 layers deep.
      - Siblings are parts or sections that have the same parent.
      - All nodes in tree have an `order` property. This property determines the order of placement of sibling nodes under a parent - on the page. If the parent will be translated to a header 2 (true for children of <root>), then its children will each be translated to header 3, followed by content (for sections) and children.


    ## Sources

    ### Call for Proposals
        <cfp_content>
        ${cfp_content}
        </cfp_content>

    ### Organizational Guidelines
        <organization_guidelines>
        ${organization_guidelines}
        </organization_guidelines>

    ## Guidelines
    ### Length Analysis

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

    ### Search Query
    For each section, generate:
        - Minimum of 3 search queries and maximum of 10
        - Optimized for vector store retrieval
        - Using domain-specific terminology
        - Focused on technical content

    ### Ordering

    1.  Every part and section have an order property that determines its position relative to its siblings.
    2.  Siblings are any parts or sections that share the same parent\_id.
    3.  Order:
        *   Must be 1-based positive integers (1, 2, 3, etc.).
        *   Must be unique among all siblings (both parts and sections).
        *   Follow ascending order for display (1 comes before 2, etc.).

    ## Output Schema

    ```json
    {
        "parts": [{
            "name": "string",                       // Unique identifier
            "title": "string",                      // Part title
            "type": "string",                       // "part"
            "parent_id": "string",                  // Parent name or "<root>"
            "order": integer                        // Order of appearance, 1 based index
        }],
        "sections": [{
            "name": "string",                       // Unique identifier
            "title": "string",                      // Section heading
            "type": "string",                       // "section"
            "is_research_plan": "bool",             // True if research plan - must be true only once
            "parent_id": "string",                  // Parent name or "<root>"
            "keywords": ["string"],                 // A list of technical terms specific to this section that should be used in the search queries and content generation.
            "topics": ["string"],                   // List of topic labels for retrieval. Use these to guide content generation and ensure relevance to the section's purpose.
            "generation_instructions": "string",    // Detailed generation guidelines. Explain the purpose of this section and what information should be included.
            "depends_on": ["string"],               // List of dependencies. Gemini, pay special attention to this field to ensure that all dependencies are valid and that there are no circular dependencies.
            "max_words": integer,                   // Maximum word count (> 0)
            "search_queries": ["string"],           // 3-10 search queries for retrieval. Gemini, use the keywords and topics to generate effective search queries that will retrieve relevant information for each section.
            "order": integer                        // Order of appearance, 1 based index
        }]
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
                "order": 1
            },
            {
                "name": "resources",
                "title": "Resources",
                "type": "part",
                "parent_id": "<root>",
                "order": 2
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
            }
        ]
    }
    ```

    ### Complex Nested Example

    ```json
    {
        "parts": [
            {
                "name": "narrative",
                "title": "Narrative",
                "type": "part",
                "parent_id": "<root>",
                "order": 1
            },
            {
                "name": "methodology",
                "title": "Methodology",
                "type": "part",
                "parent_id": "narrative",
                "order": 2
            }
        ],
        "sections": [
            {
                "name": "research_strategy",
                "title": "Research Strategy",
                "type": "section",
                "is_research_plan": true,
                "parent_id": "methodology",
                "order": 1,
                "keywords": ["methodology", "design"],
                "topics": ["methodology"],
                "generation_instructions": "Detailed methodology description...",
                "depends_on":,
                "max_words": 3000,
                "search_queries": ["query1", "query2", "query3"]
            },
            {
                "name": "subsection_1",
                "title": "Experimental Design",
                "type": "section",
                "is_research_plan": false,
                "parent_id": "research_strategy",
                "order": 1,
                "keywords": ["experiments"],
                "topics": ["methodology"],
                "generation_instructions": "Experimental design details...",
                "depends_on": ["research_strategy"],
                "max_words": 500,
                "search_queries": ["query1", "query2", "query3"]
            },
            {
                "name": "sub_subsection",
                "title": "Protocol Details",
                "type": "section",
                "is_research_plan": false,
                "parent_id": "subsection_1",
                "order": 1,
                "keywords": ["protocols"],
                "topics": ["methodology"],
                "generation_instructions": "Detailed protocols...",
                "depends_on": ["research_strategy", "subsection_1"],
                "max_words": 300,
                "search_queries": ["query1", "query2", "query3"]
            }
        ]
    }
    ```

    ## Requirements and Validation Rules

    1. The parts and sections include only the narrative sections of the application and do not include any of the following:
        - Non-narrative elements (forms, tables, list of figures, attachments).
        - Front-matter and back-matter (title page, author information, table of contents).
        - Addendums, notices, required statements, and other non-research content.
        - Supporting documents (letters, CVs, references, etc.).
        - Bureaucratic sections (budget, compliance, eligibility, address information etc.).
    2. All sections need unique names globally across the entire tree.
    3. The root node and front matter are not included in the sections or parts - these are assumed to be part of the application structure.
    4. Define all parent-child relationships:
        - Every section/part must reference a valid parent.
        - Root is indicated by "<root>" parent_id.
    5. Specify all section dependencies.
    6. Parts are structural containers only (e.g., "Part 1", "Part 2", "Narrative", "Resources").
    7. One and only one section must be marked as research plan (is_research_plan: true).
    8. All sections must have max_words > 0.
    9. Each section must have between 3-10 search queries.
    10. Each section must have at least 1 keyword.
    11. Generation instructions must be non-empty and describe the section's purpose and requirements.
    12. Titles must be between 1-255 characters.
    13. Dependencies cannot form cycles.
    14. Parent relationships cannot form cycles.
    15. Total word count must not exceed application maximum.
    16. Research plan must be 50-66% of total word count.
    17. The order of sections must be consistent with the application structure and guidelines.
    18. The value of order must be unique among siblings: if two elements (part or section) have the same `parent_id`, the value of order **MUST** be different

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


def validate_template_sections(response: TemplateSectionsResponse) -> None:  # noqa: C901, PLR0912
    """Validate the extracted grant template sections.

    Args:
        response: The extracted grant template sections.

    Raises:
        ValidationError: If the sections are invalid.
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
    sections_by_parent: dict[str, list[GrantSection | GrantPart]] = {}

    for section in response["parts"] + response["sections"]:
        if section["parent_id"] != "<root>":
            parent_graph[section["name"]] = [section["parent_id"]]

        sections_by_parent.setdefault(section["parent_id"], []).append(section)

    for parent_id, siblings in sections_by_parent.items():
        orders = [s["order"] for s in siblings]
        if len(orders) != len(set(orders)):
            raise ValidationError(
                f"Non-unique order values for sections under {parent_id}. The order values of siblings must be unique.",
                context={
                    "parent_id": parent_id,
                    "siblings": [{"name": s["name"], "order": s["order"]} for s in siblings],
                },
            )

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
        increment=5,
    )

    return [*result["parts"], *result["sections"]]
