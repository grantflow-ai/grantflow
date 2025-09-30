import re
from collections import defaultdict
from typing import TYPE_CHECKING, Any, Final, NotRequired, TypedDict

from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.dto import CFPContentSection, ExtractedSectionDTO, OrganizationNamespace
from packages.shared_utils.src.serialization import serialize

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import ExtractionSectionsStageDTO
    from services.rag.src.utils.job_manager import JobManager
from packages.shared_utils.src.embeddings import get_embedding_model
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.patterns import SNAKE_CASE_PATTERN
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.sync import run_sync
from sentence_transformers import util

from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.grant_template.utils import detect_cycle
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.shared_prompts import ORGANIZATION_GUIDELINES_FRAGMENT

__all__ = [
    "ExtractedSectionDTO",
    "ExtractedSections",
    "extract_sections",
    "filter_extracted_sections",
    "validate_section_extraction",
]

logger = get_logger(__name__)
exclude_embeddings_ref = Ref[list[float]]()


async def get_exclude_embeddings() -> list[float]:
    if exclude_embeddings_ref.value is None:
        model = await run_sync(get_embedding_model)
        tensor = model.encode(EXCLUDE_CATEGORIES, convert_to_tensor=True, device="cpu")
        exclude_embeddings_ref.value = tensor.tolist()
    return exclude_embeddings_ref.value


