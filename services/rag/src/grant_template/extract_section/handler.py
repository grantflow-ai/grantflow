import asyncio
import re
from difflib import SequenceMatcher
from typing import TYPE_CHECKING, Any, Final, cast

from packages.db.src.json_objects import (
    CFPAnalysis,
    CFPAnalysisConstraint,
    CFPConstraint,
    CFPContentSection,
)
from packages.shared_utils.src.dto import (
    ExtractedSectionDTO,
)
from packages.shared_utils.src.embeddings import get_embedding_model
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.sync import run_sync
from sentence_transformers import util

from services.rag.src.grant_template.extract_section.section_classification import extract_section_classification
from services.rag.src.grant_template.extract_section.section_enrichment import extract_section_enrichment
from services.rag.src.grant_template.extract_section.section_structure import extract_section_structure

logger = get_logger(__name__)

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

exclude_embeddings_ref = Ref[list[float]]()


EXCLUDE_CATEGORIES = [
    "Advisory Input",
    "Evaluation Criteria",
    "Expert Reviews",
    "Feedback",
    "Reviewer Instructions",
    "Reviewers",
    "Front Matter",
    "Navigation Elements",
    "Table Index",
    "Figure Index",
    "Table of Contents",
    "ToC",
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


async def get_exclude_embeddings() -> list[float]:
    if exclude_embeddings_ref.value is None:
        model = await run_sync(get_embedding_model)
        tensor = model.encode(EXCLUDE_CATEGORIES, convert_to_tensor=True, device="cpu")
        exclude_embeddings_ref.value = tensor.tolist()
    return exclude_embeddings_ref.value


WORD_LIMIT_TOLERANCE: Final[float] = 0.1

WORDS_PER_PAGE: Final[int] = 250
CHARS_PER_WORD: Final[int] = 6


def _similarity_ratio(s1: str, s2: str) -> float:
    return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()


def match_constraint_to_section(constraint: CFPAnalysisConstraint, section_title: str, threshold: float = 0.6) -> bool:
    constraint_section = constraint.get("section")
    if not constraint_section:
        return False

    if constraint_section.lower() == section_title.lower():
        return True

    if _similarity_ratio(constraint_section, section_title) >= threshold:
        return True

    constraint_lower = constraint_section.lower()
    title_lower = section_title.lower()
    return bool(constraint_lower in title_lower or title_lower in constraint_lower)


def parse_length_constraint(constraint_value: str, constraint_type: str) -> tuple[int | None, str]:
    numbers = re.findall(r"\d+", constraint_value)
    if not numbers:
        return None, constraint_value

    value = int(numbers[0])

    return value, constraint_type


def convert_to_word_limit(value: int, constraint_type: str) -> int:
    if constraint_type == "word_limit":
        return value
    if constraint_type == "page_limit":
        return value * WORDS_PER_PAGE
    if constraint_type == "char_limit":
        return value // CHARS_PER_WORD
    return 0


def extract_section_guidelines(
    section_title: str, cfp_content: list[CFPContentSection], max_guidelines: int = 10
) -> list[str]:
    for content_section in cfp_content:
        if _similarity_ratio(content_section["title"], section_title) >= 0.6:
            subtitles = content_section.get("subtitles", [])
            return subtitles[:max_guidelines]

    return []


def create_section_definition(guidelines: list[str]) -> str | None:
    if not guidelines:
        return None

    if len(guidelines) == 1:
        return guidelines[0]

    primary = guidelines[0]

    if len(guidelines) > 3:
        return f"{primary} (Plus {len(guidelines) - 1} additional requirements - see guidelines)"

    return primary


def enrich_section_with_constraints(
    section: ExtractedSectionDTO,
    cfp_analysis: CFPAnalysis,
    cfp_content: list[CFPContentSection],
) -> ExtractedSectionDTO:
    section_title = section["title"]
    section_id = section["id"]
    constraints = cfp_analysis.get("analysis_metadata", {}).get("constraints", [])

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

            if constraint["type"] in ["word_limit", "page_limit", "char_limit"]:
                value, c_type = parse_length_constraint(constraint["value"], constraint["type"])
                if value is not None:
                    word_limit = convert_to_word_limit(value, c_type)
                    if word_limit > 0 and (length_limit is None or word_limit < length_limit):
                        length_limit = word_limit
                        length_source = constraint["value"]

            elif constraint["type"] == "format":
                other_limits.append(
                    CFPConstraint(
                        constraint_type=constraint["type"],
                        constraint_value=constraint["value"],
                        source_quote=constraint.get("section") or "",
                    )
                )

    guidelines = extract_section_guidelines(section_title, cfp_content)

    definition = create_section_definition(guidelines)

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


def _matches_exclude_categories(
    section: ExtractedSectionDTO,
    exclude_embeddings: list[float],
    threshold: float,
    trace_id: str,
) -> bool:
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
    if section.get("is_plan"):
        return True

    if section.get("needs_writing"):
        return True

    if section.get("length_limit") or section.get("other_limits"):
        return True

    if section.get("guidelines"):
        return True

    if section.get("long_form"):
        return True

    has_long_form_children = any(s.get("parent") == section["id"] and s.get("long_form") for s in sections)
    if has_long_form_children:
        return True

    is_parent = any(s.get("parent") == section["id"] for s in sections)
    if is_parent:
        return not _matches_exclude_categories(section, exclude_embeddings, threshold, trace_id)

    return False


def _has_enough_sections(filtered_sections: list[ExtractedSectionDTO], all_sections: list[ExtractedSectionDTO]) -> bool:
    has_plan = any(s.get("is_plan") for s in filtered_sections)
    long_form_count = sum(1 for s in filtered_sections if s.get("long_form"))

    needs_writing_total = sum(1 for s in all_sections if s.get("needs_writing"))
    needs_writing_retained = sum(1 for s in filtered_sections if s.get("needs_writing"))

    retention_rate = needs_writing_retained / needs_writing_total if needs_writing_total > 0 else 1.0

    return has_plan and long_form_count >= 3 and retention_rate >= 0.5


async def filter_extracted_sections(
    sections: list[ExtractedSectionDTO], trace_id: str, initial_threshold: float = 0.9
) -> list[ExtractedSectionDTO]:
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
        if (parent_id := section.get("parent")) and parent_id not in valid_ids:
            del section["parent"]

        title = section["title"]
        if "(from:" in title and ")" in title:
            from_start = title.find("(from:")
            section["title"] = title[:from_start].strip()

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


async def handle_extract_sections(
    *,
    cfp_analysis: CFPAnalysis,
    job_manager: "JobManager[StageDTO]",
    organization_guidelines: str,
    trace_id: str,
) -> list[ExtractedSectionDTO]:
    await job_manager.ensure_not_cancelled()

    prompt = EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.to_string(
        cfp_analysis=cfp_analysis,
        organization_guidelines=organization_guidelines,
    )

    logger.info("Starting parallel section extraction", trace_id=trace_id)
    await job_manager.ensure_not_cancelled()

    structure_result, classification_result, enrichment_result = await asyncio.gather(
        extract_section_structure(prompt, trace_id=trace_id),
        extract_section_classification(prompt, trace_id=trace_id),
        extract_section_enrichment(prompt, cfp_analysis, trace_id=trace_id),
    )

    logger.info(
        "Parallel extractions completed",
        structure_sections=len(structure_result["sections"]),
        classification_sections=len(classification_result["sections"]),
        enrichment_sections=len(enrichment_result["sections"]),
        trace_id=trace_id,
    )

    sections_by_id: dict[str, dict[str, Any]] = {}

    for section in structure_result["sections"]:
        section_dict = dict(section)
        section_dict["parent"] = section_dict.pop("parent_id")
        sections_by_id[section["id"]] = section_dict

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

    for section_dict in sections_by_id.values():
        if "long_form" not in section_dict:
            section_dict["long_form"] = False
        if "needs_writing" not in section_dict:
            section_dict["needs_writing"] = True
        if "is_plan" not in section_dict:
            section_dict["is_plan"] = False

        if section_dict.get("guidelines") and not section_dict.get("definition"):
            section_dict["definition"] = create_section_definition(cast("list[str]", section_dict["guidelines"]))

    sections_missing_guidance = []
    for section_dict in sections_by_id.values():
        if section_dict.get("needs_writing") and section_dict.get("long_form"):
            has_guidelines = bool(section_dict.get("guidelines"))
            has_length = bool(section_dict.get("length_limit"))
            if not has_guidelines and not has_length:
                sections_missing_guidance.append(
                    {
                        "id": section_dict["id"],
                        "title": section_dict["title"],
                    }
                )

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

    filtered_sections = await filter_extracted_sections(extracted_sections, trace_id)

    logger.info(
        "Section extraction completed",
        sections_count=len(filtered_sections),
        sections_with_constraints=sum(1 for s in filtered_sections if s.get("length_limit")),
        sections_with_guidelines=sum(1 for s in filtered_sections if s.get("guidelines")),
        trace_id=trace_id,
    )

    return filtered_sections
