from collections import defaultdict
from typing import Final, NotRequired, TypedDict

from sentence_transformers import SentenceTransformer, util

from src.constants import ANTHROPIC_SONNET_MODEL
from src.db.tables import FundingOrganization
from src.exceptions import InsufficientContextError, ValidationError
from src.patterns import SNAKE_CASE_PATTERN
from src.rag.completion import handle_completions_request
from src.rag.grant_template.validation_utils import detect_cycle
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.embeddings import get_embedding_model
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.ref import Ref
from src.utils.sync import run_sync

logger = get_logger(__name__)
ref = Ref[SentenceTransformer]()
exclude_embeddings_ref = Ref[list[float]]()


async def get_exclude_embeddings() -> list[float]:
    """Get the embeddings to exclude."""
    if exclude_embeddings_ref.value is None:
        model = await run_sync(get_embedding_model)
        tensor = model.encode(EXCLUDE_CATEGORIES, convert_to_tensor=True, device="cpu")
        exclude_embeddings_ref.value = tensor.tolist()
    return exclude_embeddings_ref.value


EXCLUDE_CATEGORIES = [
    # Administrative documents
    "Advisory Input",
    "Application Processing",
    "Approvals",
    "Certifications",
    "Checklists",
    "Clearances",
    "Contact Information",
    "Cover Sheets",
    "Credentials",
    "Eligibility Criteria",
    "Evaluation Criteria",
    "Expert Reviews",
    "Feedback",
    "Front Matter",
    "Navigation Elements",
    "Page Limits",
    "Policies",
    "Reviewers",
    "Reviewer Instructions",
    "Submission Forms",
    "Submission Guidelines",
    "Submission Requirements",
    "Supporting Documentation",
    # References and metadata
    "Appendices",
    "Bibliography",
    "Citations",
    "Figure Index",
    "References",
    "Supplements",
    "Table Index",
    "Table of Contents",
    "ToC",
    # Personnel documentation
    "Biosketch",
    "C.V.",
    "CVs",
    "Current/Pending Support",
    "Curriculum Vitae",
    "Department Details",
    "Institutional Information",
    "Laboratory/Center Data",
    "Letters of Support",
    "Patent Records",
    "Personnel",
    "Previous Funding",
    "Previous Grant Performance",
    "Publication Records",
    # Budget and resources
    "Breakdown of Subcontracted Work Costs",
    "Budget Justification",
    "Budget",
    "Computing Costs",
    "Computing Resources",
    "Conference Travel",
    "Costs",
    "Equipment List",
    "Equipment Specs",
    "Equipment Usage",
    "Expenses",
    "Facility Access",
    "Facility Use Agreements",
    "Funding Justification Statements",
    "High-Performance Computing Resources",
    "Infrastructure",
    "Laboratory Space",
    "Space Allocation",
    # Compliance and authorizations
    "Biosafety Protocol",
    "Collaboration Agreements",
    "Data Use Agreements",
    "Ethical Approvals",
    "Ethical Use of AI Authorization",
    "IRB",
    "Laboratory Safety",
    "Open Science Compliance Plan",
    "Other Authorizations",
    "Protocol Details",
    "Quality Assurance",
    "Quality Control",
    "Radiation Safety",
    "Safety Certifications",
    "Safety Protocols",
    "Standard Operating Procedures",
    # Supplementary technical materials
    "Algorithms & Code Repositories",
    "Analysis Scripts",
    "Code Sharing",
    "Data Supplements",
    "Dataset Provenance Documentation",
    "Interactive Visualizations or Datasets",
    "Raw Data",
    "Software Documentation",
    # Career development (context-dependent)
    "Career Goals",
    "Coursework",
    "DEI",
    "Diversity",
    "Partnerships",
    "Partnerships with Non-STEM Fields",
    "Skill Development",
    "Specialized Training",
    "STEM Career Development",
    "Training",
    "Workshops on Ethical Research Practices",
    # Data management (may be required in some grants)
    "Data Management",
    # Project management (context-dependent)
    "Environmental Impact Assessment",
    "Project Management",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES = [
    # Core queries focused on workplan identification and structure
    "detailed workplan research plan experimental approach specific aims methodology protocols",
    "research strategy experimental design technical approach methods procedures protocols",
    "project timeline milestones tasks deliverables research objectives implementation",
    # Grant structure and required sections
    "grant application structure required sections template organization format",
    "application guidelines formatting requirements section organization hierarchy",
    "proposal organization mandatory sections required components outline structure",
    # Scientific content and section relationships
    "technical abstract methodology results scientific premise evidence rationale",
    "project summary objectives goals research strategy experimental design",
    "technical background state of art literature integration findings review",
    "innovation approach novel methods preliminary results experimental data",
    "expected outcomes anticipated results impact advancement knowledge",
    "scientific methodology data analysis findings implementation relationship between sections",
    # Specialized section identification
    "clinical trial requirements intervention protocol human subjects research",
    "section hierarchical relationships parent child dependencies workplan",
    "distinguishing features workplan background significance innovation approach methodology",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT: Final[str] = """
You are a specialized system designed to analyze STEM grant application requirements and generate structured specifications.
You excel at identifying section hierarchies and distinguishing between different section types, especially workplan sections which contain the actual research methodology and experimental approach.
You understand the nuances of different funding organizations' requirements and can correctly identify mandatory sections even when they use different terminology.
"""

EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_grant_application_sections",
    template="""
    # Grant Application Section Extraction

    You are tasked with determining the correct format for a grant application given the provided sources.

    ## Sources

    ${organization_guidelines}

    This is the text extracted from the funding opportunity announcement:

    ### Announcement Content:

    #### The announcement subject is:

    <cfp_subject>
    ${cfp_subject}
    </cfp_subject>

    #### And these are the requirements and guidelines extracted from the announcement:

    <cfp_content>
    ${cfp_content}
    </cfp_content>

    ## Instructions

    1. Identify the sections the grant application should have from the provided sources:
        - When organization guidelines are available, they take precedence over CFP requirements.
        - Base yourself on the available sources.
        - If reasonable assumptions cannot be made with high confidence (75%) based on sources, stop and return an error.

    2. Model the structure as a tree:
        - Maximum nesting depth is 5 levels
        - Sections can have a 'parent_id'. Top level sections have null parent_id.
        - Top-level sections correlate with H2 headings, child sections with H3 to H6 headers.
        - Be detailed in identifying all sections and subsections within nesting limit.

    3. Identify and flag the workplan details section:
        - Identify all the sections that are potential candidates to be the detailed workplan:
            - The detailed workplan is a section that includes the specific detailed planned experimental and analytical steps of the project.
            - It contains the actual methodologies, techniques, procedures, and protocols that will be used to conduct the research.
            - It does not include in itself or as subsections: significance, innovation, impact, background, etc.
            - It could be a top-level or child section depending on the grant structure.
            - It does not have child sections.
            - It is typically one of the longest and most detailed sections in the grant application.
            - Common names for this section include: Work Plan, Research Plan, Research Strategy, Research Design, Research Details, Project Details, Experimental Design, Methods, Approach, Methodology, Technical Approach, Experimental Plan, etc.
            - Some organizations may split the workplan across multiple sections (e.g., "Methods" and "Approach") - in this case, identify the section that contains the most detailed experimental procedures.
        - Select the most fitting candidate and flag exactly one section as the detailed workplan.
        - Pay special attention to distinguishing between "Specific Aims" (which lists objectives) and the actual workplan (which details how those aims will be achieved).
        - The workplan must contain specific experimental procedures, not just goals or outcomes.
        - The workplan section MUST ALWAYS be marked as a long-form section.
        - If no section can be reasonably assigned as the workplan details, return an error.

    4. Identify and flag all sections that belong to the research long form sections:
      - Research long form sections are sections that the applicants write (i.e. not external materials, letters of support, etc.).
      - Include any section that has a specific length limit
      - Exclude sections that do not fit into the previous steps, if they belong to any of the following categories:
            <exclude_categories>
            ${exclude_categories}
            </exclude_categories>

    5. Identify and flag all sections that are titles only.
        - Titles only sections are sections that contain only a title and subsections, e.g. "Part 1", etc.

    6. Identify and flag all sections that are clinical trial sections:
        - Clinical trial sections are sections that describe the clinical trial aspects of the project.
        - These sections do not appear in all grant applications, only those that may potentially involve clinical trials.

    7. Assign an order to each section:
        - Order starts at 1 and increments by 1 for each section.
        - The order should reflect the order of the section in the application.

    8. Review and validate results:
      - If your confidence is below 75% about:
        - Required sections being identified correctly.
        - Section hierarchy accuracy.
        - Section that are titles only.
        - Workplan section identification.
        - Long form sections identification.
        - Top-level title identification.
        - Adherence to organization guidelines.
      Then return detailed error message explaining low confidence causes and empty sections array

    ## Output

    Respond with a JSON object adhering to the following format:

    ```json
    {
       "sections": [{                           // List of sections, empty if insufficient information
           "id": "string",                      // Unique snake_case identifier, e.g. 'abstract'
           "is_clinical_trial": "boolean",      // Whether the section is a clinical trial section, nullable
           "is_detailed_workplan": "boolean",   // Whether the section is the work plan, nullable
           "is_long_form": "boolean",           // Whether the section is a long form section, required
           "is_title_only": "boolean",          // Whether the section contains only a title, nullable
           "order": "integer"                   // Order of the section in the grant application, starts at 1
           "parent_id": "string",               // ID of parent section, nullable
           "title": "string",                   // Section title as appears in source
       }],
       "error": "string"                        // Error message if applicable, null if no error
    }
    ```
    """,
)

ORGANIZATION_GUIDELINES_FRAGMENT: Final[PromptTemplate] = PromptTemplate(
    name="organization_fragment",
    template="""
The grant application is for a funding opportunity offered by the ${organization_full_name} (${organization_abbreviation}):

These are retrieval results for the organization application writing guidelines from our database:

### Organization Guidelines
    <rag_results>
    ${rag_results}
    </rag_results>

If these guidelines are available (non-empty JSON array):
- Treat them as the PRIMARY and AUTHORITATIVE source
- Use the announcement content for additional context only
- Organization guidelines take precedence over CFP in case of conflicts
- Pay special attention to:
  - Organization-specific section naming conventions
  - Required section hierarchies and dependencies
  - Mandatory sections that must be included
  - Special formatting or content requirements
  - Organization-specific terminology for workplan sections

If no organization guidelines are available, use the CFP as the primary source for guidelines.

Remember that different funding organizations often use different terminology for the same concepts (e.g., "Research Strategy" at NIH vs "Research Plan" at NSF). Correctly map these equivalent sections despite terminology differences.
""",
)

section_extraction_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "error": {"type": "string", "nullable": True},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title", "id", "parent_id", "is_long_form"],
                "properties": {
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                    },
                    "order": {"type": "integer", "minimum": 1},
                    "parent_id": {"type": "string", "nullable": True},
                    "is_detailed_workplan": {"type": "boolean", "nullable": True},
                    "is_title_only": {"type": "boolean", "nullable": True},
                    "is_long_form": {"type": "boolean"},
                    "is_clinical_trial": {"type": "boolean", "nullable": True},
                },
            },
        },
    },
}