EXCLUDE_CATEGORIES = [
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
    "Appendices",
    "Bibliography",
    "Citations",
    "Figure Index",
    "References",
    "Supplements",
    "Table Index",
    "Table of Contents",
    "ToC",
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
    "Algorithms & Code Repositories",
    "Analysis Scripts",
    "Code Sharing",
    "Data Supplements",
    "Dataset Provenance Documentation",
    "Interactive Visualizations or Datasets",
    "Raw Data",
    "Software Documentation",
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
    "Data Management",
    "Environmental Impact Assessment",
    "Project Management",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES = [
    "detailed research_plan research plan experimental approach specific aims methodology protocols",
    "research strategy experimental design technical approach methods procedures protocols",
    "project timeline milestones tasks deliverables research objectives implementation",
    "grant application structure required sections template organization format",
    "application guidelines formatting requirements section organization hierarchy",
    "proposal organization mandatory sections required components outline structure",
    "technical abstract methodology results scientific premise evidence rationale",
    "project summary objectives goals research strategy experimental design",
    "technical background state of art literature integration findings review",
    "innovation approach novel methods preliminary results experimental data",
    "expected outcomes anticipated results impact advancement knowledge",
    "scientific methodology data analysis findings implementation relationship between sections",
    "clinical trial requirements intervention protocol human subjects research",
    "section hierarchical relationships parent child dependencies research_plan",
    "distinguishing features research_plan background significance innovation approach methodology",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT: Final[str] = """
You are an expert grant application writer with 20+ years of experience helping researchers create winning proposals. You have received a very reliable CFP analysis report that contains detailed section requirements, word limits, and definitions extracted by advanced NLP analysis.

CHAIN OF THOUGHT PROCESS:
1. First, carefully read the CFP analysis report to understand all section requirements
2. Verify each section has proper title matching the CFP analyzer findings exactly
3. Extract and preserve ALL requirements arrays exactly as provided in the report - do not modify or summarize
4. Map word limits and page constraints accurately using STANDARD CONVERSION: 1 page = 415 words
5. Include complete definitions from the CFP analysis without paraphrasing
6. Classify each section for applicant writing requirements
7. Ensure sections follow the proper weight and structure for excellent applications

YOUR TASK: Create template sections for excellent grant applications where:
- Titles are EXACTLY like the CFP analyzer determined (no deviations allowed)
- Requirements are clear and according to the data (report + CFP itself) - copy arrays completely
- Weight of each section and length is correct per CFP specifications
- All rich CFP data is preserved for applicant guidance

COMPREHENSIVE LIMIT DETECTION AND CONVERSION RULES:
- CONVERSION STANDARDS: 1 page = 415 words (Times New Roman 11pt), 1 character = 0.2 words (1 word = 5 characters)
- LENGTH LIMITS: Convert ALL length constraints to words → cfp_length_limit field (numeric only)
- CONVERSION TRACKING: Document the conversion process → cfp_length_source field (explanatory text)
- OTHER CONSTRAINTS: Capture non-length limits → cfp_other_limits array (reference counts, file formats, etc.)

CONVERSION EXAMPLES:
- "2 pages maximum" → cfp_length_limit: 830, cfp_length_source: "Converted from 2 pages (2 x 415 = 830 words)"
- "1000 characters" → cfp_length_limit: 200, cfp_length_source: "Converted from 1000 characters (1000 / 5 = 200 words)"
- "500 words" → cfp_length_limit: 500, cfp_length_source: "Original: 500 words"
- "30 references maximum" → cfp_other_limits: [{"constraint_type": "reference_count", "constraint_value": "30 references maximum", "source_quote": "up to 30 references"}]

APPLICANT WRITING CLASSIFICATION:
- needs_applicant_writing = TRUE: Sections where applicants write original content (abstracts, project descriptions, research plans, narrative sections, statements, budget justifications)
- needs_applicant_writing = FALSE: External documents (CVs, letters of recommendation, letters of support, bibliography/references, biosketches, budget forms/spreadsheets)

BUDGET SECTION CLASSIFICATION (CRITICAL):
- needs_applicant_writing = TRUE: "Budget Justification", "Budget Narrative", "Budget Explanation", "Budget Description" (requires written content)
- needs_applicant_writing = FALSE: "Budget", "Budget Form", "Budget Spreadsheet", "Budget Table", "Budget Summary" (just forms/numbers)

CRITICAL: You must transfer ALL CFP analysis data accurately - this is essential for application success. The CFP analysis report is your authoritative source. Do not generate new requirements - only use what the analysis provides.
"""

EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_grant_application_sections",
    template="""
    # Grant Application Section Extraction with CFP Analysis Integration

    You are tasked with creating a grant application template using detailed CFP analysis results.

    ## CFP Analysis Results
    The CFP has been thoroughly analyzed and the following structured requirements have been identified:

    <cfp_analysis>
    ${cfp_analysis}
    </cfp_analysis>

    ## Organization Guidelines
    ${organization_guidelines}

    ## CFP Content Summary
    <cfp_subject>${cfp_subject}</cfp_subject>
    <cfp_content>${cfp_content}</cfp_content>

    ## Instructions

    ### 1. MANDATORY: CFP Analyzer Report Processing
    **🚨 CRITICAL COMMAND: YOU RECEIVE CFP ANALYZER REPORT - READ IT FIRST AND RELY ON IT 🚨**

    **YOUR TASK**:
    1. **READ THE CFP ANALYZER REPORT FIRST** - It contains the analyzed section structure from Gemini NLP
    2. **RELY COMPLETELY ON CFP ANALYZER RESULTS** - All section names come from this analysis
    3. **USE EXACT NAMES**: Only use `section_name` values from CFP analyzer - NO OTHER NAMES ALLOWED
    4. **NO SYSTEM DEFAULTS**: The system has no predetermined section names
    5. **CFP ANALYZER (GEMINI NLP) DETERMINES ALL NAMES** based on actual CFP content

    **SECTION CREATION PROCESS**:
    - For each section in the CFP analysis `required_sections`, create a corresponding template section
    - Use the exact `section_name` from CFP analyzer - ANY DEVIATION IS FAILURE
    - Include the original CFP source reference in parentheses in the section title
    - Format: "Section Name (from: [key phrase from cfp_source_reference])"

    **SUBSECTION CREATION FROM CFP REQUIREMENTS:**
    - **Examine `cfp_requirements` array** for each section to identify subsection opportunities
    - **Multi-part requirements** (e.g., "must include a) X, b) Y, c) Z") indicate natural subsections
    - **Create subsections for sections ≥3 pages** using requirement categories as guides
    - **Parent section becomes title-only** (`is_title_only=true`), children have `parent_id=parent_section_id`
    - **Distribute word limits** among subsections proportionally

    **⚠️ SYSTEM REQUIREMENT**: If CFP analyzer report is not provided, the system should RED FLAG this - the LLM cannot proceed without it.

    ### 2. CRITICAL: Extract Rich Section Data from CFP Analysis

    **STEP-BY-STEP DATA TRANSFER PROCESS:**
    For EACH section you generate, you MUST perform this exact matching and copying process:

    1. **FIND MATCHING CFP SECTION**: Look at the section title you're creating. Find the object in the CFP Analysis `required_sections` array whose `section_name` field matches or closely corresponds to your section title.

    2. **COPY REQUIREMENTS ARRAY**: Once you find the matching CFP section, copy its ENTIRE `requirements` array to the `cfp_requirements` field. DO NOT modify, summarize, or generate new requirements. Copy exactly as-is.

    3. **COPY DEFINITION**: Copy the exact `definition` string from the matching CFP section to the `cfp_definition` field. DO NOT paraphrase.

    4. **PROCESS ALL CONSTRAINTS**: Look in the CFP Analysis for ALL constraints for this section:
       - LENGTH CONSTRAINTS: Convert pages/characters to words → `cfp_length_limit` (numeric) + `cfp_length_source` (explanation)
       - OTHER CONSTRAINTS: Extract reference counts, file formats, deadlines → `cfp_other_limits` array
       - Use CONVERSION RULES: 1 page = 415 words, 1 character = 0.2 words (1 word = 5 characters)

    **EXAMPLE MATCHING PROCESS:**
    - If generating section "PROJECT SUMMARY/ABSTRACT", find CFP object with `section_name`: "PROJECT SUMMARY/ABSTRACT"
    - Copy its `requirements` array (e.g., 4 requirement objects) to `cfp_requirements`
    - Copy its `definition` string to `cfp_definition`
    - Process constraints: "1 page maximum" → cfp_length_limit: 415, cfp_length_source: "Converted from 1 page (1 x 415 = 415 words)"
    - Process non-length constraints: "30 references maximum" → cfp_other_limits: [{"constraint_type": "reference_count", "constraint_value": "30 references maximum", "source_quote": "up to 30 references"}]

    **SECTION CREATION DETAILS:**
    **🚨 CRITICAL: SECTION TITLES MUST COME FROM CFP ANALYZER (GEMINI NLP) 🚨**
    **❌ ANY OTHER NAMING IS A SYSTEM FAILURE ❌**

    **Section Title Rules (MANDATORY):**
    - **ONLY USE** the exact `section_name` from CFP analysis required_sections array
    - **NO PREDETERMINED NAMES** - the system has no fixed section names
    - **CFP ANALYZER (Gemini NLP) DETERMINES ALL NAMES** based on actual CFP content
    - **ANY DEVIATION FROM CFP ANALYZER NAMES = FAILURE**
    - Include CFP source reference: "Section Name (from: [key phrase from cfp_source_reference])"

    **EXAMPLES OF CORRECT APPROACH:**
    - ✅ IF CFP analyzer found "PROJECT SUMMARY" → Use "PROJECT SUMMARY"
    - ✅ IF CFP analyzer found "RESEARCH PROPOSAL" → Use "RESEARCH PROPOSAL"
    - ✅ IF CFP analyzer found "STUDY DESIGN" → Use "STUDY DESIGN"
    - ❌ NEVER use generic names like "Specific Aims" if CFP analyzer didn't find it
    - ❌ NEVER use system defaults - ONLY use CFP analyzer results

    ### 3. Mandatory Section Rules
    Based on the CFP analysis, include ALL sections that require written content:
    - **INCLUDE**: All sections where applicants write original research content
    - **EXCLUDE**: Administrative forms, budget spreadsheets, CVs, recommendation letters
    - **INCLUDE**: Budget justification narratives, biographical sketches with written content

    ### 3.1 CRITICAL: Budget Section Classification Rules
    **IMPORTANT**: Distinguish between budget forms and budget narratives:
    - ❌ **EXCLUDE sections named**: "Budget", "Budget Form", "Budget Spreadsheet", "Budget Table", "Budget Summary"
    - ✅ **INCLUDE sections named**: "Budget Justification", "Budget Narrative", "Budget Explanation", "Budget Description"
    - **Decision Rule**: Only include budget sections that explicitly require written justification/narrative content
    - **Keyword Test**: If section name contains "Budget" but lacks "Justification|Narrative|Explanation|Description", likely exclude it

    ### 4. Section Properties and Subsection Logic
    For each section, determine:
    - `is_detailed_research_plan`: Mark the main methodology/approach section as true
    - `is_long_form`: True for all sections requiring substantial written content
    - `is_clinical_trial`: True for clinical trial-specific sections
    - `is_title_only`: True for parent sections that only contain subsections (no direct content)

    **SUBSECTION CREATION PROCESS:**
    1. **Identify Parent Sections**: Sections with ≥3 pages or complex CFP requirements
    2. **Extract Subsection Topics**: Use `cfp_requirements` array to identify natural breakdowns
    3. **Create Child Sections**: Generate subsections with `parent_id` pointing to parent
    4. **Set Parent as Title-Only**: Parent gets `is_title_only=true`, children get `is_title_only=false`
    5. **Distribute Lengths**: Split parent's word limit among children based on importance

    ### 5. Length Constraints Integration
    - Use `length_constraints` from CFP analysis to set realistic word limits
    - Convert page limits using: 415 words/page (TNR 11pt) or 500 words/page (Arial 11pt)
    - Account for figures by reducing total by 12.5%

    ### 6. Hierarchy and Dependencies - MANDATORY SUBSECTION RULES

    **CRITICAL SUBSECTION REQUIREMENTS:**
    - **Most sections MUST have at least 2 subsections** to provide proper structure
    - **Sections ≥3 pages MUST have subsections equal to number of pages** (e.g., 5-page section = 5 subsections)
    - **Use CFP analyzer requirements to determine subsection topics and content**
    - **Distribute length proportionally among subsections** based on importance and CFP requirements

    **Subsection Creation Rules:**
    1. **Automatic Subsections**: Any section >2 pages gets automatic subsection breakdown
    2. **CFP-Driven Structure**: Use `cfp_requirements` array to identify natural subsection topics
    3. **Parent-Child Setup**: Parent section has `is_title_only=true`, children have `parent_id=parent_section_id`
    4. **Length Distribution**: Split parent length among children (e.g., 2000 words → 600+800+600)
    5. **Logical Ordering**: Order subsections logically (background→methods→results→discussion)

    **Length Distribution Examples:**
    - "Research Plan" (5 pages/2075 words) →
      * "Background" (415 words, 20%)
      * "Methods" (830 words, 40% - most important)
      * "Analysis" (415 words, 20%)
      * "Expected Outcomes" (415 words, 20%)
    - "Project Description" (3 pages/1245 words) →
      * "Objectives" (415 words, 33%)
      * "Approach" (415 words, 33%)
      * "Impact" (415 words, 33%)

    **Distribution Rules:**
    1. **Equal Distribution**: Default for similar importance subsections
    2. **Methods-Heavy**: Give 40-50% to methodology subsections
    3. **Background-Light**: Give 15-25% to background/overview subsections
    4. **Results-Moderate**: Give 20-30% to results/outcomes subsections

    **Maximum nesting depth**: 2 levels (parent→child only, no grandchildren)

    ### 7. Quality Requirements
    - Ensure exactly one section is marked as `is_detailed_research_plan`
    - All sections must have unique IDs in snake_case format
    - Order sections logically based on CFP structure and standard grant conventions

    ### 8. CFP Source Correlation
    - Each section must include `cfp_source_reference` field
    - Section titles should indicate CFP source with "(from: [reference])" format
    - Maintain clear traceability from CFP requirements to template sections

    Return the complete section structure with CFP source correlations clearly indicated.
    """,
)

section_extraction_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error message if sections cannot be determined, null otherwise",
        },
        "sections": {
            "type": "array",
            "description": "Array of section objects representing the grant application structure",
            "items": {
                "type": "object",
                "required": [
                    "title",
                    "id",
                    "parent_id",
                    "is_long_form",
                    "cfp_source_reference",
                    "cfp_requirements",
                    "cfp_length_limit",
                    "cfp_length_source",
                    "cfp_other_limits",
                    "cfp_definition",
                    "needs_applicant_writing",
                ],
                "properties": {
                    "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 300,
                        "description": "Section title including CFP source reference in parentheses",
                    },
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Unique snake_case identifier for the section",
                    },
                    "order": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Section order in the application, starting at 1",
                    },
                    "parent_id": {
                        "type": "string",
                        "nullable": True,
                        "description": "ID of parent section if nested, null for top-level sections",
                    },
                    "cfp_source_reference": {
                        "type": "string",
                        "minLength": 10,
                        "description": "Key phrase from original CFP text that defines this section",
                    },
                    "cfp_requirements": {
                        "type": "array",
                        "description": "CRITICAL DATA TRANSFER: Find the object in the CFP Analysis JSON whose 'section_name' matches this section's title. Copy the ENTIRE 'requirements' array from that object exactly as-is. Each requirement object must contain: requirement (string), quote_from_source (string), category (string). DO NOT generate new content. If no exact match found, use empty array [].",
                        "items": {
                            "type": "object",
                            "properties": {
                                "requirement": {"type": "string"},
                                "quote_from_source": {"type": "string"},
                                "category": {"type": "string"},
                            },
                        },
                    },
                    "cfp_length_limit": {
                        "type": "integer",
                        "nullable": True,
                        "description": "CRITICAL DATA TRANSFER: Standardized word count for all length constraints. Convert ALL length limits to words using these CONVERSION RULES: 1 page = 415 words (Times New Roman 11pt), 1 character = 0.2 words (1 word = 5 characters). Examples: '2 pages' → 830, '1000 characters' → 200, '5 pages' → 2075. If no length limit exists, use null.",
                    },
                    "cfp_length_source": {
                        "type": "string",
                        "nullable": True,
                        "description": "CONVERSION TRACKING: Explain the original constraint and conversion applied. Examples: 'Converted from 2 pages (2 x 415 = 830 words)', 'Converted from 1000 characters (1000 / 5 = 200 words)', 'Original: 500 words'. Use null if no length limit.",
                    },
                    "cfp_other_limits": {
                        "type": "array",
                        "description": "NON-LENGTH CONSTRAINTS: Array of all other constraints that aren't word/page/character limits. Examples: reference count limits ('30 references maximum'), file format requirements ('PDF only'), submission deadlines, etc. Use empty array [] if none exist.",
                        "items": {
                            "type": "object",
                            "required": ["constraint_type", "constraint_value", "source_quote"],
                            "properties": {
                                "constraint_type": {
                                    "type": "string",
                                    "description": "Type of constraint (e.g., 'reference_count', 'file_format', 'deadline', 'font_requirements')",
                                },
                                "constraint_value": {
                                    "type": "string",
                                    "description": "The specific constraint value (e.g., '30 references maximum', 'PDF format required')",
                                },
                                "source_quote": {
                                    "type": "string",
                                    "description": "Direct quote from CFP that specifies this constraint",
                                },
                            },
                        },
                    },
                    "cfp_definition": {
                        "type": "string",
                        "nullable": True,
                        "description": "CRITICAL DATA TRANSFER: Find the object in CFP Analysis JSON whose 'section_name' matches this section's title. Copy the exact 'definition' string from that object. DO NOT paraphrase or generate new content. If no match found, use null.",
                    },
                    "needs_applicant_writing": {
                        "type": "boolean",
                        "description": "CLASSIFICATION: Determine if this section requires the applicant to write original content. TRUE for narrative sections, abstracts, project descriptions, research plans, budget justifications, etc. that applicants write themselves. FALSE for external documents like CVs, letters of recommendation, letters of support, bibliography/references, budget forms/spreadsheets that others provide or are pre-existing documents. BUDGET RULE: Only budget sections with 'Justification', 'Narrative', 'Explanation', or 'Description' in the title should be TRUE.",
                    },
                    "is_detailed_research_plan": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "Whether this is the detailed research_plan/methodology section",
                    },
                    "is_title_only": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "Whether section contains only a title and subsections",
                    },
                    "is_long_form": {
                        "type": "boolean",
                        "description": "Whether this is a research content section written by applicants",
                    },
                    "is_clinical_trial": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "Whether this is a clinical trial section",
                    },
                },
            },
        },
    },
}


