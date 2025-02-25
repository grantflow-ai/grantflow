from typing import Final, NotRequired, TypedDict

from sentence_transformers import SentenceTransformer, util

from src.constants import ANTHROPIC_SONNET_MODEL
from src.db.tables import FundingOrganization
from src.exceptions import InsufficientContextError, ValidationError
from src.patterns import SNAKE_CASE_PATTERN
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.embeddings import get_embedding_model
from src.utils.prompt_template import PromptTemplate
from src.utils.ref import Ref
from src.utils.sync import run_sync

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
    "Advisory Input",
    "Algorithms & Code Repositories",
    "Analysis Scripts",
    "Appendices",
    "Application Processing",
    "Approvals",
    "Bibliography",
    "Biosafety Protocol",
    "Biosketch",
    "Breakdown of Subcontracted Work Costs",
    "Budget Justification",
    "Budget",
    "C.V.",
    "CVs",
    "Career Goals",
    "Certifications",
    "Checklists",
    "Citations",
    "Clearances",
    "Code Sharing",
    "Collaboration Agreements",
    "Computing Costs",
    "Computing Resources",
    "Conference Travel",
    "Contact Information",
    "Costs",
    "Coursework",
    "Cover Sheets",
    "Credentials",
    "Current/Pending Support",
    "Curriculum Vitae",
    "DEI",
    "Data Management",
    "Data Supplements",
    "Data Use Agreements",
    "Dataset Provenance Documentation",
    "Department Details",
    "Diversity",
    "Environmental Impact Assessment",
    "Equipment List",
    "Equipment Specs",
    "Equipment Usage",
    "Ethical Approvals",
    "Ethical Use of AI Authorization",
    "Evaluation Criteria",
    "Expenses",
    "Expert Reviews",
    "Facility Access",
    "Facility Use Agreements",
    "Feedback",
    "Figure Index",
    "Front Matter",
    "Funding Justification Statements",
    "High-Performance Computing Resources",
    "IRB",
    "Infrastructure",
    "Institutional Information",
    "Interactive Visualizations or Datasets",
    "Laboratory Safety",
    "Laboratory Space",
    "Laboratory/Center Data",
    "Letters of Support",
    "Navigation Elements",
    "Open Science Compliance Plan",
    "Other Authorizations",
    "Partnerships with Non-STEM Fields",
    "Partnerships",
    "Patent Records",
    "Personnel",
    "Policies",
    "Previous Funding",
    "Previous Grant Performance",
    "Project Management",
    "Protocol Details",
    "Publication Records",
    "Quality Assurance",
    "Quality Control",
    "Radiation Safety",
    "Raw Data",
    "References",
    "Reviewers",
    "STEM Career Development",
    "Safety Certifications",
    "Safety Protocols",
    "Skill Development",
    "Software Documentation",
    "Space Allocation",
    "Specialized Training",
    "Standard Operating Procedures",
    "Submission Forms",
    "Supplements",
    "Supporting Documentation",
    "ToC",
    "Table Index",
    "Table of Contents",
    "Training",
    "Workshops on Ethical Research Practices",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES = [
    "technical abstract methodology results scientific premise evidence rationale",
    "project summary objectives goals research strategy experimental design",
    "technical background state of art literature integration findings review",
    "innovation approach novel methods preliminary results experimental data",
    "research timeline milestones tasks procedures protocols deliverables",
    "expected outcomes anticipated results impact advancement knowledge",
    "scientific methodology experimental design data analysis findings implementation",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT: Final[str] = """"
You are a specialized system designed to analyze STEM grant application requirements and generate structured specifications.
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
        - Identify all the sections that are potential candidate to be the detailed workplan:
            - The detailed workplan is a section that includes the research objectives and specific detailed planned experimental and analytical steps of the project.
            - It does not include in itself or as subsections significance, innovation, impact, background etc.
            - It could be a top-level or child section depending on the grant structure.
            - It does not have child sections.
            - It is usually the longest section in the grant application.
            - Common names for this section are Work Plan, Research Plan, Researech Details, Project Details, Experimental Design etc.
        - Select the most fitting candidate and flag exactly one section as the detailed workplan.
        - If no section can be reasonably assigned as the workplan details, return an error.

    4. Identify and flag all sections that belong to the research long form sections:
      - Research long form sections are sections that the applicants write (i.e. not external materials, letters of support, etc.).
      - Include any section that has a specific length limit
      - Exclude sections that do not fit into the previous steps, if they belong to any of the following categories:
            <exclude_categories>
            ${exclude_categories}
            </exclude_categories>

    5. Identify and flag all sections that are titles only.

    6. Identify and flag all sections that are clinical trial sections:
        - Clinical trial sections are sections that describe the clinical trial aspects of the project.
        - These sections do not appear in all grant applications, only those that may potentially involve clinical trials.

    6. Review and validate results:
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
           "is_detailed_workplan": "boolean",   // Whether the section is the work plan, nullable
           "is_long_form": "boolean",           // Whether the section is a long form section, required
           "is_title_only": "boolean",          // Whether the section contains only a title, nullable
           "is_clinical_trial": "boolean",      // Whether the section is a clinical trial section, nullable
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
The grant application is for a funding opportunity offer by the ${organization_full_name} (${organization_abbreviation}):

These are retrieval results for the organization application writing guidelines from our database:

### Organization Guidelines
    <rag_results>
    ${rag_results}
    </rag_results>

If these are available (non empty JSON array), regard them as the primary source, and use the announcement content for additional context.
Otherwise, use the CFP as the source for guidelines as well.
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

    for section in response["sections"]:
        if not SNAKE_CASE_PATTERN.match(section["id"]):
            raise ValidationError(
                "Invalid section ID format", context={"section_id": section["id"], "expected_format": "snake_case"}
            )
        if section["parent_id"] == section["id"]:
            raise ValidationError(
                "Circular dependency detected. A section cannot be its own parent.",
                context={"section_id": section["id"]},
            )

    section_ids = [section["id"] for section in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        raise ValidationError(
            "Duplicate section IDs found. Section IDs must be unique.", context={"section_ids": section_ids}
        )

    mapped_sections = {section["id"]: section for section in response["sections"]}

    valid_ids = set(section_ids)
    for section in response["sections"]:
        if section["parent_id"] and section["parent_id"] not in valid_ids:
            raise ValidationError(
                f"Invalid parent section reference. The section {section['id']} defines a parent section {section['parent_id']} that does not exist in the sections list.",
            )
        if section["parent_id"] and mapped_sections[section["parent_id"]].get("is_detailed_workplan"):
            raise ValidationError("The workplan section cannot have any sub-sections as children")


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
    if section.get("is_detailed_workplan"):
        return True

    if not section.get("is_long_form") and not any(
        s.get("parent_id") == section["id"] and s.get("is_long_form") for s in sections
    ):
        return False

    if any((section["title"] in v or v in section["title"]) for v in EXCLUDE_CATEGORIES):
        return False

    model = get_embedding_model()
    title_embedding = model.encode(section["title"], convert_to_tensor=True, device="cpu")

    similarities = util.cos_sim(title_embedding, exclude_embeddings)
    if similarities is not None and len(similarities) > 0:
        return float(similarities[0].max().item()) < threshold

    return True


async def filter_extracted_sections(
    sections: list[ExtractedSectionDTO], threshold: float = 0.7
) -> list[ExtractedSectionDTO]:
    """Filter sections based on semantic similarity to excluded categories.

    Uses an adaptive threshold that gradually increases if no detailed workplan
    sections are found in the filtered results. This ensures we don't accidentally
    filter out critical sections.

    Args:
        sections: List of extracted sections to filter
        threshold: Similarity threshold (0.1-0.9)

    Returns:
        List of sections that passed the similarity threshold check
    """
    exclude_embeddings = await get_exclude_embeddings()
    sections_to_keep = [
        _should_keep_section(
            section=section,
            sections=sections,
            threshold=threshold,
            exclude_embeddings=exclude_embeddings,
        )
        for section in sections
    ]
    return [section for section, should_keep in zip(sections, sections_to_keep, strict=True) if should_keep]


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
        name="Technical Structure",
        evaluation_instructions="""
        Evaluate the technical aspects of the extracted structure:
            - Section IDs must use snake_case and be unique
            - IDs should be descriptive and reflect section content
            - No circular dependencies in parent-child relationships
            - Maximum nesting depth of 5 levels is respected
            - Parent section references must be valid
        """,
    ),
    EvaluationCriterion(
        name="Content Architecture",
        evaluation_instructions="""
        Assess the logical organization and completeness of content:
            - Sections follow a coherent hierarchical structure
            - Required grant components are present
            - Organization between sections is logical
            - Section relationships reflect natural content flow
            - Critical grant components aren't missing
        """,
    ),
    EvaluationCriterion(
        name="Work Plan Identification",
        evaluation_instructions="""
        Verify Work plan section identification:
            - Exactly one section is marked as detailed workplan
            - Workplan contains research objectives and experimental steps
            - Workplan section is appropriately placed in hierarchy
            - Workplan doesn't contain ineligible content (background, significance)
            - No subsections exist under workplan
        """,
    ),
    EvaluationCriterion(
        name="Section Type Classification",
        evaluation_instructions="""
        Verify accuracy of section type flags:
            - Long-form sections correctly identified based on length requirements
            - Title-only sections properly marked
            - Clinical trial sections accurately identified
            - No contradictory type assignments
            - Types align with section content and purpose
        """,
    ),
    EvaluationCriterion(
        name="Source Material Compliance",
        evaluation_instructions="""
        Evaluate adherence to source materials:
            - Primary: Organization guidelines (when provided)
            - Secondary: CFP requirements
            - Section names match source terminology
            - Required sections from sources are included
            - Structure follows source-specified organization
        """,
    ),
    EvaluationCriterion(
        name="Exclusion Handling",
        evaluation_instructions="""
        Check proper handling of excluded content:
            - Sections matching exclude categories are omitted
            - Essential sections aren't incorrectly excluded
            - Exclusions don't break hierarchical relationships
            - Similar but non-matching sections are retained
            - Borderline cases are handled appropriately
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
                name="Organization Requirements",
                evaluation_instructions="""
                Verify strict compliance with organization guidelines:
                    - Section structure matches organization requirements
                    - Naming conventions follow organization standards
                    - Organization-specific sections are included
                    - Hierarchy reflects organization preferences
                    - Any deviations from guidelines are justified by CFP
                """,
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
