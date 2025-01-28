from collections import defaultdict
from typing import Final, TypedDict, cast

from src.db.json_objects import GrantPart, GrantSection
from src.exceptions import ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
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

    Note: Additional labels may be added as required based on the application content.

    ## Definition and Scope

    A grant application text includes:
        - Written narrative sections authored by the applicant
        - All textual components requiring original writing and analysis

    ## Technical Model

    Our system models a grant application's structure as a tree of nodes. The nodes can either be a `part` or a `section`, with parts being purely structural headings without content, and sections being a heading with textual content.

    1. The `<root>` node represents the title page and front matter (excluded from the output).

    2. Exactly **one section** must have the `is_research_plan` flag set to `true`:
        - The research plan must comprise **50-66%** of the total application length.
        - Dependencies:
            - The research plan must list only parts in its `depends_on` array, as it is the first content to be generated.
            - All other sections can list both parts and sections in their `depends_on` array.
            - Dependencies do not need to match the `order` property values - they are used only for content generation logic.
        - The research plan includes a detailed discussion of:
             - **Methodology**
             - **Research objectives**
             - **Research tasks**
         *Note:* Other sections may reference these topics, but the research plan serves as the primary section for detailed discussion.
        - The research plan can have **child sections**, as required:
            - For example, **preliminary results** may be structured as a child section in some formats.
            - In other formats, **preliminary results** may appear as a sibling section.

    3. Structure and Ordering:
      - All parts and sections must have a parent - if the part or section is top-level, the parent is `<root>`.
      - Parts and sections can be nested in any combination (parts can have section parents and vice versa).
      - The maximum depth of the tree is 6 levels, including the root node.
      - Siblings are parts or sections that share the same parent.
      - The `order` property must form a sequence starting from 1 across all parts and sections. This order determines the final document structure but is independent of parent-child relationships and dependencies.

    ## Guidelines
    
    ### Filter Out Non-Narrative Elements
    
    1. **Exclude Non-Narrative Elements:** Identify all non narrative parts and sections:
        - skip statement sections, attachments of documents, supporting documents, and forms.
        - if a part has no children, exclude it as well.
    2. Verify that all the parts are the textual parts the applicant needs to write.
    3. Do not include budget sections, supporting documents, biosketches or addendums.
    4. Do not include bibliography, references, appendices etc.
    
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
    4. **Figure Space Allocation:** Reserve 12.5% of total word count for figures and visual elements.
    5. **Research Plan Length:**
       - If specified, use the source-defined maximum.
       - Otherwise, allocate 60% of the adjusted total application length.
    6. **Default Section Lengths:** For sections without explicit limits:
       - Background: 500 words
       - Technical: 1000 words
       - Impact: 500 words
       - Timeline: 300 words
       - Resource: 300 words
       These defaults should be proportionally adjusted based on total length constraints.
    7. **Remaining Words:** Calculate the total words remaining after allocating to the research plan.
    8. **Adjust Non-Research Sections:** Proportionally adjust the lengths of non-research sections to fit within remaining word count.

    ### Search Query Generation
    For each section:
    - Generate 3-10 search queries
    - Optimize for vector store retrieval
    - Use domain-specific terminology from keywords list
    - Focus on technical content relevance
    - Validate query quality against section topics and objectives

    ### Ordering and Cross-References

    1. Organize the parts and sections in the order they should appear in the application text.
    2. Assign each part a sequential number (1, 2, 3, etc.):
        - The order number dictates text placement in the application. 1 is first, 2 is second, etc.
        - Parts serve as structural headings only. Example:
        ```markdown
        ## Part 1: Narrative

        ### Research Strategy
        <research_strategy_content>
        ```
    3. Handle cross-references:
        - References to other sections must be validated against dependencies
        - References can only point to previously defined sections
        - References must use consistent section naming

    ### Topic Labels:
        - Primary topics are provided in the list - prefer these whenever they match the content.
        - When content requires additional topics, you may add them following these rules:
            - Must be descriptive of the content (e.g., "data_collection", "statistical_methods")
            - Must use snake_case formatting

    ## Output Schema

    ```json
    {
        "parts": [{
            "name": "string",                       // Unique identifier
            "title": "string",                      // Part title (1-255 chars)
            "type": "string",                       // "part"
            "parent_id": "string",                  // Parent name or "<root>"
            "order": "integer"                      // Order of appearance in output text
        }],
        "sections": [{
            "name": "string",                       // Unique identifier
            "title": "string",                      // Section heading (1-255 chars)
            "type": "string",                       // "section"
            "is_research_plan": boolean,            // True if research plan - must be true only once
            "parent_id": "string",                  // Parent name or "<root>"
            "keywords": ["string"],                 // List of technical terms (min 1)
            "topics": ["string"],                   // List of topic labels from defined set
            "generation_instructions": "string",     // Non-empty section requirements
            "depends_on": ["string"],               // Valid section dependencies
            "max_words": "integer",                 // Maximum word count (> 0)
            "search_queries": ["string"],           // 3-10 search queries
            "order": "integer"                      // Order of appearance in output text
        }]
    }
    ```

    ## Example Output

    ```json
    {
        "parts": [
            {
                "name": "project_summary",
                "title": "Project Summary",
                "type": "part",
                "parent_id": "<root>",
                "order": 1
            },
            {
                "name": "narrative",
                "title": "Narrative",
                "type": "part",
                "parent_id": "<root>",
                "order": 3
            }
        ],
        "sections": [
            {
                "name": "abstract",
                "title": "Abstract",
                "type": "section",
                "is_research_plan": false,
                "parent_id": "project_summary",
                "order": 2,
                "keywords": ["overview", "objectives"],
                "topics": ["executive_summary"],
                "generation_instructions": "Provide a comprehensive summary of the project's objectives, methodology, and expected outcomes.",
                "depends_on": ["research_strategy"],
                "max_words": 300,
                "search_queries": [
                    "research objectives methodology overview",
                    "project summary expected outcomes",
                    "research goals impact summary"
                ]
            },
            {
                "name": "research_strategy",
                "title": "Research Strategy",
                "type": "section",
                "is_research_plan": true,
                "parent_id": "narrative",
                "order": 4,
                "keywords": ["methodology", "design", "approach"],
                "topics": ["methodology"],
                "generation_instructions": "Detail the research methodology, experimental approach, and analytical methods.",
                "depends_on": [],
                "max_words": 3000,
                "search_queries": [
                    "research methodology experimental design",
                    "analytical methods research approach",
                    "experimental protocol methodology"
                ]
            }
        ]
    }
    ```

    This output can be translated into the following structure:

    ```mermaid
    graph TD
        A[root] --> B[project_summary]
        A --> C[narrative]

        B --> D[abstract]
        C --> E[research_strategy]
    ```

    ## Requirements and Validation Rules

    1. Content Scope:
        - Include only narrative sections requiring original writing
        - Does not include in the output:
            - Non-narrative elements (forms, tables, list of figures, attachments)
            - Front-matter and back-matter
            - Addendums and notices
            - Supporting documents
            - Bureaucratic sections

    2. Structural Requirements:
        - All section/part names must be unique across the entire tree
        - Root node and front matter are excluded from sections/parts list
        - Maximum tree depth of 6 levels (including root)
        - Parts must not contain content (structural containers only)
        - Valid parent-child relationships required for all nodes
        - No circular dependencies or parent relationships

    3. Research Plan Requirements:
        - Exactly one section with `"is_research_plan": true` - it can have child sections, but they should be marked `"is_research_plan": false`
        - Research plan usually takes 50-66% of total word count (exceptions to this rule exist)
        - Research plan cannot depend on other sections (but can depend on parts)
        - Other sections may depend on research plan

    4. Content Requirements:
        - All sections must have max_words > 0
        - Total word count must not exceed application maximum
        - Each section must have 3-10 search queries
        - Each section must have at least 1 keyword
        - Generation instructions must be detailed
        - Order values must form a sequence starting from 1 across all parts and sections
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
                    "name": {"type": "string", "minLength": 1},
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "type": {"type": "string", "enum": ["part"]},
                    "parent_id": {"type": "string"},
                    "order": {"type": "integer", "minimum": 1},
                },
            },
        },
        "sections": {
            "type": "array",
            "minItems": 1,
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
                    "name": {"type": "string", "minLength": 1},
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "type": {"type": "string", "enum": ["section"]},
                    "is_research_plan": {"type": "boolean"},
                    "parent_id": {"type": "string"},
                    "keywords": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                    "topics": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                    "generation_instructions": {"type": "string", "minLength": 1},
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
    sections: list[GrantSection]


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
        ValidationError: If the response is invalid.
    """
    name_counts = defaultdict[str, int](int)
    for name in [part["name"] for part in response["parts"]] + [section["name"] for section in response["sections"]]:
        name_counts[name] += 1
        if name_counts[name] > 1:
            raise ValidationError("Duplicate section/part names found", context={"duplicate_name": name})

    research_plan_sections = [s for s in response["sections"] if s["is_research_plan"]]
    if len(research_plan_sections) != 1:
        raise ValidationError(
            "Must have exactly one research plan section", context={"research_plan_count": len(research_plan_sections)}
        )

    research_plan = research_plan_sections[0]
    part_names = {p["name"] for p in response["parts"]}
    invalid_deps = [dep for dep in research_plan["depends_on"] if dep not in part_names]
    if invalid_deps:
        raise ValidationError("Research plan can only depend on parts", context={"invalid_dependencies": invalid_deps})

    parent_map = {"<root>": 0}  # node -> depth
    for item in [*response["parts"], *response["sections"]]:
        parent_map[item["name"]] = -1  # Add all nodes first, depth calculated later

    # Now validate parents exist and calculate depths
    for item in [*response["parts"], *response["sections"]]:
        if item["parent_id"] not in parent_map:
            raise ValidationError(
                "Invalid parent reference", context={"invalid_parent": item["parent_id"], "section": item["name"]}
            )

        current = item["name"]
        depth = 0
        path = set()

        while current != "<root>":
            if current in path:
                raise ValidationError(
                    "Circular parent-child relationships detected", context={"starting_node": current}
                )
            path.add(current)
            current = next(x["parent_id"] for x in [*response["parts"], *response["sections"]] if x["name"] == current)
            depth += 1
            if depth > 5:
                raise ValidationError(
                    "Tree depth exceeds maximum of 6 levels", context={"section": item["name"], "depth": depth + 1}
                )

    all_names = part_names | {s["name"] for s in response["sections"]}
    non_research_sections = [s for s in response["sections"] if not s["is_research_plan"]]
    for section in non_research_sections:
        invalid_deps = [dep for dep in section["depends_on"] if dep not in all_names]
        if invalid_deps:
            raise ValidationError(
                "Dependencies reference non-existent parts/sections",
                context={"section": section["name"], "invalid_dependencies": invalid_deps},
            )

    all_orders = [item["order"] for item in [*response["parts"], *response["sections"]]]
    expected_orders = set(range(1, len(all_orders) + 1))
    if len(set(all_orders)) != len(expected_orders):
        raise ValidationError(
            "Order values must form a sequence of numbers without repetition starting from 1 across all parts and sections",
            context={"found_orders": sorted(all_orders), "expected_orders": sorted(expected_orders)},
        )

    # Check for circular parent relationships
    parent_graph = defaultdict(list)
    for item in [*response["parts"], *response["sections"]]:
        if item["parent_id"] != "<root>":
            parent_graph[item["parent_id"]].append(item["name"])

    for name in parent_graph:
        if detect_cycle(parent_graph, name, set(), set()):
            raise ValidationError("Circular parent-child relationships detected", context={"starting_node": name})

    # Check for circular dependencies
    dependency_graph = defaultdict(list)
    for section in response["sections"]:
        dependency_graph[section["name"]].extend(section["depends_on"])

    for name in dependency_graph:
        if detect_cycle(dependency_graph, name, set(), set()):
            raise ValidationError("Circular dependencies detected", context={"starting_node": name})


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
        passing_score=95,
        increment=5,
        retries=5,
        criteria=[
            EvaluationCriterion(
                name="Completeness",
                evaluation_instructions="""
    Evaluate the completeness of the grant template by checking:

    1. Parts Structure:
        - All required structural parts are included
        - Each part has a valid parent relationship
        - Parts have appropriate titles and ordering
        - No content elements in parts (structural only)

    2. Sections Content:
        - All narrative sections identified and included
        - Each section has complete metadata (keywords, topics, etc.)
        - Generation instructions are provided and detailed
        - Search queries are present (3-10 per section)
        - Word limits are specified for all sections
        - Dependencies are clearly defined

    3. Research Plan Section:
        - Exactly one section marked as research plan
        - Research plan has appropriate word allocation (50-66% of total)
        - Child sections properly related to research plan
        - Dependencies properly restricted to parts only

    Score lower if any required elements are missing or incomplete.
    """,
            ),
            EvaluationCriterion(
                name="Correctness",
                evaluation_instructions="""
    Assess the technical accuracy and validity of the template structure:

    1. Tree Structure:
        - Maximum depth of 6 levels (including root)
        - Valid parent-child relationships
        - No circular dependencies
        - Proper nesting of parts and sections

    2. Data Validation:
        - Unique section/part names across tree
        - Sequential order values (1, 2, 3, ...)
        - Valid parent_id references
        - Correct data types for all fields

    3. Dependency Logic:
        - Research plan only depends on parts
        - Valid section and part references in dependencies
        - No circular dependency chains
        - Logical progression of dependencies

    Score lower for any technical errors or structural inconsistencies.
    """,
            ),
            EvaluationCriterion(
                name="Prompt Adherence",
                evaluation_instructions="""
    Evaluate adherence to prompt requirements and guidelines:

    1. Section Requirements:
        - Follows JSON schema exactly
        - Includes all required fields
        - Proper formatting of arrays and values
        - Adheres to field constraints (min/max values)

    2. Content Guidelines:
        - Research plan comprises 50-66% of total length
        - Word counts properly allocated
        - Topics selected from provided list
        - Search queries follow specified format

    3. Structure Rules:
        - Non-narrative elements excluded
        - Front/back matter excluded
        - Supporting documents excluded
        - Only original writing sections included

    Score lower if output deviates from prompt specifications.
    """,
            ),
            EvaluationCriterion(
                name="Relevance",
                evaluation_instructions="""
    Evaluate the relevance and appropriateness of template content:

    1. Section Relevance:
        - Sections align with grant application purpose
        - Topics match section content
        - Keywords appropriate for subject matter
        - Search queries target relevant content

    2. Source Integration:
        - Template reflects CFP requirements
        - Organizational guidelines incorporated
        - Section structure matches grant type
        - Word limits align with guidelines

    3. Content Focus:
        - Narrative sections properly identified
        - Appropriate scope for each section
        - Clear content boundaries
        - Logical content progression

    Score lower if content strays from grant requirements or source materials.
    """,
            ),
            EvaluationCriterion(
                name="Scope",
                evaluation_instructions="""
    Evaluate the scope and boundaries of included content:

    1. Inclusion Criteria:
        - Only narrative sections requiring original writing
        - Essential grant application components
        - Required research plan elements
        - Necessary supporting narratives

    2. Exclusion Verification:
        - No forms or administrative sections
        - No tables or figures sections
        - No attachments or appendices
        - No bureaucratic elements

    Score lower if scope includes inappropriate content or excludes required elements.
    """,
                weight=1.5,
            ),
        ],
    )

    sorted_sections = cast(
        list[GrantSection | GrantPart], sorted([*result["parts"], *result["sections"]], key=lambda x: x["order"])
    )
    for i, section in enumerate(sorted_sections):
        section["order"] = i + 1

    return sorted_sections