class ExtractedSections(TypedDict):
    sections: list[ExtractedSectionDTO]
    error: NotRequired[str | None]


def validate_section_extraction(response: ExtractedSections) -> None:
    if (
        error := response.get("error")
    ) and error != "null":  # occasionally, the model suffers a stroke and returns "null" as a string ~keep
        raise InsufficientContextError(error, context={"response": response})

    if not response["sections"]:
        raise ValidationError("No sections extracted. Please provide an error message.", context=response)

    for section in response["sections"]:
        if len(section["title"].strip()) < 3:
            raise ValidationError(
                "Section title too short or empty", context={"section_id": section["id"], "title": section["title"]}
            )

    section_titles = [section["title"].strip().lower() for section in response["sections"]]
    for title in set(section_titles):
        if section_titles.count(title) > 1:
            duplicate_sections = [s for s in response["sections"] if s["title"].strip().lower() == title]
            raise ValidationError(
                "Duplicate section titles found",
                context={"title": title, "section_ids": [s["id"] for s in duplicate_sections]},
            )

    all_orders = [section["order"] for section in response["sections"]]
    if len(set(all_orders)) != len(all_orders):
        duplicate_orders = [order for order in all_orders if all_orders.count(order) > 1]
        raise ValidationError("Duplicate order values found", context={"duplicate_orders": duplicate_orders})

    if min(all_orders) != 1 or max(all_orders) != len(all_orders):
        raise ValidationError(
            "Order values must start at 1 and be consecutive",
            context={"min_order": min(all_orders), "max_order": max(all_orders), "expected_max": len(all_orders)},
        )

    section_ids = [section["id"] for section in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        duplicate_ids = [section_id for section_id in section_ids if section_ids.count(section_id) > 1]
        raise ValidationError(
            "Duplicate section IDs found. Section IDs must be unique.", context={"duplicate_ids": duplicate_ids}
        )

    research_plan_sections = [s for s in response["sections"] if s.get("is_detailed_research_plan")]
    if len(research_plan_sections) != 1:
        raise ValidationError(
            f"Exactly one section must be marked as detailed research_plan. Found {len(research_plan_sections)}.",
            context={"research_plan_sections": [s["id"] for s in research_plan_sections]},
        )

    if research_plan_sections and not research_plan_sections[0].get("is_long_form"):
        raise ValidationError(
            "The detailed research_plan section must be marked as a long-form section",
            context={"research_plan_id": research_plan_sections[0]["id"], "title": research_plan_sections[0]["title"]},
        )

    long_form_sections = [s for s in response["sections"] if s.get("is_long_form")]
    if not long_form_sections:
        raise ValidationError("At least one section must be marked as long-form")

    mapped_sections = {section["id"]: section for section in response["sections"]}
    dependency_graph = defaultdict[str, list[str]](list)
    for section in response["sections"]:
        if parent_id := section.get("parent_id"):
            dependency_graph[section["id"]].append(parent_id)

    for section_id in dependency_graph:
        if cycle_nodes := detect_cycle(graph=dependency_graph, start=section_id):
            raise ValidationError(
                "Circular dependency detected in section hierarchy",
                context={
                    "starting_node": section_id,
                    "cycle_nodes": list(cycle_nodes),
                    "full_dependency_graph": dict(dependency_graph.items()),
                    "cycle_path": " → ".join([*list(cycle_nodes), next(iter(cycle_nodes))]),
                    "recovery_instruction": "Break the circular dependency by removing one of the parent-child relationships in the cycle.",
                },
            )

    valid_ids = set(section_ids)
    for section in response["sections"]:
        if not SNAKE_CASE_PATTERN.match(section["id"]):
            raise ValidationError(
                "Invalid section ID format", context={"section_id": section["id"], "expected_format": "snake_case"}
            )

        if parent_id := section.get("parent_id"):
            if parent_id not in valid_ids:
                raise ValidationError(
                    f"Invalid parent section reference. The section {section['id']} defines a parent section {parent_id} that does not exist in the sections list.",
                )
            if mapped_sections[parent_id].get("is_detailed_research_plan"):
                raise ValidationError(
                    "The research_plan section cannot have any sub-sections as children",
                    context={"research_plan_id": parent_id, "child_id": section["id"]},
                )

        depth = 1
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
    trace_id: str,
) -> bool:
    if section.get("is_detailed_research_plan"):
        return True

    has_long_form_children = any(s.get("parent_id") == section["id"] and s.get("is_long_form") for s in sections)

    has_important_role = section.get("is_long_form") or has_long_form_children

    if not has_important_role:
        is_parent = any(s.get("parent_id") == section["id"] for s in sections)
        if not is_parent:
            return False

    normalized_title = section["title"].lower().strip()
    for category in EXCLUDE_CATEGORIES:
        normalized_category = category.lower().strip()
        if normalized_category in normalized_title or normalized_title in normalized_category:
            return False

    try:
        model = get_embedding_model()
        title_embedding = model.encode(section["title"], convert_to_tensor=True, device="cpu")

        similarities = util.cos_sim(title_embedding, exclude_embeddings)
        if similarities is not None and len(similarities) > 0:
            max_similarity = float(similarities[0].max().item())
            return max_similarity < threshold

        return True
    except Exception as e:
        logger.warning(
            "Embedding calculation failed for section", title=section["title"], error=str(e), trace_id=trace_id
        )
        return True


