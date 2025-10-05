import asyncio
from collections import defaultdict
from typing import TYPE_CHECKING, Any, cast

from packages.db.src.json_objects import CFPAnalysis, CFPAnalysisData, CFPContentSection, OrganizationNamespace
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource, TextVector
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.cfp_analysis.cfp_categories import (
    CFP_CATEGORIES_EXTRACTION_USER_PROMPT,
    extract_cfp_categories,
)
from services.rag.src.grant_template.cfp_analysis.cfp_constraints import extract_cfp_constraints
from services.rag.src.grant_template.cfp_analysis.cfp_metadata import (
    CFP_METADATA_EXTRACTION_USER_PROMPT,
    extract_cfp_metadata,
)
from services.rag.src.grant_template.cfp_analysis.cfp_structure import (
    CFP_BROAD_CONTENT_EXTRACTION_FRAGMENT,
    CFP_CONTENT_EXTRACTION_USER_PROMPT,
    CFP_DETAILED_CONTENT_EXTRACTION_FRAGMENT,
    CFP_HIERARCHICAL_CONTENT_EXTRACTION_FRAGMENT,
    CFPContentResult,
    extract_cfp_structure,
)
from services.rag.src.grant_template.identify_organization import identify_granting_institution
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt
from services.rag.src.grant_template.utils.category_extraction import categorize_text

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


def validate_section_depth_constraint(sections: list[dict[str, Any]]) -> None:
    section_map: dict[str, dict[str, Any]] = {section["id"]: section for section in sections}

    for section in sections:
        parent_id = section.get("parent_id")

        if not parent_id:
            continue

        if parent_id not in section_map:
            raise ValidationError(
                f"Section '{section['title']}' references non-existent parent_id: {parent_id}",
                context={
                    "section_id": section["id"],
                    "section_title": section["title"],
                    "invalid_parent_id": parent_id,
                    "recovery_instruction": "Ensure all parent_id references point to existing sections.",
                },
            )

        parent_section = section_map[parent_id]
        if parent_section.get("parent_id"):
            raise ValidationError(
                f"Section '{section['title']}' has grandparent (violates 2-level depth constraint). "
                f"Parent '{parent_section['title']}' has parent_id: {parent_section['parent_id']}",
                context={
                    "section_id": section["id"],
                    "section_title": section["title"],
                    "parent_id": parent_id,
                    "parent_title": parent_section["title"],
                    "grandparent_id": parent_section["parent_id"],
                    "recovery_instruction": "Flatten or merge sections to satisfy 2-level depth constraint (root + children only).",
                },
            )


def calculate_section_similarity(section1: CFPContentSection, section2: CFPContentSection) -> float:
    title1 = section1["title"].lower()
    title2 = section2["title"].lower()

    words1 = set(title1.split())
    words2 = set(title2.split())

    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0

    intersection = words1.intersection(words2)
    union = words1.union(words2)

    return len(intersection) / len(union)


def merge_similar_sections(
    sections: list[CFPContentSection], similarity_threshold: float = 0.6
) -> list[CFPContentSection]:
    merged = []
    used_indices = set()

    for i, section in enumerate(sections):
        if i in used_indices:
            continue

        merged_section: CFPContentSection = {
            "title": section["title"],
            "subtitles": list(section["subtitles"]),
        }
        used_indices.add(i)

        for j, other_section in enumerate(sections[i + 1 :], i + 1):
            if j in used_indices:
                continue

            similarity = calculate_section_similarity(section, other_section)
            if similarity >= similarity_threshold:
                existing_subtitles = set(merged_section["subtitles"])
                for subtitle in other_section["subtitles"]:
                    if subtitle not in existing_subtitles:
                        merged_section["subtitles"].append(subtitle)
                        existing_subtitles.add(subtitle)
                used_indices.add(j)

        merged.append(merged_section)

    return merged


