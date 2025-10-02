from collections import defaultdict
from functools import partial
from typing import TYPE_CHECKING, Final, NotRequired, TypedDict

from packages.db.src.json_objects import CFPAnalysisResult
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

    ### 1. MANDATORY: Understanding CFP Titles and Section Breakdown
    **🚨 CRITICAL: TITLES ARE SUBMISSION PARTS THAT MUST BE BROKEN INTO SECTIONS 🚨**

    **WHAT YOU RECEIVE**:
    - The CFP Analyzer Report contains **TITLES** from the CFP document
    - Each **TITLE** represents a **part of the grant application submission** (e.g., "Research Plan", "Project Summary")
    - These titles are the **major components** that must appear in the submitted application

    **YOUR TASK - BREAK TITLES INTO SECTIONS**:
    1. **READ THE CFP ANALYZER REPORT FIRST** - It contains titles extracted from the CFP
    2. **UNDERSTAND**: Each `title` is a **submission part** that applicants must write
    3. **BREAK DOWN LARGE TITLES**: Titles with >1 page (>450 words) usually need to be broken into multiple sections
    4. **CREATE SECTION STRUCTURE**: Convert titles into a structured section hierarchy

    **CRITICAL RULE - TITLE BREAKDOWN**:
    - **Small titles** (≤1 page / ≤450 words): Create ONE section with the title as-is
    - **Large titles** (>1 page / >450 words): Break into MULTIPLE sections:
      - Create a **parent section** with `is_title_only=true` using the CFP title
      - Create **child sections** (subsections) with `parent_id` pointing to parent
      - **TOTAL word limit of all child sections = parent's word limit** (from CFP)

    **EXAMPLE - SMALL TITLE (≤450 words)**:
    ```
    CFP Title: "Project Summary" (300 words)
    → Create: 1 section
      - id: "project_summary"
      - title: "Project Summary"
      - length_limit: 300
      - parent_id: null
    ```

    **EXAMPLE - LARGE TITLE (>450 words) - HOW REQUIREMENTS BECOME SECTIONS**:
    ```
    CFP Title: "Research Plan" (2000 words)
    CFP Requirements array:
    [
      "Provide background on the research problem and its significance",
      "Describe the proposed research methods and approach",
      "Explain how data will be analyzed",
      "Detail expected outcomes and potential impact"
    ]

    → Analyze each requirement → Create sections:

    Parent (title-only, just a container):
      - id: "research_plan"
      - title: "Research Plan"  ← Exact CFP title
      - is_title_only: true
      - parent_id: null
      - length_limit: 2000 words (total from CFP)

    Children (actual writing sections, derived FROM requirements):
      - id: "research_plan_background"
        title: "Background and Significance"  ← From requirement #1
        length_limit: 400 words (20%)
        parent_id: "research_plan"

      - id: "research_plan_methods"
        title: "Research Methods"  ← From requirement #2
        length_limit: 800 words (40%)
        parent_id: "research_plan"

      - id: "research_plan_analysis"
        title: "Data Analysis"  ← From requirement #3
        length_limit: 400 words (20%)
        parent_id: "research_plan"

      - id: "research_plan_outcomes"
        title: "Expected Outcomes"  ← From requirement #4
        length_limit: 400 words (20%)
        parent_id: "research_plan"

      Total: 400+800+400+400 = 2000 ✅ (matches parent limit)

    Each child section title is derived by analyzing what that requirement is asking for.
    ```

    **HOW TO IDENTIFY SECTIONS FROM TITLE REQUIREMENTS**:

    **🚨 CRITICAL: Sections come from analyzing the title's requirements 🚨**

    Each large title has a `cfp_requirements` array that describes what must be included.
    Each requirement in this array represents a **writing part** that could become a section.

    **STEP-BY-STEP PROCESS**:
    1. **Read the title's `cfp_requirements` array** - Each requirement describes content that must be written
    2. **Identify natural groupings** - Requirements that belong together become one section
    3. **Look for explicit parts** - "must include: a) Introduction, b) Current State, c) Methods"
    4. **Each part becomes a section** if it's substantial enough (typically >100 words)

    **EXAMPLE - Title Requirements → Sections**:
    ```
    CFP Title: "Proposal Narrative" (2000 words)
    Requirements array:
    [
      "Provide an introduction to the problem",
      "Describe the current state of research in this area",
      "Explain your proposed approach and methodology",
      "Detail expected outcomes and impact"
    ]

    → Analyze requirements → Create 4 sections:
      1. "Introduction" (~400 words) - from requirement #1
      2. "Current State of Research" (~500 words) - from requirement #2
      3. "Proposed Methodology" (~800 words) - from requirement #3
      4. "Expected Outcomes" (~300 words) - from requirement #4
    ```

    **COMMON REQUIREMENT PATTERNS**:
    - "must include a) X, b) Y, c) Z" → Each letter becomes a section
    - "describe background, then methods, then results" → 3 sections
    - "provide introduction and summary" → 2 sections
    - Single requirement with no parts → 1 section (keep title as-is)

    **REAL-WORLD EXAMPLE - "Proposal Narrative" Title**:
    ```
    CFP Title: "Proposal Narrative" (1800 words)
    Requirements:
    [
      "Must provide an introduction to the problem being addressed",
      "Must describe the current state of the field today",
      "Must explain the proposed solution and methodology"
    ]

    → Each requirement becomes a section:
      1. Parent "Proposal Narrative" (is_title_only=true, container)
      2. Child "Introduction" (~500 words) ← From "introduction to the problem"
      3. Child "Current State of the Field" (~600 words) ← From "current state today"
      4. Child "Proposed Solution" (~700 words) ← From "proposed solution and methodology"

    The section titles are extracted from analyzing what each requirement asks for.
    If a requirement says "provide introduction" → section title is "Introduction"
    If a requirement says "describe current state" → section title is "Current State of the Field"
    ```

    **⚠️ SYSTEM REQUIREMENT**: If CFP analyzer report is not provided, the system should RED FLAG this - the LLM cannot proceed without it.

    ### 2. CRITICAL: Understanding Titles vs Sections

    **KEY CONCEPT**:
    - **CFP TITLE** = A submission part from the CFP (e.g., "Research Plan", "Proposal Narrative")
    - **SECTION** = A writing part you create by analyzing the title's requirements
    - **Sections come FROM the title's requirements** - they represent the specific parts applicants must write

    **FOR SMALL TITLES (≤450 words)**:
    - CFP has 1 title with simple requirements → You create 1 section
    - The section's `title` field = CFP title
    - Example: CFP "Project Summary" (300 words) with requirement "Summarize the project" → 1 section "Project Summary"

    **FOR LARGE TITLES (>450 words)**:
    - CFP has 1 title with multiple requirements → You create MULTIPLE sections (parent + children)
    - **Parent section**: Uses exact CFP title, `is_title_only=true` (just a container)
    - **Child sections**: Named after the requirement parts (Introduction, Current State, Methods, etc.)
    - **Each child section** represents one part from the requirements

    **DETAILED EXAMPLE**:
    ```
    CFP Title: "Proposal Narrative" (2000 words)
    Requirements:
    - "Must include an introduction explaining the problem"
    - "Must describe current state of research"
    - "Must explain proposed methodology"

    → You create:
      1. Parent "Proposal Narrative" (is_title_only=true, no content)
      2. Child "Introduction" (from requirement #1)
      3. Child "Current State of Research" (from requirement #2)
      4. Child "Proposed Methodology" (from requirement #3)

    The child section titles ("Introduction", "Current State of Research", "Proposed Methodology")
    are derived by analyzing what each requirement asks for.
    ```

    ### 3. CRITICAL: Extract Rich Section Data from CFP Analysis

    **STEP-BY-STEP DATA TRANSFER PROCESS:**
    For EACH section you generate, you MUST perform this exact matching and copying process:

    1. **FIND MATCHING CFP TITLE**:
       - **For parent sections**: Match exactly to CFP `title` field
       - **For child sections**: Match to parent's CFP title (inherit parent's CFP data)
       - Find the object in the CFP Analysis `required_sections` array whose `title` field matches

    2. **COPY REQUIREMENTS ARRAY**: Once you find the matching CFP section, copy its ENTIRE `requirements` array to the `cfp_requirements` field. DO NOT modify, summarize, or generate new requirements. Copy exactly as-is.

    3. **COPY DEFINITION**: Copy the exact `definition` string from the matching CFP section to the `cfp_definition` field. DO NOT paraphrase.

    4. **PROCESS ALL CONSTRAINTS**: Look in the CFP Analysis for ALL constraints for this section:
       - LENGTH CONSTRAINTS: Convert pages/characters to words → `cfp_length_limit` (numeric) + `cfp_length_source` (explanation)
       - OTHER CONSTRAINTS: Extract reference counts, file formats, deadlines → `cfp_other_limits` array
       - Use CONVERSION RULES: 1 page = 415 words, 1 character = 0.2 words (1 word = 5 characters)

    **EXAMPLE MATCHING PROCESS:**
    - If generating section "PROJECT SUMMARY/ABSTRACT", find CFP object with `title`: "PROJECT SUMMARY/ABSTRACT"
    - Copy its `requirements` array (e.g., 4 requirement objects) to `cfp_requirements`
    - Copy its `definition` string to `cfp_definition`
    - Process constraints: "1 page maximum" → cfp_length_limit: 415, cfp_length_source: "Converted from 1 page (1 x 415 = 415 words)"
    - Process non-length constraints: "30 references maximum" → cfp_other_limits: [{"constraint_type": "reference_count", "constraint_value": "30 references maximum", "source_quote": "up to 30 references"}]

    **SECTION CREATION DETAILS:**
    **🚨 CRITICAL: SECTION TITLES MUST COME FROM CFP ANALYZER (GEMINI NLP) 🚨**
    **❌ ANY OTHER NAMING IS A SYSTEM FAILURE ❌**

    **Section Title Rules (MANDATORY):**
    - **ONLY USE** the exact `title` from CFP analysis required_sections array
    - **NO PREDETERMINED TITLES** - the system has no fixed section titles
    - **CFP ANALYZER (Gemini NLP) DETERMINES ALL TITLES** based on actual CFP content
    - **ANY DEVIATION FROM CFP ANALYZER TITLES = FAILURE**
    - The `title` field contains the section heading as it will appear in the grant application
    - **TITLE ONLY** - do NOT include source reference in title, it goes in `cfp_source_reference` field

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

    ### 4. Section Properties - What to Set for Each Section

    **For ALL sections** (both parent and child):
    - `is_long_form`: True for sections requiring substantial written content
    - `is_clinical_trial`: True for clinical trial-specific sections
    - `is_detailed_research_plan`: Mark the main methodology/approach section as true

    **For PARENT sections** (title-only):
    - `is_title_only`: **TRUE** (parent has no content, only children do)
    - `parent_id`: null
    - `length_limit`: Total word limit from CFP

    **For CHILD sections** (actual writing):
    - `is_title_only`: **FALSE** (children have actual content)
    - `parent_id`: ID of parent section
    - `length_limit`: Portion of parent's limit (must sum to parent's total)

    **For STANDALONE sections** (small titles, no breakdown):
    - `is_title_only`: **FALSE**
    - `parent_id`: null
    - `length_limit`: Word limit from CFP

    ### 5. Length Constraints Integration
    - Use `length_constraints` from CFP analysis to set realistic word limits
    - Convert page limits using: 415 words/page (TNR 11pt) or 500 words/page (Arial 11pt)
    - Account for figures by reducing total by 12.5%

    ### 6. Hierarchy and Dependencies - MANDATORY TITLE BREAKDOWN RULES

    **🚨 CRITICAL: WHEN TO BREAK TITLES INTO SECTIONS 🚨**

    **DECISION RULE**:
    - **Title ≤1 page (≤450 words)**: Create 1 section, NO breakdown needed
    - **Title >1 page (>450 words)**: Create parent + multiple child sections

    **BREAKDOWN REQUIREMENTS FOR LARGE TITLES**:
    - **2 pages (830 words)**: Parent + 2-3 child sections
    - **3 pages (1245 words)**: Parent + 3-4 child sections
    - **4 pages (1660 words)**: Parent + 4 child sections
    - **5+ pages (2075+ words)**: Parent + 4-5 child sections

    **PARENT-CHILD STRUCTURE**:
    1. **Parent Section** (title-only, no content):
       - `title`: Use exact CFP title (e.g., "Research Plan")
       - `is_title_only`: true
       - `parent_id`: null
       - `length_limit`: Total word limit from CFP

    2. **Child Sections** (actual writing sections):
       - `title`: Descriptive subsection name (e.g., "Background", "Methods")
       - `is_title_only`: false
       - `parent_id`: ID of parent section
       - `length_limit`: Portion of parent's limit
       - **SUM of all children limits = parent's total limit**

    **LENGTH DISTRIBUTION RULES**:
    - **Methods/Approach sections**: 40-50% of total words (most important)
    - **Background/Context sections**: 15-25% of total words
    - **Results/Outcomes sections**: 20-30% of total words
    - **Equal distribution**: When sections have similar importance

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

    ### 8. CFP Source Evidence
    - Each section must include `evidence` field with the key phrase/quote from CFP that defines this section
    - Section titles should be CLEAN - no source reference in title
    - The `evidence` field provides traceability from CFP to template sections

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
                    "evidence",
                    "requirements",
                    "length_limit",
                    "length_source",
                    "other_limits",
                    "definition",
                    "needs_applicant_writing",
                ],
                "properties": {
                    "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 300,
                        "description": "Clean section title from CFP analyzer (do NOT include source reference)",
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
                    "evidence": {
                        "type": "string",
                        "minLength": 10,
                        "description": "Direct quote or key phrase from CFP that defines this section and provides traceability",
                    },
                    "requirements": {
                        "type": "array",
                        "description": "CRITICAL DATA TRANSFER: Find the object in the CFP Analysis JSON whose 'title' field matches this section's title. Copy the ENTIRE 'requirements' array from that object exactly as-is. Each requirement object must contain: requirement (string), quote_from_source (string), category (string). DO NOT generate new content. If no exact match found, use empty array [].",
                        "items": {
                            "type": "object",
                            "properties": {
                                "requirement": {"type": "string"},
                                "quote_from_source": {"type": "string"},
                                "category": {"type": "string"},
                            },
                        },
                    },
                    "length_limit": {
                        "type": "integer",
                        "nullable": True,
                        "description": "CRITICAL DATA TRANSFER: Standardized word count for all length constraints. Convert ALL length limits to words using these CONVERSION RULES: 1 page = 415 words (Times New Roman 11pt), 1 character = 0.2 words (1 word = 5 characters). Examples: '2 pages' → 830, '1000 characters' → 200, '5 pages' → 2075. If no length limit exists, use null.",
                    },
                    "length_source": {
                        "type": "string",
                        "nullable": True,
                        "description": "CONVERSION TRACKING: Explain the original constraint and conversion applied. Examples: 'Converted from 2 pages (2 x 415 = 830 words)', 'Converted from 1000 characters (1000 / 5 = 200 words)', 'Original: 500 words'. Use null if no length limit.",
                    },
                    "other_limits": {
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
                    "definition": {
                        "type": "string",
                        "nullable": True,
                        "description": "CRITICAL DATA TRANSFER: Find the object in CFP Analysis JSON whose 'title' field matches this section's title. Copy the exact 'definition' string from that object. DO NOT paraphrase or generate new content. If no match found, use null.",
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


WORD_LIMIT_TOLERANCE: Final[float] = 0.1
MAX_NESTING_DEPTH: Final[int] = 5


def _get_children_map(sections: list[ExtractedSectionDTO]) -> dict[str, list[ExtractedSectionDTO]]:
    children_map: dict[str, list[ExtractedSectionDTO]] = {}
    for section in sections:
        parent_id = section.get("parent_id")
        if parent_id:
            if parent_id not in children_map:
                children_map[parent_id] = []
            children_map[parent_id].append(section)
    return children_map


def _validate_parent_child_structure(
    sections: list[ExtractedSectionDTO], children_map: dict[str, list[ExtractedSectionDTO]]
) -> None:
    for section in sections:
        section_id = section["id"]
        children = children_map.get(section_id, [])

        if children and not section.get("is_title_only"):
            raise ValidationError(
                "Parent sections with children must be title-only (is_title_only=true)",
                context={
                    "parent_id": section_id,
                    "parent_title": section["title"],
                    "is_title_only": section.get("is_title_only"),
                    "children_count": len(children),
                    "children_ids": [c["id"] for c in children],
                },
            )

        if section.get("is_title_only") and not children:
            raise ValidationError(
                "Title-only sections must have at least one child section",
                context={
                    "section_id": section_id,
                    "section_title": section["title"],
                    "is_title_only": section.get("is_title_only"),
                },
            )


def _validate_word_limit_distribution(section: ExtractedSectionDTO, children: list[ExtractedSectionDTO]) -> None:
    parent_limit = section.get("length_limit")
    if parent_limit is None:
        return

    children_total = sum(c.get("length_limit") or 0 for c in children)
    tolerance = parent_limit * WORD_LIMIT_TOLERANCE
    difference = abs(children_total - parent_limit)

    if difference > tolerance:
        raise ValidationError(
            "Child section word limits must sum to parent's total limit (±10% tolerance)",
            context={
                "parent_id": section["id"],
                "parent_title": section["title"],
                "parent_limit": parent_limit,
                "children_total": children_total,
                "difference": difference,
                "tolerance": tolerance,
                "children": [{"id": c["id"], "title": c["title"], "limit": c.get("length_limit", 0)} for c in children],
            },
        )


def _validate_section_depth(section: ExtractedSectionDTO, mapped_sections: dict[str, ExtractedSectionDTO]) -> None:
    depth = 1
    current_id = section["id"]
    parent_id = mapped_sections[current_id].get("parent_id")

    while parent_id:
        depth += 1
        current_id = parent_id
        parent_id = mapped_sections[current_id].get("parent_id")

    if depth > MAX_NESTING_DEPTH:
        raise ValidationError(
            "Maximum nesting depth exceeded",
            context={"section_id": section["id"], "depth": depth, "max_depth": MAX_NESTING_DEPTH},
        )


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

        _validate_section_depth(section, mapped_sections)

    children_map = _get_children_map(response["sections"])
    _validate_parent_child_structure(response["sections"], children_map)

    for section in response["sections"]:
        children = children_map.get(section["id"], [])
        if children:
            _validate_word_limit_distribution(section, children)


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

        # Clean title if it has (from:...) embedded (legacy cleanup)
        title = section["title"]
        if "(from:" in title and ")" in title:
            from_start = title.find("(from:")
            section["title"] = title[:from_start].strip()

        # Ensure evidence field is populated
        if not section.get("evidence"):
            section["evidence"] = f"CFP section: {section['title']}"

        if not section.get("requirements"):
            section["requirements"] = []

        if not section.get("length_limit"):
            section["length_limit"] = None
        if not section.get("length_source"):
            section["length_source"] = None
        if not section.get("other_limits"):
            section["other_limits"] = []

        if not section.get("definition"):
            section["definition"] = None

        if "needs_applicant_writing" not in section:
            title_lower = section.get("title", "").lower()
            if "budget" in title_lower and not any(
                keyword in title_lower for keyword in ["justification", "narrative", "explanation", "description"]
            ):
                section["needs_applicant_writing"] = False
            else:
                section["needs_applicant_writing"] = True

    for i, section in enumerate(sections):
        if "order" not in section:
            section["order"] = i + 1

    sorted_sections = sorted(sections, key=lambda s: s["order"])
    for i, section in enumerate(sorted_sections, start=1):
        section["order"] = i

    return sorted_sections


async def extract_sections(
    task_description: str, *, trace_id: str, cfp_analysis: CFPAnalysisResult
) -> ExtractedSections:
    logger.info(
        "Extracted CFP analysis from task_description",
        task_description_length=len(task_description),
        cfp_analysis=cfp_analysis,
        trace_id=trace_id,
    )

    if True:
        return await handle_completions_request(
            prompt_identifier="section_extraction",
            model="gemini-2.5-flash",
            messages=task_description,
            system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
            response_schema=section_extraction_json_schema,
            response_type=ExtractedSections,
            validator=validate_section_extraction,
            temperature=0.1,
            timeout=300,
            trace_id=trace_id,
        )

    return await handle_completions_request(
        prompt_identifier="section_extraction",
        model=ANTHROPIC_SONNET_MODEL,
        messages=task_description,
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
    cfp_analysis: CFPAnalysisResult,
    organization: OrganizationNamespace | None = None,
) -> list[ExtractedSectionDTO]:
    content_list = [f"{content['title']}: {'...'.join(content['subtitles'])}" for content in cfp_content]

    # Log CFP analysis details for debugging
    logger.info(
        "Received CFP analysis for section extraction",
        cfp_analysis_type=type(cfp_analysis).__name__,
        cfp_analysis_keys=list(cfp_analysis.keys()) if isinstance(cfp_analysis, dict) else "not a dict",
        has_cfp_analysis_key="cfp_analysis" in cfp_analysis if isinstance(cfp_analysis, dict) else False,
        has_nlp_analysis_key="nlp_analysis" in cfp_analysis if isinstance(cfp_analysis, dict) else False,
        has_analysis_metadata_key="analysis_metadata" in cfp_analysis if isinstance(cfp_analysis, dict) else False,
        trace_id=trace_id,
    )

    cfp_analysis_text = serialize(cfp_analysis).decode("utf-8")

    logger.info(
        "Serialized CFP analysis for LLM",
        serialized_length=len(cfp_analysis_text),
        serialized_preview=cfp_analysis_text[:200] if len(cfp_analysis_text) > 0 else "EMPTY",
        trace_id=trace_id,
    )

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

    prompt_string = prompt.to_string()
    logger.info(
        "Final prompt for LLM",
        prompt_length=len(prompt_string),
        has_cfp_analysis_tag="<cfp_analysis>" in prompt_string,
        cfp_analysis_section_preview=prompt_string[
            prompt_string.find("<cfp_analysis>") : prompt_string.find("</cfp_analysis>") + 15
        ]
        if "<cfp_analysis>" in prompt_string
        else "NOT FOUND",
        trace_id=trace_id,
    )

    result = await with_evaluation(
        prompt_identifier="extract_sections",
        prompt_handler=partial(extract_sections, cfp_analysis=cfp_analysis),
        prompt=prompt_string,
        trace_id=trace_id,
        cfp_analysis=cfp_analysis,
        **get_evaluation_kwargs(
            "extract_sections",
            job_manager,
            rag_context=rag_results if rag_results else content_list,
            is_json_content=True,
        ),
    )

    return await filter_extracted_sections(result["sections"], trace_id)