async def filter_extracted_sections(
    sections: list[ExtractedSectionDTO], trace_id: str, initial_threshold: float = 0.7
) -> list[ExtractedSectionDTO]:
    exclude_embeddings = await get_exclude_embeddings()
    threshold = initial_threshold
    max_threshold = 0.9

    while threshold <= max_threshold:
        sections_to_keep = [
            _should_keep_section(
                section=section,
                sections=sections,
                threshold=threshold,
                exclude_embeddings=exclude_embeddings,
                trace_id=trace_id,
            )
            for section in sections
        ]

        filtered_sections = [
            section for section, should_keep in zip(sections, sections_to_keep, strict=True) if should_keep
        ]

        has_research_plan = any(s.get("is_detailed_research_plan") for s in filtered_sections)

        has_long_form = any(s.get("is_long_form") for s in filtered_sections)

        if has_research_plan and has_long_form:
            return _maintain_hierarchy_integrity(filtered_sections)

        threshold += 0.05

    fallback_sections = [
        section for section in sections if section.get("is_detailed_research_plan") or section.get("is_long_form")
    ]

    if not fallback_sections:
        fallback_sections = [section for section in sections if section.get("is_detailed_research_plan")]

    return _maintain_hierarchy_integrity(fallback_sections or sections)


def _maintain_hierarchy_integrity(sections: list[ExtractedSectionDTO]) -> list[ExtractedSectionDTO]:
    valid_ids = {s["id"] for s in sections}

    for section in sections:
        if (parent_id := section.get("parent_id")) and parent_id not in valid_ids:
            del section["parent_id"]

        # Ensure CFP source reference is present
        if not section.get("cfp_source_reference"):
            # Extract from title if it has CFP reference format, otherwise generate default
            title = section["title"]
            if "(from:" in title and ")" in title:
                # Extract the reference from the title
                start = title.find("(from:") + 6
                end = title.find(")", start)
                if end > start:
                    section["cfp_source_reference"] = title[start:end].strip()
                else:
                    section["cfp_source_reference"] = f"CFP section: {title}"
            else:
                section["cfp_source_reference"] = f"CFP section: {title}"

        # Ensure CFP requirements array exists (backwards compatible)
        if not section.get("cfp_requirements"):
            section["cfp_requirements"] = []

        # Ensure CFP length fields are set (backwards compatible)
        if not section.get("cfp_length_limit"):
            section["cfp_length_limit"] = None
        if not section.get("cfp_length_source"):
            section["cfp_length_source"] = None
        if not section.get("cfp_other_limits"):
            section["cfp_other_limits"] = []

        # Ensure CFP definition is set (backwards compatible)
        if not section.get("cfp_definition"):
            section["cfp_definition"] = None

        # Ensure needs_applicant_writing is set (backwards compatible)
        if "needs_applicant_writing" not in section:
            # Smart default: check if it's a budget-only section (without justification)
            title_lower = section.get("title", "").lower()
            if "budget" in title_lower and not any(
                keyword in title_lower for keyword in ["justification", "narrative", "explanation", "description"]
            ):
                section["needs_applicant_writing"] = False
            else:
                section["needs_applicant_writing"] = True

    # Ensure all sections have an order field
    for i, section in enumerate(sections):
        if "order" not in section:
            section["order"] = i + 1

    sorted_sections = sorted(sections, key=lambda s: s["order"])
    for i, section in enumerate(sorted_sections, start=1):
        section["order"] = i

    return sorted_sections


