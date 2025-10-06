import asyncio
from typing import TYPE_CHECKING, TypeGuard

from packages.db.src.json_objects import CFPAnalysis, CFPConstraint, CFPSection, GrantElement, GrantLongFormSection
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.template_generation.content_metadata import (
    ContentMetadata,
    generate_content_metadata,
)
from services.rag.src.grant_template.template_generation.dependencies import (
    DependencyWordCount,
    generate_dependencies_word_counts,
)
from services.rag.src.grant_template.template_generation.length_extraction import (
    LengthConstraint,
    extract_length_constraints,
)
from services.rag.src.grant_template.template_generation.section_classification import (
    SectionClassification,
    classify_sections,
)

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import TemplateGenerationStageDTO
    from services.rag.src.utils.job_manager import JobManager


logger = get_logger(__name__)


def is_long_form_section(section: GrantElement | GrantLongFormSection) -> TypeGuard[GrantLongFormSection]:
    return "max_words" in section


def merge_and_transform(
    *,
    cfp_sections: list[CFPSection],
    classifications: list[SectionClassification],
    content_metadata: list[ContentMetadata],
    dependencies: list[DependencyWordCount],
    length_constraints: list[LengthConstraint],
) -> list[GrantElement | GrantLongFormSection]:
    classification_by_id = {c["id"]: c for c in classifications}
    length_by_id = {lc["id"]: lc for lc in length_constraints}
    content_by_id = {cm["id"]: cm for cm in content_metadata}
    dependency_by_id = {d["id"]: d for d in dependencies}

    grant_sections: list[GrantElement | GrantLongFormSection] = []

    for order, cfp_section in enumerate(cfp_sections, start=1):
        section_id = cfp_section["id"]

        cls = classification_by_id.get(section_id)
        length = length_by_id.get(section_id)
        content = content_by_id.get(section_id)
        dep = dependency_by_id.get(section_id)

        if not cls:
            logger.warning("Missing classification for section", section_id=section_id)
            continue

        if cls["title_only"]:
            grant_sections.append(
                GrantElement(
                    id=section_id,
                    order=order,
                    title=cfp_section["title"],
                    evidence="",
                    parent_id=cfp_section.get("parent_id"),
                    needs_applicant_writing=False,
                )
            )
            continue

        if not cls["long_form"]:
            grant_sections.append(
                GrantElement(
                    id=section_id,
                    order=order,
                    title=cfp_section["title"],
                    evidence="",
                    parent_id=cfp_section.get("parent_id"),
                    needs_applicant_writing=cls["needs_writing"],
                )
            )
            continue

        if not content or not dep:
            logger.warning(
                "Missing content metadata or dependencies for long-form section",
                section_id=section_id,
            )
            continue

        long_form_section = GrantLongFormSection(
            id=section_id,
            order=order,
            title=cfp_section["title"],
            evidence="",
            parent_id=cfp_section.get("parent_id"),
            needs_applicant_writing=cls["needs_writing"],
            depends_on=dep["depends_on"],
            generation_instructions=content["generation_instructions"],
            is_clinical_trial=cls["clinical"],
            is_detailed_research_plan=cls["is_plan"],
            keywords=content["keywords"],
            max_words=dep["max_words"],
            search_queries=content["search_queries"],
            topics=content["topics"],
        )

        if cls["guidelines"]:
            long_form_section["guidelines"] = cls["guidelines"]

        if cls["definition"]:
            long_form_section["definition"] = cls["definition"]

        if length:
            if length["length_limit"] is not None:
                long_form_section["length_limit"] = length["length_limit"]
            if length["length_source"] is not None:
                long_form_section["length_source"] = length["length_source"]
            if length["other_limits"]:
                long_form_section["other_limits"] = [
                    CFPConstraint(
                        constraint_type=c["type"],
                        constraint_value=c["value"],
                        source_quote=c["quote"],
                    )
                    for c in length["other_limits"]
                ]

        llm_words = dep["max_words"]
        cfp_limit = length["length_limit"] if length else None
        if cfp_limit is not None and (cfp_limit < llm_words * 0.7 or cfp_limit > llm_words * 1.5):
            logger.warning(
                "Length constraint mismatch between LLM and CFP",
                section_id=section_id,
                section_title=cfp_section["title"],
                llm_recommendation=llm_words,
                cfp_constraint=cfp_limit,
                difference_pct=int(abs(cfp_limit - llm_words) / llm_words * 100),
            )

        grant_sections.append(long_form_section)

    long_form_count = sum(1 for s in grant_sections if is_long_form_section(s))
    plan_count = sum(1 for s in grant_sections if is_long_form_section(s) and s.get("is_detailed_research_plan"))

    logger.info(
        "Merged and transformed sections to DB schema",
        total_sections=len(grant_sections),
        long_form_sections=long_form_count,
        research_plan_sections=plan_count,
    )

    return grant_sections


async def handle_template_generation(
    *,
    cfp_analysis: CFPAnalysis,
    job_manager: "JobManager[TemplateGenerationStageDTO]",
    trace_id: str,
) -> list[GrantElement | GrantLongFormSection]:
    await job_manager.ensure_not_cancelled()

    organization_guidelines = cfp_analysis["organization"]["guidelines"] if cfp_analysis["organization"] else ""
    cfp_sections = cfp_analysis["sections"]

    logger.info(
        "Starting template generation with 2-step pipeline",
        sections_count=len(cfp_sections),
        trace_id=trace_id,
    )

    logger.info("Step 1: Parallel section enrichment (classification || length extraction)", trace_id=trace_id)

    classification_result, length_result = await asyncio.gather(
        classify_sections(sections=cfp_sections, organization_guidelines=organization_guidelines, trace_id=trace_id),
        extract_length_constraints(
            sections=cfp_sections, organization_guidelines=organization_guidelines, trace_id=trace_id
        ),
    )

    logger.info(
        "Step 1 completed",
        classified_sections=len(classification_result["sections"]),
        sections_with_length_limits=sum(1 for s in length_result["sections"] if s["length_limit"] is not None),
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    logger.info("Step 2: Parallel metadata generation (content || dependencies)", trace_id=trace_id)

    content_result, dependency_result = await asyncio.gather(
        generate_content_metadata(
            sections=classification_result["sections"],
            organization_guidelines=organization_guidelines,
            trace_id=trace_id,
        ),
        generate_dependencies_word_counts(
            classification=classification_result["sections"],
            length_constraints=length_result["sections"],
            trace_id=trace_id,
        ),
    )

    logger.info(
        "Step 2 completed",
        sections_with_metadata=len(content_result["sections"]),
        sections_with_dependencies=len(dependency_result["sections"]),
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    logger.info("Step 3: Merging and transforming to DB schema", trace_id=trace_id)

    grant_sections = merge_and_transform(
        cfp_sections=cfp_sections,
        classifications=classification_result["sections"],
        length_constraints=length_result["sections"],
        content_metadata=content_result["sections"],
        dependencies=dependency_result["sections"],
    )

    logger.info(
        "Template generation completed",
        grant_sections_count=len(grant_sections),
        long_form_count=sum(1 for s in grant_sections if "max_words" in s),
        trace_id=trace_id,
    )

    return grant_sections
