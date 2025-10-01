from collections import defaultdict
from functools import partial
from typing import TYPE_CHECKING, Final, NotRequired, TypedDict

from packages.db.src.json_objects import CFPAnalysisResult
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
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
Expert grant application analyzer. Extract structured section templates from CFP analysis.

Core task: Use the CFP analysis report as authoritative source. Transfer all data accurately - section names, requirements, definitions, and constraints. Do not generate new content.

Conversion standards:
- 1 page = 415 words (Times New Roman 11pt)
- 1 character = 0.2 words
- Non-length constraints → other_limits array

Classification rules:
- needs_applicant_writing = true: Narrative sections, research plans, budget justifications
- needs_applicant_writing = false: CVs, letters, budget forms/spreadsheets
- Budget sections: Only "Justification/Narrative/Explanation/Description" require writing (true)
"""

EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_grant_application_sections",
    template="""
Extract grant application section structure from CFP analysis.

## Input Data

<cfp_analysis>${cfp_analysis}</cfp_analysis>
${organization_guidelines}
<cfp_subject>${cfp_subject}</cfp_subject>
<cfp_content>${cfp_content}</cfp_content>

## Task

Create structured section template by:
1. Using CFP analysis `required_sections` as authoritative source for section names
2. Copying requirements, definitions, and constraints exactly from CFP analysis (no modification)
3. Converting length limits to words: 1 page = 415 words, 1 character = 0.2 words
4. Creating subsections for complex sections (≥3 pages or multi-part requirements)

## Section Data Transfer

For each section:
1. **Title**: Use exact `section_name` from CFP analysis `required_sections`
2. **Requirements**: Copy entire `requirements` array from matching CFP section (do not modify)
3. **Definition**: Copy exact `definition` string from matching CFP section
4. **Length**: Convert to words (e.g., "2 pages" → 830 words) → `length_limit` + `length_source`
5. **Other constraints**: Extract reference counts, formats, etc. → `other_limits` array
6. **Evidence**: Include key CFP quote that defines this section

## Key Rules

**Budget Classification:**
- Include: "Budget Justification/Narrative/Explanation/Description" (requires writing)
- Exclude: "Budget/Budget Form/Budget Spreadsheet/Budget Table" (just forms)

**Subsections:**
- Sections ≥3 pages: Create subsections based on `requirements` array structure
- Parent becomes `is_title_only=true`, children have `parent_id`
- Distribute words proportionally (methods 40-50%, background 15-25%, results 20-30%)
- Max depth: 2 levels (parent→child only)

**Section Properties:**
- `is_detailed_research_plan`: Mark exactly one main methodology section as true
- `is_long_form`: True for all narrative writing sections
- `needs_applicant_writing`: True for narratives, false for external docs (CVs, letters, budget forms)

## Examples

**Example 1: Simple grant with 3 sections**

Input CFP Analysis excerpt:
```json
{
  "required_sections": [
    {
      "section_name": "PROJECT SUMMARY",
      "definition": "One-page overview of the proposed research",
      "requirements": [
        {"requirement": "Must describe research objectives", "quote_from_source": "provide clear objectives", "category": "content"},
        {"requirement": "Must state broader impacts", "quote_from_source": "describe potential impacts", "category": "impact"}
      ]
    }
  ],
  "length_constraints": [
    {"section_name": "PROJECT SUMMARY", "measurement_type": "pages", "limit_description": "1 page maximum", "quote_from_source": "limited to one page"}
  ]
}
```

Output:
```json
{
  "sections": [
    {
      "title": "PROJECT SUMMARY",
      "id": "project_summary",
      "order": 1,
      "parent_id": null,
      "evidence": "Section II.A: Project Summary - limited to one page",
      "requirements": [
        {"requirement": "Must describe research objectives", "quote_from_source": "provide clear objectives", "category": "content"},
        {"requirement": "Must state broader impacts", "quote_from_source": "describe potential impacts", "category": "impact"}
      ],
      "length_limit": 415,
      "length_source": "Converted from 1 page (1 x 415 = 415 words)",
      "other_limits": [],
      "definition": "One-page overview of the proposed research",
      "needs_applicant_writing": true,
      "is_detailed_research_plan": false,
      "is_title_only": false,
      "is_long_form": true,
      "is_clinical_trial": false
    }
  ]
}
```