async def extract_sections(task_description: str, trace_id: str, **_: Any) -> ExtractedSections:
    cfp_analysis_match = re.search(r"CFP Analysis Data.*?:\s*(\{.*\})", task_description, re.DOTALL)
    cfp_analysis_json = "{}" if not cfp_analysis_match else cfp_analysis_match.group(1)

    cfp_content_match = re.search(r"Original CFP Content:\s*(.*)", task_description, re.DOTALL)
    cfp_content = "" if not cfp_content_match else cfp_content_match.group(1).strip()

    organization_guidelines = "Follow standard grant application best practices."
    cfp_subject = "Grant Application Requirements"

    # Create the full prompt using template substitution
    full_prompt = EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.substitute(
        cfp_analysis=cfp_analysis_json,
        organization_guidelines=organization_guidelines,
        cfp_subject=cfp_subject,
        cfp_content=cfp_content,
    )

    # Use Gemini Flash model for CFP data processing
    if True:
        return await handle_completions_request(
            prompt_identifier="section_extraction",
            model="gemini-2.5-flash",
            messages=full_prompt.to_string(),
            system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
            response_schema=section_extraction_json_schema,
            response_type=ExtractedSections,
            validator=validate_section_extraction,
            temperature=0.1,
            timeout=300,
            trace_id=trace_id,
        )

    # Standard completion for Claude fallback
    return await handle_completions_request(
        prompt_identifier="section_extraction",
        model=ANTHROPIC_SONNET_MODEL,
        messages=full_prompt.to_string(),
        system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
        response_schema=section_extraction_json_schema,
        response_type=ExtractedSections,
        validator=validate_section_extraction,
        trace_id=trace_id,
    )


