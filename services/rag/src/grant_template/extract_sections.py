import asyncio
import re
from collections import defaultdict
from difflib import SequenceMatcher
from typing import TYPE_CHECKING, Any, Final, NotRequired, TypedDict, cast

from packages.db.src.json_objects import (
    CFPAnalysis,
    CFPAnalysisConstraint,
    CFPConstraint,
    CFPContentSection,
)
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL, GEMINI_FLASH_MODEL
from packages.shared_utils.src.dto import (
    ExtractedSectionDTO,
)
from packages.shared_utils.src.serialization import serialize

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager
from packages.shared_utils.src.embeddings import get_embedding_model
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.patterns import SNAKE_CASE_PATTERN
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.sync import run_sync
from sentence_transformers import util

from services.rag.src.grant_template.utils import detect_cycle
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.shared_prompts import ORGANIZATION_GUIDELINES_FRAGMENT

__all__ = [
    "ExtractedSectionDTO",
    "ExtractedSections",
    "extract_sections",
    "handle_extract_sections",
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


# IMPORTANT: ONLY include purely administrative/instructional sections NOT written by applicants
# DO NOT include required application sections like Budget, Biosketches, Data Management, etc.
EXCLUDE_CATEGORIES = [
    # Review process (not for applicants to write)
    "Advisory Input",
    "Evaluation Criteria",
    "Expert Reviews",
    "Feedback",
    "Reviewer Instructions",
    "Reviewers",

    # Navigation/structure (not content sections)
    "Front Matter",
    "Navigation Elements",
    "Table Index",
    "Figure Index",
    "Table of Contents",
    "ToC",

    # Submission process/forms (not narrative content)
    "Application Processing",
    "Contact Information",
    "Cover Sheets",
    "Page Limits",
    "Submission Forms",
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
You are an expert grant application structuring specialist. Create organized section hierarchies for grant applications using CFP analysis section titles.

YOUR TASK: Create section structure and organization based on CFP analysis titles:
- Use exact section titles from CFP analysis required_sections array
- Organize sections into logical hierarchy with parent-child relationships
- Classify section types (narrative, container, research plan, clinical trial)
- Determine writing requirements (applicant content vs external documents)

SECTION CLASSIFICATION:
- needs_writing = TRUE: Sections where applicants write original content (abstracts, project descriptions, research plans, narrative sections, statements, budget justifications)
- needs_writing = FALSE: External documents (CVs, letters of recommendation, letters of support, bibliography/references, biosketches, budget forms/spreadsheets)

BUDGET SECTION CLASSIFICATION:
- needs_writing = TRUE: "Budget Justification", "Budget Narrative", "Budget Explanation", "Budget Description" (requires written content)
- needs_writing = FALSE: "Budget", "Budget Form", "Budget Spreadsheet", "Budget Table", "Budget Summary" (just forms/numbers)

HIERARCHY RULES:
- Create subsections for complex sections (≥3 pages or multi-part requirements)
- Parent sections: title_only=true, contain CFP title
- Child sections: actual writing sections
- Max depth: 2 levels

SECTION TYPES:
- long_form: Narrative sections requiring substantial writing
- is_plan: Exactly one main research methodology section
- clinical: Clinical trial sections
- title_only: Container sections with subsections

Focus on structure and organization. CFP requirements and constraints will be populated separately.
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

Create grant application section structure using CFP analysis section titles.

1. **Use exact section titles from CFP analysis** - section names from required_sections array
2. **Create subsections for complex sections** (≥3 pages or multi-part requirements)
   - Parent section: title_only=true, contains CFP title
   - Child sections: actual writing sections
   - Distribute proportionally: methods 40-50%, background 15-25%, results 20-30%
3. **Focus on structure and organization** - determine hierarchy, relationships, and section types

## Output Requirements

For each section provide:
- **title**: Exact section name from CFP analysis required_sections
- **id**: Unique snake_case identifier
- **order**: Sequential numbering starting at 1
- **parent**: Parent section ID if subsection, null otherwise
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


# ============================================================================
# Parallel Extraction Schemas - Focused, minimal schemas for better quality
# ============================================================================

# 1. Section structure extraction
section_structure_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "id": {"type": "string"},
                    "order": {"type": "integer"},
                    "parent_id": {"type": "string", "nullable": True},
                },
                "required": ["title", "id", "order", "parent_id"],
            },
        },
    },
    "required": ["sections"],
}

