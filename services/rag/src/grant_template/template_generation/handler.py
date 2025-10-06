import asyncio
from typing import TYPE_CHECKING

from packages.db.src.json_objects import CFPAnalysis, GrantElement, GrantLongFormSection
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.template_generation.content_metadata import generate_content_metadata
from services.rag.src.grant_template.template_generation.dependencies import generate_dependencies_word_counts
from services.rag.src.grant_template.template_generation.length_extraction import extract_length_constraints
from services.rag.src.grant_template.template_generation.merge_sections import merge_and_transform
from services.rag.src.grant_template.template_generation.section_classification import classify_sections

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


async def handle_template_generation(
    *,
    cfp_analysis: CFPAnalysis,
    organization_guidelines: str,
    job_manager: "JobManager[object]",
    trace_id: str,
) -> list[GrantElement | GrantLongFormSection]:
    await job_manager.ensure_not_cancelled()

    cfp_sections = cfp_analysis["sections"]

    logger.info(
        "Starting template generation with 2-step pipeline",
        sections_count=len(cfp_sections),
        trace_id=trace_id,
    )

    logger.info("Step 1: Parallel section enrichment (classification || length extraction)", trace_id=trace_id)

    classification_result, length_result = await asyncio.gather(
        classify_sections(cfp_sections, organization_guidelines, trace_id=trace_id),
        extract_length_constraints(cfp_sections, organization_guidelines, trace_id=trace_id),
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
            classification_result["sections"],
            organization_guidelines,
            trace_id=trace_id,
        ),
        generate_dependencies_word_counts(
            classification_result["sections"],
            length_result["sections"],
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