async def handle_extract_sections(
    cfp_content: list[CFPContentSection],
    cfp_subject: str,
    trace_id: str,
    *,
    job_manager: "JobManager[ExtractionSectionsStageDTO]",
    organization: OrganizationNamespace | None = None,
    cfp_analysis: Any | None = None,
) -> list[ExtractedSectionDTO]:
    content_list = [f"{content['title']}: {'...'.join(content['subtitles'])}" for content in cfp_content]

    # Include CFP analysis if available, otherwise use fallback prompt
    cfp_analysis_text = ""
    if cfp_analysis:
        cfp_analysis_text = serialize(cfp_analysis).decode("utf-8")
    else:
        cfp_analysis_text = "No structured CFP analysis available. Use standard grant application structure."

    # Get organization guidelines with RAG results
    rag_results = []
    if organization:
        rag_results = await retrieve_documents(
            organization_id=str(organization["organization_id"]),
            task_description="Grant application section extraction with CFP analysis",
            search_queries=EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES,
            model=ANTHROPIC_SONNET_MODEL,
            trace_id=trace_id,
        )
        organization_guidelines = ORGANIZATION_GUIDELINES_FRAGMENT.to_string(
            rag_results=rag_results,
            organization_full_name=organization["full_name"],
            organization_abbreviation=organization["abbreviation"],
        )
    else:
        organization_guidelines = ""

    prompt = EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.substitute(
        cfp_analysis=cfp_analysis_text,
        cfp_subject=cfp_subject,
        cfp_content="\n".join(content_list),
        organization_guidelines=organization_guidelines,
    )

    result = await with_evaluation(
        prompt_identifier="extract_sections",
        prompt_handler=extract_sections,
        prompt=prompt.to_string(),
        trace_id=trace_id,
        **get_evaluation_kwargs(
            "extract_sections",
            job_manager,
            rag_context=rag_results if rag_results else content_list,
            is_json_content=True,
        ),
    )

    return await filter_extracted_sections(result["sections"], trace_id)