def validate_semantic_completeness(result: CFPContentResult) -> dict[str, Any]:
    sections = result["sections"]
    all_text = " ".join([section["title"] + " " + " ".join(section["subtitles"]) for section in sections]).lower()

    concept_patterns = {
        "funding": ["fund", "budget", "cost", "money", "dollar", "award", "grant"],
        "eligibility": ["eligible", "qualify", "requirement", "criteria", "must", "should"],
        "application": ["apply", "submit", "proposal", "application", "deadline", "due"],
        "awards": ["award", "grant", "prize", "funding", "opportunity"],
        "process": ["process", "review", "evaluation", "selection", "timeline"],
        "requirements": ["require", "needed", "necessary", "mandatory", "document"],
    }

    coverage = {}
    for concept, patterns in concept_patterns.items():
        found = any(pattern in all_text for pattern in patterns)
        coverage[concept] = found

    coverage_score = sum(coverage.values()) / len(coverage.values())

    return {
        "coverage_score": coverage_score,
        "coverage_details": coverage,
        "total_sections": len(sections),
        "total_subtitles": sum(len(section["subtitles"]) for section in sections),
        "avg_subtitles_per_section": sum(len(section["subtitles"]) for section in sections) / len(sections)
        if sections
        else 0,
    }


def merge_cfp_extractions(
    broad: CFPContentResult,
    detailed: CFPContentResult,
    hierarchical: CFPContentResult,
) -> tuple[CFPContentResult, dict[str, Any]]:
    all_sections = [*broad["sections"], *detailed["sections"], *hierarchical["sections"]]

    merged_sections = merge_similar_sections(all_sections)

    merged_result = CFPContentResult(sections=merged_sections)

    quality_metrics = validate_semantic_completeness(merged_result)

    quality_metrics["strategy_counts"] = {
        "broad": len(broad["sections"]),
        "detailed": len(detailed["sections"]),
        "hierarchical": len(hierarchical["sections"]),
        "merged": len(merged_sections),
    }

    return merged_result, quality_metrics


async def handle_prepare_context(
    *,
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
) -> tuple[
    list[RagSourceData],
    list[OrganizationNamespace],
]:
    async with session_maker() as session:
        source_ids = list(
            await session.scalars(
                select(RagSource.id)
                .join(GrantTemplateSource, RagSource.id == GrantTemplateSource.rag_source_id)
                .where(GrantTemplateSource.grant_template_id == grant_template.id)
                .where(RagSource.indexing_status == "FINISHED")
                .where(RagSource.deleted_at.is_(None))
            )
        )

        if not source_ids:
            raise ValidationError(
                "No finished RAG sources found for grant template",
                context={"grant_template_id": str(grant_template.id)},
            )

        # TODO: refactor to create list[RagSourceData] already here
        sources_result = await session.execute(
            select(RagSource.id, RagSource.source_type, RagSource.text_content)
            .where(RagSource.id.in_(source_ids))
            .where(RagSource.deleted_at.is_(None))
        )
        sources = sources_result.fetchall()

        chunks_result = list(
            await session.scalars(
                select(TextVector.rag_source_id, TextVector.chunk)
                .where(TextVector.rag_source_id.in_(source_ids))
                .where(TextVector.deleted_at.is_(None))
            )
        )

        chunks_by_source: defaultdict[str, list[str]] = defaultdict(list)
        for row in chunks_result:
            chunk_content = row.chunk.get("content", "") if isinstance(row.chunk, dict) else str(row.chunk)
            chunks_by_source[str(row.rag_source_id)].append(chunk_content)

        institutions = list(await session.scalars(select(GrantingInstitution)))

    rag_sources: list[RagSourceData] = []
    for source in sources:
        source_id = str(source.id)
        text_content = source.text_content or ""
        chunks = chunks_by_source.get(source_id, [])

        nlp_analysis = await categorize_text(text_content)

        rag_sources.append(
            RagSourceData(
                source_id=source_id,
                source_type=source.source_type,
                text_content=text_content,
                chunks=chunks,
                nlp_analysis=nlp_analysis,
            )
        )

    return rag_sources, [
        OrganizationNamespace(
            id=str(org.id),
            full_name=org.full_name,
            abbreviation=org.abbreviation or "",
        )
        for org in institutions
    ]


