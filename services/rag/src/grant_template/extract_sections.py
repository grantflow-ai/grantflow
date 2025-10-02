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

## Task

Create grant application section structure using CFP analysis as authoritative source.

1. **Use exact section titles from CFP analysis** - section names from required_sections array
2. **Copy data verbatim** - requirements arrays, definitions, constraints (no modification)
3. **Create subsections for complex sections** (≥3 pages or multi-part requirements)
   - Parent section: title_only=true, contains CFP title, total word limit
   - Child sections: actual writing sections, word limits sum to parent total
   - Distribute words: methods 40-50%, background 15-25%, results 20-30%
4. **Convert length limits** - 1 page = 415 words, 1 character = 0.2 words

## Output Requirements

For each section provide:
- **title**: Exact section name from CFP analysis required_sections
- **id**: Unique snake_case identifier
- **order**: Sequential numbering starting at 1
- **parent**: Parent section ID if subsection, null otherwise
- **evidence**: CFP quote defining this section
- **requirements**: Copy entire requirements array from matching CFP section (requirement, quote, category)
- **definition**: Copy definition from matching CFP section
- **max_words**: Convert length constraints to words (1 page = 415 words, 1 character = 0.2 words)
- **source**: Original constraint and conversion explanation
- **limits**: Non-length constraints (references, format requirements)
- **needs_writing**: True if applicant writes content, false for external docs
- **is_plan**: Mark exactly one main methodology section as true
- **title_only**: True if section contains only title and subsections
- **long_form**: True for narrative writing sections
- **clinical**: True if clinical trial section

## Critical Rules

**Budget sections**: Include "Budget Justification/Narrative/Explanation" (requires writing). Exclude "Budget Form/Table/Spreadsheet" (forms only).

**Subsections**: Create for sections ≥3 pages. Parent becomes title_only=true. Distribute words proportionally (methods 40-50%, background 15-25%, results 20-30%). Max depth: 2 levels.