**Example 2: Complex section with subsections**

Input: "RESEARCH PLAN" section with 5 pages (2075 words) and multi-part requirements

Output:
```json
{
  "sections": [
    {
      "title": "RESEARCH PLAN",
      "id": "research_plan",
      "order": 3,
      "parent_id": null,
      "evidence": "Section III: Research Plan - maximum 5 pages",
      "requirements": [],
      "length_limit": 2075,
      "length_source": "Converted from 5 pages (5 x 415 = 2075 words)",
      "other_limits": [],
      "definition": "Detailed description of proposed research methodology and approach",
      "needs_applicant_writing": true,
      "is_detailed_research_plan": true,
      "is_title_only": true,
      "is_long_form": true,
      "is_clinical_trial": false
    },
    {
      "title": "Background and Significance",
      "id": "research_plan_background",
      "order": 4,
      "parent_id": "research_plan",
      "evidence": "Research Plan subsection covering background",
      "requirements": [],
      "length_limit": 415,
      "length_source": "Proportional allocation (20% of parent)",
      "other_limits": [],
      "definition": null,
      "needs_applicant_writing": true,
      "is_detailed_research_plan": false,
      "is_title_only": false,
      "is_long_form": true,
      "is_clinical_trial": false
    },
    {
      "title": "Methods and Approach",
      "id": "research_plan_methods",
      "order": 5,
      "parent_id": "research_plan",
      "evidence": "Research Plan subsection covering methodology",
      "requirements": [],
      "length_limit": 830,
      "length_source": "Proportional allocation (40% of parent - most important)",
      "other_limits": [],
      "definition": null,
      "needs_applicant_writing": true,
      "is_detailed_research_plan": false,
      "is_title_only": false,
      "is_long_form": true,
      "is_clinical_trial": false
    }
  ]
}
```

Return complete section structure following these patterns.
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
        # Remove invalid parent references using walrus operator
        if (parent_id := section.get("parent_id")) and parent_id not in valid_ids:
            del section["parent_id"]

        # Clean legacy (from:...) patterns from titles using walrus operator
        if (title := section["title"]) and (from_idx := title.find("(from:")) != -1 and ")" in title:
            section["title"] = title[:from_idx].strip()

        # Set default evidence if missing
        section.setdefault("evidence", f"CFP section: {section['title']}")

        # Set defaults for CFP constraint fields (TypedDict-compatible)
        section.setdefault("requirements", [])
        section.setdefault("length_limit", None)
        section.setdefault("length_source", None)
        section.setdefault("other_limits", [])
        section.setdefault("definition", None)

        # Determine needs_applicant_writing using match/case
        if "needs_applicant_writing" not in section:
            title_lower = section.get("title", "").lower()
            budget_keywords = {"justification", "narrative", "explanation", "description"}

            match ("budget" in title_lower, any(kw in title_lower for kw in budget_keywords)):
                case (True, False):  # Has "budget" but no writing keywords
                    section["needs_applicant_writing"] = False
                case _:  # All other cases require applicant writing
                    section["needs_applicant_writing"] = True

    # Ensure all sections have order numbers
    for i, section in enumerate(sections):
        section.setdefault("order", i + 1)

    # Sort by order and renumber sequentially
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

    return await handle_completions_request(
        prompt_identifier="section_extraction",
        model=GEMINI_FLASH_MODEL,
        messages=task_description,
        system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
        response_schema=section_extraction_json_schema,
        response_type=ExtractedSections,
        validator=validate_section_extraction,
        temperature=0.1,
        timeout=300,
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
