from asyncio import gather
from typing import Final, NotRequired, TypedDict

from sentence_transformers import SentenceTransformer, util

from src.db.tables import FundingOrganization
from src.exceptions import InsufficientContextError, ValidationError
from src.patterns import SNAKE_CASE_PATTERN
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.prompt_template import PromptTemplate
from src.utils.ref import Ref
from src.utils.sync import run_sync

ref = Ref[SentenceTransformer]()
exclude_embeddings_ref = Ref[list[float]]()


def get_sentence_transformers_model() -> SentenceTransformer:
    """Get the SentenceTransformer model."""
    if not ref.value:
        ref.value = SentenceTransformer("all-MiniLM-L6-v2")
    return ref.value


async def get_exclude_embeddings() -> list[float]:
    """Get the embeddings to exclude."""
    if exclude_embeddings_ref.value is None:
        exclude_embeddings_ref.value = await run_sync(
            get_sentence_transformers_model().encode, EXCLUDE_CATEGORIES, convert_to_tensor=True
        )
    return exclude_embeddings_ref.value


EXCLUDE_CATEGORIES = [
    "Additional Materials",
    "Advisory Input",
    "Algorithms & Code Repositories",
    "Analysis Scripts",
    "Appendices",
    "Application Processing",
    "Approvals",
    "Bibliography",
    "Biosafety Protocol",
    "Breakdown of Subcontracted Work Costs",
    "Broader Societal Impacts of Research",
    "Budget Justification",
    "Budget",
    "CVs",
    "Career Goals",
    "Certifications",
    "Checklists",
    "Citations",
    "Clearances",
    "Code Sharing",
    "Collaboration Agreements",
    "Computational Pipelines and Workflows",
    "Computational Training",
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
    "Documentation",
    "Education",
    "Environmental Impact Assessment",
    "Equipment List",
    "Equipment Specs",
    "Equipment Usage",
    "Equipment",
    "Ethical Approvals",
    "Ethical Use of AI Authorization",
    "Ethics",
    "Evaluation Criteria",
    "Expenses",
    "Expert Reviews",
    "Facilities",
    "Facility Access",
    "Facility Use Agreements",
    "Feedback",
    "Figure Index",
    "Forms",
    "Front Matter",
    "Funding Justification Statements",
    "High-Performance Computing Resources",
    "History",
    "Human Subjects/IRB",
    "Independence Path",
    "Independent Validation of Preliminary Results",
    "Infrastructure",
    "Institutional Information",
    "Integrity",
    "Interactive Visualizations or Datasets",
    "Interdisciplinary Collaboration",
    "Laboratory Safety",
    "Laboratory Space",
    "Laboratory/Center Data",
    "Letters",
    "Milestone Tracking",
    "Navigation Elements",
    "Notes",
    "Open Science Compliance Plan",
    "Other Authorizations",
    "Partnerships with Non-STEM Fields",
    "Partnerships",
    "Patent Records",
    "Personnel",
    "Pilot Data",
    "Policies",
    "Previous Findings",
    "Previous Grant Performance",
    "Project Management",
    "Protection",
    "Protocol Details",
    "Protocols",
    "Publication Records",
    "Quality Assurance",
    "Quality Control",
    "Radiation Safety",
    "Raw Data",
    "References",
    "Review",
    "Reviewers",
    "STEM Career Development",
    "Safety Certifications",
    "Safety Protocols",
    "Skill Development",
    "Skills",
    "Societal Relevance",
    "Software Documentation",
    "Space Allocation",
    "Specialized Training",
    "Staff",
    "Standard Operating Procedures",
    "Standards",
    "Submission Forms",
    "Supplements",
    "Support",
    "TOC",
    "Table Index",
    "Table of Contents",
    "Timeline",
    "Title page",
    "Title",
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

    1. Identify required core research narrative sections from the grant application:
      - Core research narrative sections are sections focused primarily on:
        - Scientific Content
          - Technical Abstract
          - Project Summary
          - Project Narrative
          - Research Strategy/Plan
          - Technical Background
          - Scientific Premise
          - Innovation & Approach
          - Preliminary Results
          - Expected Outcomes
          - Technical Timeline
          - Research Tasks
          - Integration with Existing Literature
        - Technical Impact
          - Scientific Impact
          - Technical Feasibility
          - Risk Mitigation
          - Technology Transfer
          - Research Products
          - Reproducibility Plan
          - Broader Impacts on STEM Fields
        - Research Team
          - Technical Expertise
          - Prior Contributions
          - Team Complementarity
          - Technical Management
          - Research Track Record
          - Diversity and Inclusion in Team Composition
          - Technical Resources Command
      - Only include sections whose primary focus matches the above categories
      - Exclude sections focused primarily on:
            <exclude_categories>
            ${exclude_categories}
            </exclude_categories>
      - When organization guidelines are available, they take precedence over CFP requirements
      - Base yourself on the available sources. If information is lacking, reason about conventional grant structure
      - If reasonable assumptions cannot be made with high confidence based on sources, stop and return an error

    2. Model the structure as a tree:
      - Maximum nesting depth is 5 levels
      - Sections can have a 'parent_id'. Top level sections have null parent_id
      - Top-level sections correlate with H2 headings, child sections with H3 to H6 headers
      - Be detailed in identifying all sections and subsections within nesting limit

    3. Flag the workplan details section:
      - Exactly one section must be flagged as the detailed workplan
      - This section contains only research objectives and specific planned experimental steps
      - Can be top-level or child section depending on grant structure
      - Children of the workplan section should not be flagged as workplan

    4. Review and validate results:
      - If confidence below 60% about:
        - Required sections being identified correctly
        - Section hierarchy accuracy
        - Workplan section identification
        - Adherence to organization guidelines
      Then return detailed error message explaining low confidence causes and empty sections array

    ## Output

    Respond with a JSON object adhering to the following format:

    ```json
    {
       "sections": [{                          // List of sections, empty if insufficient information
           "id": "string",                     // Unique snake_case identifier, e.g. 'abstract'
           "is_detailed_workplan": "boolean",    // Whether the section is the research plan, nullable
           "parent_id": "string",              // ID of parent section, nullable
           "title": "string",                   // Section title as appears in source
       }],
       "error": "string"                       // Error message if applicable, null if no error
    }
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
    "required": ["sections", "parts"],
    "properties": {
        "parts": {"type": "array", "items": {"type": "string", "minLength": 1, "maxLength": 255}},
        "error": {"type": "string", "nullable": True},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["title", "id", "parent_id"],
                "properties": {
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                    },
                    "parent_id": {"type": "string", "nullable": True},
                    "is_detailed_workplan": {"type": "boolean", "nullable": True},
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
    """Whether the section is the research plan."""


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

    valid_ids = set(section_ids)
    for section in response["sections"]:
        if section["parent_id"] and section["parent_id"] not in valid_ids:
            raise ValidationError(
                f"Invalid parent section reference. The section {section['id']} defines a parent section {section['parent_id']} that does not exist in the sections list.",
            )


async def _should_keep_section(title: str, threshold: float, exclude_embeddings: list[float]) -> bool:
    model = get_sentence_transformers_model()
    title_embedding = await run_sync(model.encode, title, convert_to_tensor=True)
    similarities = await run_sync(util.cos_sim, title_embedding, exclude_embeddings)
    if similarities is not None and len(similarities) > 0:
        return float(similarities[0].max().item()) < threshold
    return False


async def filter_extracted_sections(sections: list[ExtractedSectionDTO], threshold: float = 0.3) -> list[dict]:
    """Filter sections based on semantic similarity to excluded categories."""
    exclude_embeddings = await get_exclude_embeddings()

    current_threshold = threshold
    while current_threshold <= 1.0:
        sections_to_keep = await gather(
            *[
                _should_keep_section(
                    title=section["title"], threshold=current_threshold, exclude_embeddings=exclude_embeddings
                )
                for section in sections
            ]
        )
        filtered_sections = [
            section for section, should_keep in zip(sections, sections_to_keep, strict=True) if should_keep
        ]
        if any(s["is_detailed_workplan"] for s in filtered_sections):
            return filtered_sections

        current_threshold += 0.1

    return sections


async def extract_sections(task_description: str) -> ExtractedSections:
    """Extract and classify sections from grant application materials.

    Args:
        task_description: Description of the task to be performed

    Returns:
        Classified sections with their relationships and metadata
    """
    return await handle_completions_request(
        prompt_identifier="section_extraction",
        messages=task_description,
        system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
        response_schema=section_extraction_json_schema,
        response_type=ExtractedSections,
        validator=validate_section_extraction,
        temperature=1.3,
        top_p=0.97,
        candidate_count=3,
    )


async def handle_extract_sections(
    cfp_content: str, cfp_subject: str, organization: FundingOrganization | None = None
) -> ExtractedSections:
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
            ),
            organization_full_name=organization.full_name,
            organization_abbreviation=organization.abbreviation,
        )
        if organization
        else ""
    )
    criteria = [
        EvaluationCriterion(
            name="Section ID Format",
            evaluation_instructions="Verify that all section IDs follow the snake_case format and are unique across the entire response. Check that IDs are descriptive and reflect the section content.",
        ),
        EvaluationCriterion(
            name="Hierarchy Integrity",
            evaluation_instructions="Assess the section hierarchy: verify parent_id references exist, no circular dependencies, proper nesting depth (H2 to H6), and logical parent-child relationships match the content structure.",
        ),
        EvaluationCriterion(
            name="Core Research Focus",
            evaluation_instructions="Verify sections are strictly limited to core research narrative content (Scientific Content, Technical Impact, Research Team). Confirm excluded categories (Front Matter, Career Development, etc.) are not present.",
        ),
        EvaluationCriterion(
            name="Title Conventions",
            evaluation_instructions="Evaluate section titles for clarity, conventional academic terminology, consistency with source materials, and appropriate level of detail for their hierarchy level.",
        ),
        EvaluationCriterion(
            name="Workplan Identification",
            evaluation_instructions="Verify exactly one section is marked as is_detailed_workplan=true, it contains research objectives and specific planned steps, and its placement in the hierarchy is appropriate.",
        ),
        EvaluationCriterion(
            name="Source Alignment",
            evaluation_instructions="Evaluate how well the extracted sections align with the provided source materials (CFP content and organization guidelines). Check for missed required sections or incorrectly added optional ones.",
        ),
        EvaluationCriterion(
            name="Organization Guidelines Compliance",
            evaluation_instructions="When organization guidelines are provided, verify sections strictly follow organization-specific requirements for structure, naming, and hierarchy.",
        ),
        EvaluationCriterion(
            name="Contextual Completeness",
            evaluation_instructions="Evaluate if the extracted structure represents a complete grant application format given the context, with no missing critical sections that would be expected for the grant type.",
        ),
    ]

    if organization:
        criteria.append(
            EvaluationCriterion(
                name="Organization Guidelines Fit",
                evaluation_instructions="Evaluate if the result derives from the organization guidelines correctly.",
            )
        )

    result = await with_prompt_evaluation(
        prompt_identifier="extract_sections",
        prompt_handler=extract_sections,
        prompt=prompt.to_string(organization_guidelines=organization_guidelines),
        criteria=criteria,
        increment=5,
        retries=5,
    )

    return ExtractedSections(
        error=result.get("error"),
        sections=await filter_extracted_sections(result["sections"]),
    )