**Research plan**: Exactly one section must have is_plan=true. This section must also have long_form=true.
    """,
)

section_extraction_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error if sections cannot be determined",
        },
        "sections": {
            "type": "array",
            "description": "Array of section objects",
            "items": {
                "type": "object",
                "required": [
                    "title",
                    "id",
                    "parent",
                    "long_form",
                    "evidence",
                    "requirements",
                    "max_words",
                    "source",
                    "limits",
                    "definition",
                    "needs_writing",
                ],
                "properties": {
                    "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 300,
                        "description": "Section title from CFP",
                    },
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Unique snake_case identifier",
                    },
                    "order": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Section order, starting at 1",
                    },
                    "parent": {
                        "type": "string",
                        "nullable": True,
                        "description": "Parent section ID, null for top-level",
                    },
                    "evidence": {
                        "type": "string",
                        "minLength": 10,
                        "description": "Quote from CFP defining this section",
                    },
                    "requirements": {
                        "type": "array",
                        "description": "Requirements array from CFP Analysis (copy from matching section_name)",
                        "items": {
                            "type": "object",
                            "properties": {
                                "requirement": {"type": "string"},
                                "quote": {"type": "string"},
                                "category": {"type": "string"},
                            },
                        },
                    },
                    "max_words": {
                        "type": "integer",
                        "nullable": True,
                        "description": "Word count limit (convert pages/chars: 1pg=415w, 1char=0.2w), null if none",
                    },
                    "source": {
                        "type": "string",
                        "nullable": True,
                        "description": "Original constraint and conversion applied, null if no limit",
                    },
                    "limits": {
                        "type": "array",
                        "description": "Non-length constraints (references, format, etc)",
                        "items": {
                            "type": "object",
                            "required": ["type", "value", "quote"],
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "description": "Constraint type",
                                },
                                "value": {
                                    "type": "string",
                                    "description": "Constraint value",
                                },
                                "quote": {
                                    "type": "string",
                                    "description": "CFP quote",
                                },
                            },
                        },
                    },
                    "definition": {
                        "type": "string",
                        "nullable": True,
                        "description": "Definition from CFP Analysis (copy from matching section_name)",
                    },
                    "needs_writing": {
                        "type": "boolean",
                        "description": "True if applicant writes content, false for external docs",
                    },
                    "is_plan": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "True if detailed research plan/methodology section",
                    },
                    "title_only": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "True if contains only title and subsections",
                    },
                    "long_form": {
                        "type": "boolean",
                        "description": "True if research content section written by applicants",
                    },
                    "clinical": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "True if clinical trial section",
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

    research_plan_sections = [s for s in response["sections"] if s.get("is_plan")]
    if len(research_plan_sections) != 1:
        raise ValidationError(
            f"Exactly one section must be marked as detailed research_plan. Found {len(research_plan_sections)}.",
            context={"research_plan_sections": [s["id"] for s in research_plan_sections]},
        )

    if research_plan_sections and not research_plan_sections[0].get("long_form"):
        raise ValidationError(
            "The detailed research_plan section must be marked as a long-form section",
            context={"research_plan_id": research_plan_sections[0]["id"], "title": research_plan_sections[0]["title"]},
        )

    long_form_sections = [s for s in response["sections"] if s.get("long_form")]
    if not long_form_sections:
        raise ValidationError("At least one section must be marked as long-form")

    mapped_sections = {section["id"]: section for section in response["sections"]}
    dependency_graph = defaultdict[str, list[str]](list)
    for section in response["sections"]:
        if parent_id := section.get("parent"):
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

        if parent_id := section.get("parent"):
            if parent_id not in valid_ids:
                raise ValidationError(
                    f"Invalid parent section reference. The section {section['id']} defines a parent section {parent_id} that does not exist in the sections list.",
                )
            if mapped_sections[parent_id].get("is_plan"):
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
    if section.get("is_plan"):
        return True

    has_long_form_children = any(s.get("parent") == section["id"] and s.get("long_form") for s in sections)

    has_important_role = section.get("long_form") or has_long_form_children

    if not has_important_role:
        is_parent = any(s.get("parent") == section["id"] for s in sections)
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

        has_research_plan = any(s.get("is_plan") for s in filtered_sections)

        has_long_form = any(s.get("long_form") for s in filtered_sections)

        if has_research_plan and has_long_form:
            return _maintain_hierarchy_integrity(filtered_sections)

        threshold += 0.05

    fallback_sections = [section for section in sections if section.get("is_plan") or section.get("long_form")]

    if not fallback_sections:
        fallback_sections = [section for section in sections if section.get("is_plan")]

    return _maintain_hierarchy_integrity(fallback_sections or sections)


def _maintain_hierarchy_integrity(sections: list[ExtractedSectionDTO]) -> list[ExtractedSectionDTO]:
    valid_ids = {s["id"] for s in sections}

    for section in sections:
        if (parent_id := section.get("parent")) and parent_id not in valid_ids:
            del section["parent"]

        # Clean title if it has (from:...) embedded (legacy cleanup)
        title = section["title"]
        if "(from:" in title and ")" in title:
            from_start = title.find("(from:")
            section["title"] = title[:from_start].strip()

        # Ensure evidence field is populated
        if not section.get("evidence"):
            section["evidence"] = f"CFP section: {section['title']}"

        section.setdefault("requirements", [])
        section.setdefault("max_words", None)
        section.setdefault("source", None)
        section.setdefault("limits", [])
        section.setdefault("definition", None)

        if "needs_writing" not in section:
            title_lower = section.get("title", "").lower()
            budget_keywords = {"justification", "narrative", "explanation", "description"}

            match ("budget" in title_lower, any(kw in title_lower for kw in budget_keywords)):
                case (True, False):
                    section["needs_writing"] = False
                case _:
                    section["needs_writing"] = True

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