class ExtractedSectionDTO(TypedDict):
    """Represents a single section in the grant application."""

    title: str
    """The title of the section."""
    id: str
    """The unique identifier of the section."""
    order: int
    """The order of the section in the grant application."""
    parent_id: NotRequired[str | None]
    """The parent section ID if this section is a sub-section."""
    is_detailed_workplan: NotRequired[bool | None]
    """Whether the section is the work plan."""
    is_title_only: NotRequired[bool | None]
    """Whether the section contains only a title."""
    is_clinical_trial: NotRequired[bool | None]
    """Whether the section is a clinical trial section."""
    is_long_form: bool
    """Whether the section is a long form section."""


class ExtractedSections(TypedDict):
    """Container for all extracted sections."""

    sections: list[ExtractedSectionDTO]
    """List of sections, empty if insufficient information."""
    error: NotRequired[str | None]
    """Error message if applicable, null if no error."""


def validate_section_extraction(response: ExtractedSections) -> None:
    """Validate the extracted sections structure.

    Args:
        response: The extracted sections to validate.

    Raises:
        ValidationError: If the response is invalid.
        InsufficientContextError: If no sections were extracted.
    """
    if not response["sections"]:
        if error := response.get("error"):
            raise InsufficientContextError(error)
        raise ValidationError("No sections extracted. Please provide an error message.", context=response)

    # Check section titles are meaningful
    for section in response["sections"]:
        if len(section["title"].strip()) < 3:
            raise ValidationError(
                "Section title too short or empty", context={"section_id": section["id"], "title": section["title"]}
            )

    # Check for duplicate titles
    section_titles = [section["title"].strip().lower() for section in response["sections"]]
    for title in set(section_titles):
        if section_titles.count(title) > 1:
            duplicate_sections = [s for s in response["sections"] if s["title"].strip().lower() == title]
            raise ValidationError(
                "Duplicate section titles found",
                context={"title": title, "section_ids": [s["id"] for s in duplicate_sections]},
            )

    # Check order values
    all_orders = [section["order"] for section in response["sections"]]
    if len(set(all_orders)) != len(all_orders):
        duplicate_orders = [order for order in all_orders if all_orders.count(order) > 1]
        raise ValidationError("Duplicate order values found", context={"duplicate_orders": duplicate_orders})

    if min(all_orders) != 1 or max(all_orders) != len(all_orders):
        raise ValidationError(
            "Order values must start at 1 and be consecutive",
            context={"min_order": min(all_orders), "max_order": max(all_orders), "expected_max": len(all_orders)},
        )

    # Check for duplicate IDs
    section_ids = [section["id"] for section in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        duplicate_ids = [section_id for section_id in section_ids if section_ids.count(section_id) > 1]
        raise ValidationError(
            "Duplicate section IDs found. Section IDs must be unique.", context={"duplicate_ids": duplicate_ids}
        )

    # Check for exactly one workplan section
    workplan_sections = [s for s in response["sections"] if s.get("is_detailed_workplan")]
    if len(workplan_sections) != 1:
        raise ValidationError(
            f"Exactly one section must be marked as detailed workplan. Found {len(workplan_sections)}.",
            context={"workplan_sections": [s["id"] for s in workplan_sections]},
        )

    # Check that workplan section is marked as long-form
    if workplan_sections and not workplan_sections[0].get("is_long_form"):
        raise ValidationError(
            "The detailed workplan section must be marked as a long-form section",
            context={"workplan_id": workplan_sections[0]["id"], "title": workplan_sections[0]["title"]},
        )

    # Check for at least one long-form section
    long_form_sections = [s for s in response["sections"] if s.get("is_long_form")]
    if not long_form_sections:
        raise ValidationError("At least one section must be marked as long-form")

    # Build section map and dependency graph
    mapped_sections = {section["id"]: section for section in response["sections"]}
    dependency_graph = defaultdict[str, list[str]](list)
    for section in response["sections"]:
        if parent_id := section.get("parent_id"):
            dependency_graph[section["id"]].append(parent_id)

    # Check for circular dependencies
    for section_id in dependency_graph:
        if detect_cycle(graph=dependency_graph, start=section_id):
            raise ValidationError(
                "Circular dependency detected in section hierarchy",
                context={"starting_node": section_id},
            )

    # Validate each section's properties
    valid_ids = set(section_ids)
    for section in response["sections"]:
        # Check ID format
        if not SNAKE_CASE_PATTERN.match(section["id"]):
            raise ValidationError(
                "Invalid section ID format", context={"section_id": section["id"], "expected_format": "snake_case"}
            )

        if len(section["id"].split("_")) < 2:
            raise ValidationError(
                "Section ID must be descriptive (at least two words)",
                context={"section_id": section["id"]},
            )

        # Check parent references
        if section["parent_id"]:
            if section["parent_id"] not in valid_ids:
                raise ValidationError(
                    f"Invalid parent section reference. The section {section['id']} defines a parent section {section['parent_id']} that does not exist in the sections list.",
                )
            if mapped_sections[section["parent_id"]].get("is_detailed_workplan"):
                raise ValidationError(
                    "The workplan section cannot have any sub-sections as children",
                    context={"workplan_id": section["parent_id"], "child_id": section["id"]},
                )

        # Calculate section depth
        depth = 1  # Start at 1 for the section itself
        current_id = section["id"]
        while parent_id := mapped_sections[current_id].get("parent_id"):
            depth += 1
            current_id = parent_id

        if depth > 5:
            raise ValidationError(
                "Maximum nesting depth exceeded",
                context={"section_id": section["id"], "depth": depth, "max_depth": 5},
            )


def _should_keep_section(
    section: ExtractedSectionDTO,
    sections: list[ExtractedSectionDTO],
    threshold: float,
    exclude_embeddings: list[float],
) -> bool:
    """Check if a section should be kept based on its semantic similarity to excluded categories.

    Args:
        section: Extracted section to check
        sections: List of all extracted sections
        threshold: Maximum allowed similarity score (0-1)
        exclude_embeddings: List of embeddings for excluded categories

    Returns:
        bool: True if the section should be kept, False if it's too similar to excluded categories
    """
    # Always keep workplan sections
    if section.get("is_detailed_workplan"):
        return True

    # Check if this is a long-form section or has long-form children
    has_long_form_children = any(s.get("parent_id") == section["id"] and s.get("is_long_form") for s in sections)

    # Check if this is a parent of a section we want to keep
    # This prevents orphaned hierarchies
    has_important_role = section.get("is_long_form") or has_long_form_children

    if not has_important_role:
        # Additional check: is this section a parent of any section?
        is_parent = any(s.get("parent_id") == section["id"] for s in sections)
        if not is_parent:
            return False

    # String matching with normalized text
    normalized_title = section["title"].lower().strip()
    for category in EXCLUDE_CATEGORIES:
        normalized_category = category.lower().strip()
        # Check both ways: category in title and title in category
        if normalized_category in normalized_title or normalized_title in normalized_category:
            return False

    try:
        # Compute semantic similarity
        model = get_embedding_model()
        title_embedding = model.encode(section["title"], convert_to_tensor=True, device="cpu")

        similarities = util.cos_sim(title_embedding, exclude_embeddings)
        if similarities is not None and len(similarities) > 0:
            max_similarity = float(similarities[0].max().item())
            return max_similarity < threshold

        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Embedding calculation failed for section", title=section["title"], error=str(e))
        return True


async def filter_extracted_sections(
    sections: list[ExtractedSectionDTO], initial_threshold: float = 0.7
) -> list[ExtractedSectionDTO]:
    """Filter sections based on semantic similarity to excluded categories.

    Uses an adaptive threshold that gradually increases if no detailed workplan
    sections are found in the filtered results. This ensures we don't accidentally
    filter out critical sections.

    Args:
        sections: List of extracted sections to filter
        initial_threshold: Initial similarity threshold (0.1-0.9)

    Returns:
        List of sections that passed the similarity threshold check
    """
    exclude_embeddings = await get_exclude_embeddings()
    threshold = initial_threshold
    max_threshold = 0.9

    # Try filtering with increasingly lenient thresholds
    while threshold <= max_threshold:
        sections_to_keep = [
            _should_keep_section(
                section=section,
                sections=sections,
                threshold=threshold,
                exclude_embeddings=exclude_embeddings,
            )
            for section in sections
        ]

        filtered_sections = [
            section for section, should_keep in zip(sections, sections_to_keep, strict=True) if should_keep
        ]

        # Check if we have a workplan section
        has_workplan = any(s.get("is_detailed_workplan") for s in filtered_sections)

        # Ensure we keep at least one section marked as long-form
        has_long_form = any(s.get("is_long_form") for s in filtered_sections)

        if has_workplan and has_long_form:
            # Maintain hierarchy integrity
            return _maintain_hierarchy_integrity(filtered_sections)

        # If we filtered out critical sections, relax threshold
        threshold += 0.05

    # If we couldn't find a threshold that preserves required sections,
    # default to keeping all workplan and long-form sections
    fallback_sections = [
        section for section in sections if section.get("is_detailed_workplan") or section.get("is_long_form")
    ]

    if not fallback_sections:
        # Last resort: just keep the original workplan
        fallback_sections = [section for section in sections if section.get("is_detailed_workplan")]

    return _maintain_hierarchy_integrity(fallback_sections or sections)


def _maintain_hierarchy_integrity(sections: list[ExtractedSectionDTO]) -> list[ExtractedSectionDTO]:
    """Ensure filtered sections maintain valid parent-child relationships.

    Args:
        sections: The filtered sections

    Returns:
        Sections with fixed parent relationships and consecutive ordering
    """
    # Get valid section IDs after filtering
    valid_ids = {s["id"] for s in sections}

    for section in sections:
        if (parent_id := section.get("parent_id")) and parent_id not in valid_ids:
            section["parent_id"] = None

    # Fix ordering to be consecutive
    sorted_sections = sorted(sections, key=lambda s: s["order"])
    for i, section in enumerate(sorted_sections, start=1):
        section["order"] = i

    return sorted_sections


async def extract_sections(task_description: str) -> ExtractedSections:
    """Extract and classify sections from grant application materials.

    Args:
        task_description: Description of the task to be performed

    Returns:
        Classified sections with their relationships and metadata
    """
    return await handle_completions_request(
        prompt_identifier="section_extraction",
        model=ANTHROPIC_SONNET_MODEL,
        messages=task_description,
        system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
        response_schema=section_extraction_json_schema,
        response_type=ExtractedSections,
        validator=validate_section_extraction,
    )


evaluation_criteria = [
    EvaluationCriterion(
        name="Section Extraction",
        evaluation_instructions="""
        Evaluate whether the extracted sections are accurate and complete:
            - At least 90% of identifiable sections from source materials are present
            - Sections are correctly identified and classified with proper terminology
            - Section titles are correct, consistent, and match source material language
            - No critical sections are missing based on CFP requirements
        """,
        weight=1.5,
    ),
    EvaluationCriterion(
        name="Content Architecture",
        evaluation_instructions="""
        Assess the logical organization and completeness of content:
            - Sections follow a coherent hierarchical structure limited to 5 levels
            - Section dependencies form a logical flow without circular references
            - Organization between sections follows standard grant application patterns
            - Section relationships reflect natural content flow and research narrative
            - Sections are balanced in depth across different components
            - Proper parent-child relationships are established for all nested sections
        """,
    ),
    EvaluationCriterion(
        name="Work Plan Identification",
        evaluation_instructions="""
        Verify Work plan section identification:
            - Exactly one section is marked as detailed workplan
            - The correct section is identified as the workplan given the available sources
            - Workplan contains research objectives and experimental steps
            - Workplan section is appropriately placed in hierarchy
            - Workplan doesn't contain ineligible content (background, significance, etc.)
            - Workplan section is positioned appropriately in relation to other sections
        """,
        weight=1.5,
    ),
    EvaluationCriterion(
        name="Section Type Classification",
        evaluation_instructions="""
        Verify accuracy of section type flags:
            - Long-form sections correctly identified based on length requirements
            - Title-only sections properly marked
            - Clinical trial sections accurately identified
            - Types align with section content and purpose
            - No conflicting type assignments exist
            - Edge cases are handled appropriately (e.g., sections that could be multiple types)
        """,
    ),
    EvaluationCriterion(
        name="Source Material Compliance",
        evaluation_instructions="""
        Evaluate adherence to source materials:
            - Primary: Organization guidelines (when provided)
            - Secondary: CFP requirements
            - Section names match source terminology with at least 90% accuracy
            - All required sections from sources are included
            - Structure follows source-specified organization
            - Any conflicts between organization guidelines and CFP requirements are resolved appropriately
            - Domain-specific requirements for the scientific field are met
        """,
        weight=1.2,
    ),
    EvaluationCriterion(
        name="Contextual Relevance",
        evaluation_instructions="""
        Assess how well the structure fits the specific funding context:
            - Sections are appropriate for the specific scientific domain
            - Structure aligns with the funding type (research grant, fellowship, etc.)
            - Extracted sections reflect the specific focus areas mentioned in the CFP
            - Template sections are relevant to the funding organization's priorities
            - Structure accommodates any special requirements unique to this CFP
            - Sections support a coherent scientific narrative appropriate for the field
        """,
    ),
    EvaluationCriterion(
        name="Completeness & Proportionality",
        evaluation_instructions="""
        Evaluate the completeness and balance of the extracted structure:
            - The overall structure covers all necessary components of a competitive application
            - Section proportions reflect appropriate emphasis based on CFP priorities
            - No obvious gaps exist in the logical flow of the application
            - Structure allows for complete presentation of scientific ideas
            - Balance between technical sections and impact/significance sections
            - Appropriate space allocation for different components based on their importance
        """,
    ),
]


async def handle_extract_sections(
    cfp_content: str, cfp_subject: str, organization: FundingOrganization | None = None
) -> list[ExtractedSectionDTO]:
    """Extract and classify sections from grant application materials.

    Args:
        cfp_content: Content of the call for proposals
        cfp_subject: Subject of the call for proposals
        organization: The funding organization

    Returns:
        Classified sections with their relationships and metadata
    """
    prompt = EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.substitute(
        cfp_subject=cfp_subject,
        cfp_content=cfp_content,
        exclude_categories=",".join(EXCLUDE_CATEGORIES),
    )

    organization_guidelines = (
        ORGANIZATION_GUIDELINES_FRAGMENT.to_string(
            rag_results=await retrieve_documents(
                organization_id=str(organization.id),
                task_description=EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT,
                search_queries=EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES,
                max_results=10,
                model=ANTHROPIC_SONNET_MODEL,
            ),
            organization_full_name=organization.full_name,
            organization_abbreviation=organization.abbreviation,
        )
        if organization
        else ""
    )

    criteria = [*evaluation_criteria]

    if organization:
        criteria.append(
            EvaluationCriterion(
                name="Organization-Specific Compliance",
                evaluation_instructions="""
                Verify strict compliance with this specific organization's guidelines:
                    - Section structure exactly matches these organization's requirements (at least 95% accuracy)
                    - Naming conventions precisely follow this organization's standards and terminology
                    - All organization-specific required sections are included without exception
                    - Hierarchy precisely reflects this organization's documented preferences
                    - Any deviations from organization guidelines are explicitly justified by CFP requirements
                    - Organization-specific formatting or structural requirements are correctly implemented
                    - Special section types unique to this organization are properly identified
                """,
                weight=1.3,
            )
        )

    result = await with_prompt_evaluation(
        prompt_identifier="extract_sections",
        prompt_handler=extract_sections,
        prompt=prompt.to_string(organization_guidelines=organization_guidelines),
        criteria=criteria,
        increment=10,
        retries=5,
    )

    return await filter_extracted_sections(result["sections"])