# 2. Section classification extraction
section_classification_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "long_form": {"type": "boolean"},
                    "is_plan": {"type": "boolean", "nullable": True},
                    "title_only": {"type": "boolean", "nullable": True},
                    "clinical": {"type": "boolean", "nullable": True},
                    "needs_writing": {"type": "boolean"},
                },
                "required": ["id", "long_form", "needs_writing"],
            },
        },
    },
    "required": ["sections"],
}

# 3. Section enrichment extraction (CFP constraints and guidelines)
section_enrichment_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    # guidelines: optional field, if present must be array of strings
                    "guidelines": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,  # If present, must have at least 1 item
                    },
                    # length_limit: optional field, if present can be int or null
                    "length_limit": {"type": "integer", "nullable": True},
                    # length_source: optional field, if present can be string or null
                    "length_source": {"type": "string", "nullable": True},
                    # other_limits: optional field, if present must be array of constraints
                    "other_limits": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "constraint_type": {"type": "string"},
                                "constraint_value": {"type": "string"},
                                "source_quote": {"type": "string"},
                            },
                            "required": ["constraint_type", "constraint_value", "source_quote"],
                        },
                        "minItems": 1,  # If present, must have at least 1 item
                    },
                    # definition: optional field, if present can be string or null
                    "definition": {"type": "string", "nullable": True},
                },
                "required": ["id"],  # Only id is required, all enrichment fields are optional
            },
        },
    },
    "required": ["sections"],
}


# Result types for parallel extractions

class SectionStructureItem(TypedDict):
    """Individual section structure item."""
    id: str
    title: str
    order: int
    parent_id: str | None


class SectionStructureResult(TypedDict):
    """Section structure extraction result."""
    sections: list[SectionStructureItem]


class SectionClassificationItem(TypedDict):
    """Individual section classification item."""
    id: str
    long_form: bool
    is_plan: bool
    title_only: NotRequired[bool]
    clinical: NotRequired[bool]
    needs_writing: NotRequired[bool]


class SectionClassificationResult(TypedDict):
    """Section classification extraction result."""
    sections: list[SectionClassificationItem]


class EnrichedSection(TypedDict):
    """Individual section with enrichment data.

    Matches ExtractedSectionDTO enrichment fields exactly.
    NotRequired means field can be absent, but if present must match type.
    Nullable fields use `| None` in the type itself.
    """
    id: str
    guidelines: NotRequired[list[str]]  # Can be absent, but if present must be list[str]
    length_limit: NotRequired[int | None]  # Can be absent, if present can be int or None
    length_source: NotRequired[str | None]  # Can be absent, if present can be str or None
    other_limits: NotRequired[list[CFPConstraint]]  # Can be absent, but if present must be list
    definition: NotRequired[str | None]  # Can be absent, if present can be str or None


class SectionEnrichmentResult(TypedDict):
    """Section enrichment extraction result."""
    sections: list[EnrichedSection]


# Validators for parallel extractions

