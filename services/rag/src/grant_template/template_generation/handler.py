import asyncio
from typing import TYPE_CHECKING, TypeGuard

from packages.db.src.json_objects import CFPAnalysis, CFPSection, GrantElement, GrantLongFormSection, LengthConstraint
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.template_generation.content_metadata import (
    ContentMetadata,
    generate_content_metadata,
)
from services.rag.src.grant_template.template_generation.dependencies import (
    SectionDependency,
    generate_section_dependencies,
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
    return "generation_instructions" in section and "search_queries" in section


def merge_and_transform(
    *,
    cfp_sections: list[CFPSection],
    classifications: list[SectionClassification],
    content_metadata: list[ContentMetadata],
    dependencies: list[SectionDependency],
) -> list[GrantElement | GrantLongFormSection]:
    classification_by_id = {c["id"]: c for c in classifications}
    content_by_id = {cm["id"]: cm for cm in content_metadata}
    dependency_by_id = {d["id"]: d for d in dependencies}
    length_by_id = {section["id"]: section.get("length_constraint") for section in cfp_sections}

    plan_section_ids = [section["id"] for section in classifications if section["is_plan"]]
    if len(plan_section_ids) != 1:
        raise ValidationError(
            "Template generation requires exactly one research plan section",
            context={"plan_section_ids": plan_section_ids},
        )
    plan_section_id = plan_section_ids[0]

    grant_sections: list[GrantElement | GrantLongFormSection] = []

    for order, cfp_section in enumerate(cfp_sections, start=1):
        section_id = cfp_section["id"]

        cls = classification_by_id.get(section_id)
        length_constraint: LengthConstraint | None = length_by_id.get(section_id)
        content = content_by_id.get(section_id)
        dep = dependency_by_id.get(section_id)

        if not cls:
            logger.warning("Missing classification for section", section_id=section_id)
            continue

        is_plan_section = cls["is_plan"]
        needs_writing = cls["needs_writing"] or is_plan_section
        is_long_form = cls["long_form"] or is_plan_section

        if cls["title_only"]:
            if is_plan_section:
                raise ValidationError(
                    "Research plan section cannot be title-only",
                    context={"section_id": section_id, "section_title": cfp_section["title"]},
                )
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

        if not is_long_form:
            grant_sections.append(
                GrantElement(
                    id=section_id,
                    order=order,
                    title=cfp_section["title"],
                    evidence="",
                    parent_id=cfp_section.get("parent_id"),
                    needs_applicant_writing=needs_writing,
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
            needs_applicant_writing=needs_writing,
            depends_on=dep["depends_on"],
            generation_instructions=content["generation_instructions"],
            is_clinical_trial=cls["clinical"],
            is_detailed_research_plan=is_plan_section,
            keywords=content["keywords"],
            search_queries=content["search_queries"],
            topics=content["topics"],
        )

        if cls["guidelines"]:
            long_form_section["guidelines"] = cls["guidelines"]

        if cls["definition"]:
            long_form_section["definition"] = cls["definition"]

        if length_constraint:
            long_form_section["length_constraint"] = length_constraint

        grant_sections.append(long_form_section)

    long_form_count = sum(1 for s in grant_sections if is_long_form_section(s))
    plan_sections = [s for s in grant_sections if is_long_form_section(s) and s.get("is_detailed_research_plan")]

    if len(plan_sections) != 1:
        raise ValidationError(
            "Exactly one long-form research plan section must be present after merging",
            context={
                "plan_section_ids": [s["id"] for s in plan_sections],
                "expected_plan_section": plan_section_id,
            },
        )

    logger.info(
        "Merged and transformed sections to DB schema",
        total_sections=len(grant_sections),
        long_form_sections=long_form_count,
        research_plan_sections=len(plan_sections),
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

    logger.info("Step 1: Classifying sections", trace_id=trace_id)

    classification_result = await classify_sections(
        sections=cfp_sections, organization_guidelines=organization_guidelines, trace_id=trace_id
    )

    logger.info(
        "Section classification completed",
        classified_sections=len(classification_result["sections"]),
        sections_with_length_constraints=sum(1 for s in cfp_sections if s.get("length_constraint") is not None),
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
        generate_section_dependencies(classification=classification_result["sections"], trace_id=trace_id),
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
        content_metadata=content_result["sections"],
        dependencies=dependency_result["sections"],
    )

    logger.info(
        "Template generation completed",
        grant_sections_count=len(grant_sections),
        long_form_count=sum(1 for s in grant_sections if is_long_form_section(s)),
        trace_id=trace_id,
    )

    return grant_sections