async def handle_cfp_analysis(
    *,
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    job_manager: "JobManager[Any]",
    trace_id: str,
) -> CFPAnalysis:
    await job_manager.ensure_not_cancelled()

    logger.info("Starting comprehensive CFP analysis", trace_id=trace_id)

    rag_sources, organizations = await handle_prepare_context(
        grant_template=grant_template,
        session_maker=session_maker,
    )

    await job_manager.ensure_not_cancelled()

    formatted_sources = format_rag_sources_for_prompt(rag_sources)
    formatted_org_mapping = "\n".join(
        f"- {organization_namespace['id']}: {organization_namespace['full_name']} ({organization_namespace['abbreviation']})"
        for organization_namespace in organizations
    )

    logger.info("Starting multi-strategy CFP extractions", trace_id=trace_id)

    (
        metadata_result,
        categories_result,
        constraints_result,
        content_hierarchical,
        content_broad,
        content_detailed,
    ) = await asyncio.gather(
        # TODO:
        # 1. use anyio taskgroups with cancellation.
        # 2. consider using batching - if we hit ratelimits too often
        # 3. we have to do some json evaluation of the outputs
        extract_cfp_metadata(
            CFP_METADATA_EXTRACTION_USER_PROMPT.to_string(
                rag_sources=formatted_sources,
                organization_mapping=formatted_org_mapping,
            ),
            trace_id=trace_id,
        ),
        extract_cfp_categories(
            CFP_CATEGORIES_EXTRACTION_USER_PROMPT.to_string(rag_sources=rag_sources), trace_id=trace_id
        ),
        extract_cfp_constraints(
            CFP_CATEGORIES_EXTRACTION_USER_PROMPT.to_string(rag_sources=rag_sources), trace_id=trace_id
        ),
        extract_cfp_structure(
            CFP_CONTENT_EXTRACTION_USER_PROMPT.to_string(
                rag_sources=formatted_sources, task=CFP_HIERARCHICAL_CONTENT_EXTRACTION_FRAGMENT
            ),
            trace_id=trace_id,
        ),
        extract_cfp_structure(
            CFP_CONTENT_EXTRACTION_USER_PROMPT.to_string(
                rag_sources=formatted_sources, task=CFP_DETAILED_CONTENT_EXTRACTION_FRAGMENT
            ),
            trace_id=trace_id,
        ),
        extract_cfp_structure(
            CFP_CONTENT_EXTRACTION_USER_PROMPT.to_string(
                rag_sources=formatted_sources, task=CFP_BROAD_CONTENT_EXTRACTION_FRAGMENT
            ),
            trace_id=trace_id,
        ),
    )

    await job_manager.ensure_not_cancelled()

    logger.info("Merging multi-strategy content extractions", trace_id=trace_id)
    content_result, quality_metrics = merge_cfp_extractions(
        content_broad,
        content_detailed,
        content_hierarchical,
    )

    logger.info(
        "Multi-strategy extraction completed",
        quality_metrics=quality_metrics,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    org_id = metadata_result["org_id"]
    if not org_id:
        logger.info("Organization not identified in extraction, using hybrid identification", trace_id=trace_id)

        full_cfp_text = "\n\n".join(source["text_content"] for source in rag_sources if source["text_content"])

        org_id, confidence, method = await identify_granting_institution(
            cfp_text=full_cfp_text,
            session_maker=session_maker,
            trace_id=trace_id,
        )

        if confidence < 0.0 or confidence > 1.0:
            raise ValidationError(
                "Organization identification confidence out of valid range",
                context={
                    "confidence": confidence,
                    "valid_range": "[0.0, 1.0]",
                    "org_id": org_id,
                    "method": method,
                    "recovery_instruction": "Ensure confidence score is between 0.0 and 1.0",
                },
            )

        if org_id and confidence < 0.5:
            logger.warning(
                "Organization identified with low confidence",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

        if org_id and confidence >= 0.85:
            logger.info(
                "Organization identified via hybrid method",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

    total_sections = len(content_result["sections"])
    total_requirements = sum(cat["count"] for cat in categories_result["categories"])
    source_count = len(rag_sources)

    analysis_metadata = {
        "categories": categories_result["categories"],
        "constraints": constraints_result["constraints"],
        "metadata": {
            "total_sections": total_sections,
            "total_requirements": total_requirements,
            "source_count": source_count,
        },
    }

    organization = None
    if org_id and (orgs := [org for org in organizations if org["id"] == org_id]):
        organization = orgs[0]

    cfp_analysis = CFPAnalysis(
        subject=metadata_result["subject"],
        content=content_result["sections"],
        deadline=metadata_result["deadline"],
        org_id=org_id,
        analysis_metadata=cast("CFPAnalysisData", analysis_metadata),
        organization=organization,
    )

    logger.info(
        "CFP analysis completed successfully",
        sections_count=total_sections,
        org_id=org_id,
        has_deadline=bool(metadata_result["deadline"]),
        categories_found=len(categories_result["categories"]),
        trace_id=trace_id,
    )

    return cfp_analysis