def validate_section_structure(response: SectionStructureResult) -> None:
    """Validate section structure extraction."""
    if not response.get("sections"):
        raise ValidationError("No sections extracted from CFP analysis")

    # Validate IDs are unique
    section_ids = [s["id"] for s in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        raise ValidationError("Duplicate section IDs found in structure extraction")


def validate_section_classification(response: SectionClassificationResult) -> None:
    """Validate section classification extraction."""
    if not response.get("sections"):
        raise ValidationError("No section classifications extracted")

    # Validate exactly one is_plan section
    is_plan_count = sum(1 for s in response["sections"] if s.get("is_plan"))
    if is_plan_count != 1:
        raise ValidationError(
            f"Exactly one section must have is_plan=true, found {is_plan_count}",
            context={
                "is_plan_sections": [s["id"] for s in response["sections"] if s.get("is_plan")],
                "recovery_instruction": "Mark exactly one main research methodology section as is_plan=true",
            },
        )


# Old combined schema (kept for backward compatibility during migration)
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
                    "order",
                    "long_form",
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

# Conversion constants for length limits
WORDS_PER_PAGE: Final[int] = 250  # Standard ~250 words per page
CHARS_PER_WORD: Final[int] = 6  # Average ~6 characters per word (including spaces)


def _similarity_ratio(s1: str, s2: str) -> float:
    """Calculate similarity ratio between two strings (0.0 to 1.0)."""
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()


def match_constraint_to_section(
    constraint: CFPAnalysisConstraint, section_title: str, threshold: float = 0.6
) -> bool:
    """Fuzzy match constraint.section to section.title.

    Returns True if constraint applies to this section.
    If constraint.section is None, returns False (constraint is global).
    """
    constraint_section = constraint.get("section")
    if not constraint_section:
        return False

    # Exact match (case-insensitive)
    if constraint_section.lower() == section_title.lower():
        return True

    # Fuzzy match with threshold
    if _similarity_ratio(constraint_section, section_title) >= threshold:
        return True

    # Check if constraint_section is substring of section_title or vice versa
    constraint_lower = constraint_section.lower()
    title_lower = section_title.lower()
    return bool(constraint_lower in title_lower or title_lower in constraint_lower)


def parse_length_constraint(constraint_value: str, constraint_type: str) -> tuple[int | None, str]:
    """Extract numeric value and type from constraint string.

    Returns (numeric_value, constraint_type) or (None, constraint_value) if parsing fails.

    Examples:
        "6 pages" -> (6, "page_limit")
        "1500 words" -> (1500, "word_limit")
        "12 pages maximum" -> (12, "page_limit")
    """
    # Extract numbers from constraint value
    numbers = re.findall(r"\d+", constraint_value)
    if not numbers:
        return None, constraint_value

    # Use first number found
    value = int(numbers[0])

    # Return value with constraint type
    return value, constraint_type


def convert_to_word_limit(value: int, constraint_type: str) -> int:
    """Normalize page/char limits to word count.

    Args:
        value: Numeric constraint value
        constraint_type: One of word_limit, page_limit, char_limit, format

    Returns:
        Word count equivalent
    """
    if constraint_type == "word_limit":
        return value
    if constraint_type == "page_limit":
        return value * WORDS_PER_PAGE
    if constraint_type == "char_limit":
        return value // CHARS_PER_WORD
    # For format constraints, return 0 (no word limit)
    return 0


def extract_section_guidelines(
    section_title: str, cfp_content: list[CFPContentSection], max_guidelines: int = 10
) -> list[str]:
    """Pull relevant subtitles as guidelines for a section.

    Finds the matching CFP content section and returns its subtitles as guidelines.
    Limits to max_guidelines items to avoid excessive data.
    """
    # Find matching CFP content section
    for content_section in cfp_content:
        if _similarity_ratio(content_section["title"], section_title) >= 0.6:
            # Return subtitles, limited to max_guidelines
            subtitles = content_section.get("subtitles", [])
            return subtitles[:max_guidelines]

    return []


def create_section_definition(guidelines: list[str]) -> str | None:
    """Create concise section definition from guidelines.

    Uses first guideline as primary definition, with optional summary of additional guidelines.

    Args:
        guidelines: List of guideline strings from CFP

    Returns:
        Concise definition string or None if no guidelines
    """
    if not guidelines:
        return None

    if len(guidelines) == 1:
        return guidelines[0]

    # Use first guideline as primary definition
    primary = guidelines[0]

    # If there are many guidelines (>3), add count summary
    if len(guidelines) > 3:
        return f"{primary} (Plus {len(guidelines) - 1} additional requirements - see guidelines)"

    # For 2-3 guidelines, just use the first one
    # Full list is available in guidelines field
    return primary


def enrich_section_with_constraints(
    section: ExtractedSectionDTO,
    cfp_analysis: CFPAnalysis,
    cfp_content: list[CFPContentSection],
) -> ExtractedSectionDTO:
    """Enrich section with constraints, guidelines, and definition from CFP analysis.

    Matches constraints to sections, extracts guidelines, and populates all new fields.
    """
    section_title = section["title"]
    section_id = section["id"]
    constraints = cfp_analysis.get("analysis_metadata", {}).get("constraints", [])

    # Extract matching constraints
    matched_constraints: list[CFPAnalysisConstraint] = []
    length_limit: int | None = None
    length_source: str | None = None
    other_limits: list[CFPConstraint] = []

    for constraint in constraints:
        if match_constraint_to_section(constraint, section_title):
            matched_constraints.append(constraint)

            logger.debug(
                "Matched constraint to section",
                section_id=section_id,
                section_title=section_title,
                constraint_type=constraint["type"],
                constraint_value=constraint["value"],
                constraint_section=constraint.get("section"),
            )

            # Process length constraints
            if constraint["type"] in ["word_limit", "page_limit", "char_limit"]:
                value, c_type = parse_length_constraint(constraint["value"], constraint["type"])
                if value is not None:
                    word_limit = convert_to_word_limit(value, c_type)
                    if word_limit > 0 and (length_limit is None or word_limit < length_limit):
                        # Use the most restrictive limit if multiple
                        length_limit = word_limit
                        length_source = constraint["value"]

            # Process format/other constraints
            elif constraint["type"] == "format":
                other_limits.append(
                    CFPConstraint(
                        constraint_type=constraint["type"],
                        constraint_value=constraint["value"],
                        source_quote=constraint.get("section") or "",
                    )
                )

    # Extract guidelines from CFP content
    guidelines = extract_section_guidelines(section_title, cfp_content)

    # Create intelligent definition from guidelines
    definition = create_section_definition(guidelines)

    # Populate new fields
    if guidelines:
        section["guidelines"] = guidelines
    if length_limit is not None:
        section["length_limit"] = length_limit
    if length_source:
        section["length_source"] = length_source
    if other_limits:
        section["other_limits"] = other_limits
    if definition:
        section["definition"] = definition

    # Log enrichment results
    if section.get("long_form"):
        if not length_limit and len(matched_constraints) == 0:
            logger.info(
                "Long-form section has no length constraints",
                section_id=section_id,
                section_title=section_title,
                has_guidelines=bool(guidelines),
                guidelines_count=len(guidelines) if guidelines else 0,
            )
        elif length_limit:
            logger.info(
                "Section enriched with length constraint",
                section_id=section_id,
                section_title=section_title,
                length_limit=length_limit,
                length_source=length_source,
                guidelines_count=len(guidelines) if guidelines else 0,
                other_constraints_count=len(other_limits),
            )

    return section


def _get_children_map(sections: list[ExtractedSectionDTO]) -> dict[str, list[ExtractedSectionDTO]]:
    children_map: dict[str, list[ExtractedSectionDTO]] = {}
    for section in sections:
        parent_id = section.get("parent")
        if parent_id:
            if parent_id not in children_map:
                children_map[parent_id] = []
            children_map[parent_id].append(section)
    return children_map


def _validate_parent_child_structure(
    sections: list[ExtractedSectionDTO], children_map: dict[str, list[ExtractedSectionDTO]]
) -> None:
    {s["id"]: s for s in sections}

    for section in sections:
        section_id = section["id"]
        children = children_map.get(section_id, [])

        if children and not section.get("title_only"):
            raise ValidationError(
                "Parent sections with children must be title-only (is_title_only=true)",
                context={
                    "parent": section_id,
                    "parent_title": section["title"],
                    "title_only": section.get("title_only"),
                    "children_count": len(children),
                    "children_ids": [c["id"] for c in children],
                },
            )

        if section.get("title_only") and not children:
            raise ValidationError(
                "Title-only sections must have at least one child section",
                context={
                    "section_id": section_id,
                    "section_title": section["title"],
                    "title_only": section.get("title_only"),
                },
            )

        # Validate bidirectional parent-child consistency
        if parent_id := section.get("parent"):
            parent_children = children_map.get(parent_id, [])
            if section not in parent_children:
                raise ValidationError(
                    "Parent-child relationship inconsistency detected",
                    context={
                        "child_id": section_id,
                        "child_title": section["title"],
                        "parent_id": parent_id,
                        "parent_children_count": len(parent_children),
                        "parent_children_ids": [c["id"] for c in parent_children],
                        "recovery_instruction": f"Ensure section '{section_id}' is properly listed as a child of parent '{parent_id}'",
                    },
                )

        # Validate children have unique order values within same parent
        if children:
            child_orders = [c["order"] for c in children]
            if len(child_orders) != len(set(child_orders)):
                duplicates = [order for order in child_orders if child_orders.count(order) > 1]
                raise ValidationError(
                    "Children of same parent have duplicate order values",
                    context={
                        "parent_id": section_id,
                        "parent_title": section["title"],
                        "duplicate_orders": list(set(duplicates)),
                        "children_orders": [(c["id"], c["order"]) for c in children],
                        "recovery_instruction": f"Assign unique order values to children of parent '{section_id}'",
                    },
                )


def _validate_word_limit_distribution(_section: ExtractedSectionDTO, _children: list[ExtractedSectionDTO]) -> None:
    # ExtractedSectionDTO doesn't have max_words field, so this validation is not applicable
    # Word limit constraints are now in CFPAnalysisData.constraints
    return


def _validate_section_depth(section: ExtractedSectionDTO, mapped_sections: dict[str, ExtractedSectionDTO]) -> None:
    depth = 1
    current_id = section["id"]
    parent_id = mapped_sections[current_id].get("parent")

    while parent_id:
        depth += 1
        current_id = parent_id
        parent_id = mapped_sections[current_id].get("parent")

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

    # Check for similar titles (potential duplicates with slight variations)
    def get_title_words(title: str) -> set[str]:
        """Extract meaningful words from title, filtering out common words."""
        common_words = {"the", "a", "an", "and", "or", "of", "for", "in", "on", "at", "to", "with"}
        return {word for word in title.lower().split() if word not in common_words and len(word) > 2}

    similar_pairs = []
    for i, section_a in enumerate(response["sections"]):
        title_a = section_a["title"].strip()
        words_a = get_title_words(title_a)
        if not words_a:
            continue

        for section_b in response["sections"][i + 1:]:
            title_b = section_b["title"].strip()
            words_b = get_title_words(title_b)
            if not words_b:
                continue

            # Check if titles share > 50% of meaningful words
            overlap = words_a & words_b
            union = words_a | words_b
            similarity = len(overlap) / len(union) if union else 0

            if similarity > 0.5:
                similar_pairs.append({
                    "section_a": {"id": section_a["id"], "title": title_a},
                    "section_b": {"id": section_b["id"], "title": title_b},
                    "similarity": round(similarity, 2),
                    "shared_words": list(overlap),
                })

    if similar_pairs:
        raise ValidationError(
            "Sections with suspiciously similar titles detected",
            context={
                "similar_pairs": similar_pairs,
                "pair_count": len(similar_pairs),
                "recovery_instruction": "Ensure section titles are distinct and clearly differentiate sections. Consider merging or renaming similar sections.",
            },
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


def _matches_exclude_categories(
    section: ExtractedSectionDTO,
    exclude_embeddings: list[float],
    threshold: float,
    trace_id: str,
) -> bool:
    """Check if section matches administrative/instructional exclude categories."""
    normalized_title = section["title"].lower().strip()
    for category in EXCLUDE_CATEGORIES:
        normalized_category = category.lower().strip()
        if normalized_category in normalized_title or normalized_title in normalized_category:
            return True

    try:
        model = get_embedding_model()
        title_embedding = model.encode(section["title"], convert_to_tensor=True, device="cpu")

        similarities = util.cos_sim(title_embedding, exclude_embeddings)
        if similarities is not None and len(similarities) > 0:
            max_similarity = float(similarities[0].max().item())
            return max_similarity >= threshold

        return False
    except Exception as e:
        logger.warning(
            "Embedding calculation failed for section", title=section["title"], error=str(e), trace_id=trace_id
        )
        return False


def _should_keep_section(
    section: ExtractedSectionDTO,
    sections: list[ExtractedSectionDTO],
    threshold: float,
    exclude_embeddings: list[float],
    trace_id: str,
) -> bool:
    """Determine if section should be kept based on multiple criteria.

    Keep sections if they meet ANY of these criteria:
    1. is_plan=True (research plan)
    2. long_form=True (LLM classified as narrative)
    3. needs_writing=True (applicant must write content)
    4. Has length_limit or other_limits (has constraints = important)
    5. Has guidelines (has requirements = important)
    6. Has long_form children (parent of important sections)
    7. Is parent of any sections (structural)

    Only discard truly administrative sections that match EXCLUDE_CATEGORIES.
    """
    # Always keep research plan
    if section.get("is_plan"):
        return True

    # Keep applicant-written content
    if section.get("needs_writing"):
        return True

    # Keep sections with constraints (they're important!)
    if section.get("length_limit") or section.get("other_limits"):
        return True

    # Keep sections with guidelines (they have requirements!)
    if section.get("guidelines"):
        return True

    # Keep long-form narrative sections
    if section.get("long_form"):
        return True

    # Keep parents of long-form sections
    has_long_form_children = any(s.get("parent") == section["id"] and s.get("long_form") for s in sections)
    if has_long_form_children:
        return True

    # Keep structural parents (but check exclude list)
    is_parent = any(s.get("parent") == section["id"] for s in sections)
    if is_parent:
        # Still check against exclude categories for structural sections
        return not _matches_exclude_categories(section, exclude_embeddings, threshold, trace_id)

    # Discard everything else (truly administrative sections)
    return False


def _has_enough_sections(filtered_sections: list[ExtractedSectionDTO], all_sections: list[ExtractedSectionDTO]) -> bool:
    """Check if we have enough sections to proceed.

    Criteria:
    - At least 1 is_plan section
    - At least 3 long_form sections
    - At least 50% of needs_writing=True sections retained
    """
    has_plan = any(s.get("is_plan") for s in filtered_sections)
    long_form_count = sum(1 for s in filtered_sections if s.get("long_form"))

    needs_writing_total = sum(1 for s in all_sections if s.get("needs_writing"))
    needs_writing_retained = sum(1 for s in filtered_sections if s.get("needs_writing"))

    retention_rate = needs_writing_retained / needs_writing_total if needs_writing_total > 0 else 1.0

    return has_plan and long_form_count >= 3 and retention_rate >= 0.5


async def filter_extracted_sections(
    sections: list[ExtractedSectionDTO], trace_id: str, initial_threshold: float = 0.9
) -> list[ExtractedSectionDTO]:
    """Filter out irrelevant sections using embedding similarity to exclude categories.

    Starts with strict filtering (threshold=0.9) and gradually relaxes (down to 0.5)
    until we have enough sections (at least 1 research plan, 3 long-form, 50% retention).
    """
    exclude_embeddings = await get_exclude_embeddings()
    threshold = initial_threshold
    min_threshold = 0.5

    while threshold >= min_threshold:
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

        if _has_enough_sections(filtered_sections, sections):
            logger.info(
                "Filtered sections with threshold",
                threshold=threshold,
                input_count=len(sections),
                output_count=len(filtered_sections),
                trace_id=trace_id,
            )
            return _finalize_extracted_sections(filtered_sections)

        threshold -= 0.05

    # Fallback: keep all sections with important criteria (very permissive)
    fallback_sections = [
        section
        for section in sections
        if section.get("is_plan")
        or section.get("long_form")
        or section.get("needs_writing")
        or section.get("length_limit")
        or section.get("guidelines")
    ]

    logger.warning(
        "Using fallback filtering - could not find enough sections",
        input_count=len(sections),
        output_count=len(fallback_sections),
        trace_id=trace_id,
    )

    return _finalize_extracted_sections(fallback_sections or sections)


def _finalize_extracted_sections(sections: list[ExtractedSectionDTO]) -> list[ExtractedSectionDTO]:
    """Finalize extracted sections: validate parents, clean titles, set defaults, sort by order."""
    # Validate exactly one research plan section after filtering
    research_plan_sections = [s for s in sections if s.get("is_plan")]
    if len(research_plan_sections) != 1:
        raise ValidationError(
            f"After filtering, exactly one section must be marked as detailed research_plan. Found {len(research_plan_sections)}.",
            context={
                "research_plan_count": len(research_plan_sections),
                "research_plan_sections": [{"id": s["id"], "title": s["title"]} for s in research_plan_sections],
                "total_sections": len(sections),
                "recovery_instruction": "Ensure exactly one section remains marked as is_plan=True after exclude category filtering",
            },
        )

    valid_ids = {s["id"] for s in sections}

    for section in sections:
        # Remove invalid parent references
        if (parent_id := section.get("parent")) and parent_id not in valid_ids:
            del section["parent"]

        # Clean up title formatting
        title = section["title"]
        if "(from:" in title and ")" in title:
            from_start = title.find("(from:")
            section["title"] = title[:from_start].strip()

        # Set needs_writing default if not present
        if "needs_writing" not in section:
            title_lower = section.get("title", "").lower()
            budget_keywords = {"justification", "narrative", "explanation", "description"}

            match ("budget" in title_lower, any(kw in title_lower for kw in budget_keywords)):
                case (True, False):
                    section["needs_writing"] = False
                case _:
                    section["needs_writing"] = True

    # Ensure all sections have order and sort by it
    for i, section in enumerate(sections):
        if "order" not in section:
            section["order"] = i + 1

    sorted_sections = sorted(sections, key=lambda s: s["order"])
    for i, section in enumerate(sorted_sections, start=1):
        section["order"] = i

    return sorted_sections


# ============================================================================
# Parallel Extraction Functions - Focused, minimal LLM calls
# ============================================================================

async def extract_section_structure(
    task_description: str,
    *,
    trace_id: str,
) -> SectionStructureResult:
    """Extract hierarchical section structure (title, id, order, parent)."""
    return await handle_completions_request(
        prompt_identifier="section_structure",
        response_type=SectionStructureResult,
        response_schema=section_structure_schema,
        validator=validate_section_structure,
        messages=task_description,
        system_prompt=(
            "Extract hierarchical section structure from CFP analysis. "
            "Create parent-child relationships with max 2-level depth. "
            "Use exact section titles from CFP. Return valid JSON only."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def extract_section_classification(
    task_description: str,
    *,
    trace_id: str,
) -> SectionClassificationResult:
    """Classify section types and writing requirements."""
    return await handle_completions_request(
        prompt_identifier="section_classification",
        response_type=SectionClassificationResult,
        response_schema=section_classification_schema,
        validator=validate_section_classification,
        messages=task_description,
        system_prompt=(
            "Classify grant application sections by type and writing requirements.\n\n"
            "## Field Definitions\n"
            "long_form: Narrative sections requiring substantial writing by applicants. "
            "Include research plans, project descriptions, abstracts, summaries, justifications, "
            "data management plans, impact statements, and any section where applicants write prose "
            "(not just fill forms). Sections with page/word limits are usually long_form.\n\n"
            "is_plan: Exactly ONE main research methodology section (research approach, methods, aims).\n\n"
            "title_only: Container sections with subsections only.\n\n"
            "clinical: Clinical trial sections.\n\n"
            "needs_writing: True if applicant writes content (not external docs like CVs, letters).\n\n"
            "Return valid JSON only."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def extract_section_enrichment(
    task_description: str,
    cfp_analysis: CFPAnalysis,
    *,
    trace_id: str,
) -> SectionEnrichmentResult:
    """Extract CFP constraints and guidelines for sections."""
    # Include CFP analysis constraints in prompt for better matching
    constraints = cfp_analysis.get("analysis_metadata", {}).get("constraints", [])
    enrichment_prompt = f"{task_description}\n\n<cfp_constraints>{serialize(constraints).decode('utf-8')}</cfp_constraints>"

    return await handle_completions_request(
        prompt_identifier="section_enrichment",
        response_type=SectionEnrichmentResult,
        response_schema=section_enrichment_schema,
        validator=None,  # Optional extraction - all fields nullable
        messages=enrichment_prompt,
        system_prompt=(
            "Extract CFP constraints and guidelines for grant application sections. "
            "guidelines: Relevant CFP text excerpts for this section (3-10 items). "
            "length_limit: Word count from CFP (convert pages: 250 words/page, chars: 6 chars/word). "
            "length_source: Exact quote from CFP documenting the limit. "
            "other_limits: Additional formatting/structure constraints. "
            "definition: Concise summary from guidelines (single guideline as-is, 4+ add 'Plus X additional requirements'). "
            "Return valid JSON only. All fields nullable if not found."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


# ============================================================================
# Legacy single extraction function (to be deprecated)
# ============================================================================

async def extract_sections(
    task_description: str, *, trace_id: str, cfp_analysis: CFPAnalysis
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
    trace_id: str,
    *,
    cfp_analysis: CFPAnalysis,
    job_manager: "JobManager[StageDTO]",
) -> list[ExtractedSectionDTO]:
    """Extract hierarchical grant application sections from CFP content using parallel strategies."""
    await job_manager.ensure_not_cancelled()

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
    organization = cfp_analysis.get("organization")
    if organization:
        rag_results = await retrieve_documents(
            organization_id=organization["id"],
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

    # Execute parallel extractions for better performance and simpler schemas
    logger.info("Starting parallel section extraction", trace_id=trace_id)
    await job_manager.ensure_not_cancelled()

    structure_result, classification_result, enrichment_result = await asyncio.gather(
        extract_section_structure(prompt_string, trace_id=trace_id),
        extract_section_classification(prompt_string, trace_id=trace_id),
        extract_section_enrichment(prompt_string, cfp_analysis, trace_id=trace_id),
    )

    logger.info(
        "Parallel extractions completed",
        structure_sections=len(structure_result["sections"]),
        classification_sections=len(classification_result["sections"]),
        enrichment_sections=len(enrichment_result["sections"]),
        trace_id=trace_id,
    )

    # Merge results by section ID
    sections_by_id: dict[str, dict[str, Any]] = {}

    # Start with structure (provides base fields: title, id, order, parent)
    # Note: Rename parent_id -> parent to match ExtractedSectionDTO
    for section in structure_result["sections"]:
        section_dict = dict(section)
        section_dict["parent"] = section_dict.pop("parent_id")
        sections_by_id[section["id"]] = section_dict

    # Merge classification fields (long_form, is_plan, title_only, clinical, needs_writing)
    for classification in classification_result["sections"]:
        section_id = classification["id"]
        if section_id in sections_by_id:
            sections_by_id[section_id].update(classification)
        else:
            logger.warning(
                "Classification for unknown section ID",
                section_id=section_id,
                trace_id=trace_id,
            )

    # Merge enrichment fields (guidelines, length_limit, length_source, other_limits, definition)
    for enrichment in enrichment_result["sections"]:
        section_id = enrichment["id"]
        if section_id in sections_by_id:
            sections_by_id[section_id].update(enrichment)
        else:
            logger.warning(
                "Enrichment for unknown section ID",
                section_id=section_id,
                trace_id=trace_id,
            )

    # Ensure all sections have default values for required fields
    # Also regenerate definitions from guidelines to ensure correct format
    for section_dict in sections_by_id.values():
        if "long_form" not in section_dict:
            section_dict["long_form"] = False
        if "needs_writing" not in section_dict:
            section_dict["needs_writing"] = True  # Default to True if not specified
        if "is_plan" not in section_dict:
            section_dict["is_plan"] = False

        # Generate definition from guidelines only if LLM didn't provide one
        # Preserve LLM-generated definitions as they contain section-specific context
        if section_dict.get("guidelines") and not section_dict.get("definition"):
            section_dict["definition"] = create_section_definition(cast("list[str]", section_dict["guidelines"]))

    # Validate enrichment coverage: long-form writing sections must have guidance or constraints
    sections_missing_guidance = []
    for section_dict in sections_by_id.values():
        if section_dict.get("needs_writing") and section_dict.get("long_form"):
            has_guidelines = bool(section_dict.get("guidelines"))
            has_length = bool(section_dict.get("length_limit"))
            if not has_guidelines and not has_length:
                sections_missing_guidance.append({
                    "id": section_dict["id"],
                    "title": section_dict["title"],
                })

    if sections_missing_guidance:
        section_titles = [cast("str", s["title"]) for s in sections_missing_guidance]
        raise ValidationError(
            "Long-form writing sections missing both guidelines and length constraints",
            context={
                "sections_missing_guidance": sections_missing_guidance,
                "section_count": len(sections_missing_guidance),
                "recovery_instruction": f"Add guidelines or length constraints for: {', '.join(section_titles[:3])}{'...' if len(section_titles) > 3 else ''}",
            },
        )

    extracted_sections: list[ExtractedSectionDTO] = [
        cast("ExtractedSectionDTO", section) for section in sections_by_id.values()
    ]

    logger.info(
        "Merged parallel extraction results",
        total_sections=len(extracted_sections),
        sections_with_length_limits=sum(1 for s in extracted_sections if s.get("length_limit")),
        sections_with_guidelines=sum(1 for s in extracted_sections if s.get("guidelines")),
        trace_id=trace_id,
    )

    # Filter and finalize sections
    filtered_sections = await filter_extracted_sections(extracted_sections, trace_id)

    logger.info(
        "Section extraction completed",
        sections_count=len(filtered_sections),
        sections_with_constraints=sum(1 for s in filtered_sections if s.get("length_limit")),
        sections_with_guidelines=sum(1 for s in filtered_sections if s.get("guidelines")),
        trace_id=trace_id,
    )

    return filtered_sections
