import asyncio
import re
from collections import defaultdict
from typing import TYPE_CHECKING, Any, Final, cast

from packages.db.src.json_objects import (
    CFPAnalysis,
    CFPContentSection,
)
from packages.shared_utils.src.dto import ExtractedSectionDTO
from packages.shared_utils.src.embeddings import get_embedding_model
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.sync import run_sync
from sentence_transformers import util

from services.rag.src.grant_template.extract_sections.section_classification import (
    classify_writing_requirements,
)
from services.rag.src.grant_template.extract_sections.section_enrichment import enrich_with_details
from services.rag.src.grant_template.extract_sections.section_structure import (
    DefinedSection,
    structure_and_classify_sections,
)

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

exclude_embeddings_ref = Ref[list[float]]()

logger = get_logger(__name__)

WORD_LIMIT_TOLERANCE: Final[float] = 0.1
WORDS_PER_PAGE: Final[int] = 250
CHARS_PER_WORD: Final[int] = 6

SNAKE_CASE_PATTERN_1 = re.compile(r"(.)([A-Z][a-z]+)")
SNAKE_CASE_PATTERN_2 = re.compile(r"([a-z0-9])([A-Z])")

EXCLUDE_CATEGORIES: Final[list[str]] = [
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


EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES: Final[list[str]] = [
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


def _matches_exclude_categories(
    section: ExtractedSectionDTO,
    exclude_embeddings: list[float],
    threshold: float,
) -> bool:
    normalized_title = section["title"].lower().strip()
    for category in EXCLUDE_CATEGORIES:
        normalized_category = category.lower().strip()
        if normalized_category in normalized_title or normalized_title in normalized_category:
            return True

    model = get_embedding_model()
    title_embedding = model.encode(section["title"], convert_to_tensor=True, device="cpu")

    similarities = util.cos_sim(title_embedding, exclude_embeddings)
    if similarities is not None and len(similarities) > 0:
        max_similarity = float(similarities[0].max().item())
        return max_similarity >= threshold

    return False


def _should_keep_section(
    section: ExtractedSectionDTO,
    sections: list[ExtractedSectionDTO],
    threshold: float,
    exclude_embeddings: list[float],
) -> bool:
    if any(
        section.get(key)
        for key in (
            "is_plan",
            "long_form",
            "needs_writing",
            "length_limit",
            "other_limits",
            "guidelines",
        )
    ):
        return True

    has_long_form_children = any(s.get("parent") == section["id"] and s.get("long_form") for s in sections)
    if has_long_form_children:
        return True

    is_parent = any(s.get("parent") == section["id"] for s in sections)
    if is_parent:
        return not _matches_exclude_categories(section, exclude_embeddings, threshold)

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
        if any(section.get(key) for key in ("is_plan", "long_form", "needs_writing", "length_limit", "guidelines"))
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


def to_snake_case(text: str) -> str:
    s1 = SNAKE_CASE_PATTERN_1.sub(r"\1_\2", text)
    return SNAKE_CASE_PATTERN_2.sub(r"\1_\2", s1).lower().replace(" ", "_")


def generate_unique_id(title: str) -> str:
    id_counts: defaultdict[str, int] = defaultdict(int)

    base_id = to_snake_case(title)
    count = id_counts[base_id]
    id_counts[base_id] += 1
    if count > 0:
        return f"{base_id}_{count}"
    return base_id


def create_section_definitions(cfp_content: list[CFPContentSection]) -> list[DefinedSection]:
    sections: list[DefinedSection] = []
    for content_section in cfp_content:
        parent_id = generate_unique_id(content_section["title"])
        sections.append(DefinedSection(title=content_section["title"], id=parent_id, parent_id=None))
        sections.extend(
            [
                DefinedSection(title=subtitle, id=generate_unique_id(subtitle), parent_id=parent_id)
                for subtitle in content_section["subtitles"]
            ]
        )
    return sections


async def handle_extract_sections(
    *,
    cfp_analysis: CFPAnalysis,
    job_manager: "JobManager[StageDTO]",
    organization_guidelines: str,
    trace_id: str,
) -> list[ExtractedSectionDTO]:
    await job_manager.ensure_not_cancelled()

    logger.info("Defining section structure from CFP content", trace_id=trace_id)
    defined_sections = create_section_definitions(cfp_analysis["content"])

    logger.info("Structuring and classifying sections", trace_id=trace_id)
    structured_sections = await structure_and_classify_sections(
        sections=defined_sections,
        cfp_analysis=cfp_analysis,
        trace_id=trace_id,
    )

    logger.info("Classifying writing requirements and enriching with details in parallel", trace_id=trace_id)

    classification_results, enrichment_results = await asyncio.gather(
        classify_writing_requirements(
            sections=structured_sections,
            cfp_analysis=cfp_analysis,
            organization_guidelines=organization_guidelines,
            trace_id=trace_id,
        ),
        enrich_with_details(
            sections=structured_sections,
            cfp_analysis=cfp_analysis,
            trace_id=trace_id,
        ),
    )

    classification_map = {item["id"]: item for item in classification_results}
    enrichment_map = {item["id"]: item for item in enrichment_results}

    final_sections: list[ExtractedSectionDTO] = []
    for section in structured_sections:
        section_id = section["id"]
        merged_section: dict[str, Any] = dict(section)

        if classification := classification_map.get(section_id):
            classification_copy = dict(**classification)
            classification_copy.pop("id", None)
            merged_section.update(classification_copy)

        if enrichment := enrichment_map.get(section_id):
            enrichment_copy = dict(**enrichment)
            enrichment_copy.pop("id", None)
            merged_section.update(enrichment_copy)

        final_sections.append(cast("ExtractedSectionDTO", merged_section))

    logger.info(
        "Merged extraction results",
        total_sections=len(final_sections),
        sections_with_length_limits=sum(1 for s in final_sections if s.get("length_limit")),
        sections_with_guidelines=sum(1 for s in final_sections if s.get("guidelines")),
        trace_id=trace_id,
    )

    filtered_sections = await filter_extracted_sections(final_sections, trace_id)

    logger.info(
        "Section extraction completed",
        sections_count=len(filtered_sections),
        sections_with_constraints=sum(1 for s in filtered_sections if s.get("length_limit")),
        sections_with_guidelines=sum(1 for s in filtered_sections if s.get("guidelines")),
        trace_id=trace_id,
    )

    return filtered_sections
