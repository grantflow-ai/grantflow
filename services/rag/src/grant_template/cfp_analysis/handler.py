import asyncio
import re
from collections import defaultdict
from typing import TYPE_CHECKING, Any

from packages.db.src.json_objects import (
    CFPAnalysis,
    CFPAnalysisData,
    CFPContentSection,
    CFPSection,
    OrganizationNamespace,
)
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource, TextVector
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.cfp_analysis.cfp_categories import extract_cfp_categories
from services.rag.src.grant_template.cfp_analysis.cfp_constraints import extract_cfp_constraints
from services.rag.src.grant_template.cfp_analysis.cfp_metadata import (
    CFP_METADATA_EXTRACTION_USER_PROMPT,
    CFPMetadataResult,
    extract_cfp_metadata,
)
from services.rag.src.grant_template.cfp_analysis.cfp_structure import (
    extract_cfp_structure,
    validate_and_refine_cfp_structure,
)
from services.rag.src.grant_template.cfp_analysis.identify_organization import identify_granting_institution
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt
from services.rag.src.grant_template.utils.category_extraction import categorize_text

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager

SNAKE_CASE_PATTERN_1 = re.compile(r"(.)([A-Z][a-z]+)")
SNAKE_CASE_PATTERN_2 = re.compile(r"([a-z0-9])([A-Z])")

logger = get_logger(__name__)


async def handle_prepare_context(
    *,
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
) -> tuple[list[RagSourceData], list[OrganizationNamespace], str]:
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

    nlp_analyses = await asyncio.gather(*[categorize_text(source.text_content or "") for source in sources])

    rag_sources: list[RagSourceData] = [
        RagSourceData(
            source_id=str(source.id),
            source_type=source.source_type,
            text_content=source.text_content or "",
            chunks=chunks_by_source.get(str(source.id), []),
            nlp_analysis=nlp_analysis,
        )
        for source, nlp_analysis in zip(sources, nlp_analyses, strict=True)
    ]

    full_cfp_text = "\n\n".join(source["text_content"] for source in rag_sources if source["text_content"])

    return (
        rag_sources,
        [
            OrganizationNamespace(
                id=str(org.id),
                full_name=org.full_name,
                abbreviation=org.abbreviation or "",
            )
            for org in institutions
        ],
        full_cfp_text,
    )


def _to_snake_case(text: str) -> str:
    s1 = SNAKE_CASE_PATTERN_1.sub(r"\1_\2", text)
    return SNAKE_CASE_PATTERN_2.sub(r"\1_\2", s1).lower().replace(" ", "_")


def _generate_unique_id(title: str, id_counts: defaultdict[str, int]) -> str:
    base_id = _to_snake_case(title)
    count = id_counts[base_id]
    id_counts[base_id] += 1
    if count > 0:
        return f"{base_id}_{count}"
    return base_id


def create_flat_sections(cfp_content: list[CFPContentSection]) -> list[CFPSection]:
    sections: list[CFPSection] = []
    id_counts: defaultdict[str, int] = defaultdict(int)

    for content_section in cfp_content:
        parent_id = _generate_unique_id(content_section["title"], id_counts)
        sections.append(
            CFPSection(
                title=content_section["title"],
                subtitles=[],
                id=parent_id,
                parent_id=None,
            )
        )
        sections.extend(
            CFPSection(
                title=subtitle,
                subtitles=[],
                id=_generate_unique_id(subtitle, id_counts),
                parent_id=parent_id,
            )
            for subtitle in content_section["subtitles"]
        )
    return sections


async def handle_extract_sections(
    *,
    formatted_sources: str,
    trace_id: str,
) -> list[CFPSection]:
    logger.info("Extracting CFP sections (step 1: initial extraction)", trace_id=trace_id)
    initial_result = await extract_cfp_structure(
        formatted_sources=formatted_sources,
        trace_id=trace_id,
    )

    logger.info(
        "Validating and refining sections (step 2: gap fill + dedup)",
        initial_count=len(initial_result["sections"]),
        trace_id=trace_id,
    )
    refined_result = await validate_and_refine_cfp_structure(
        formatted_sources=formatted_sources,
        existing_sections=initial_result["sections"],
        trace_id=trace_id,
    )

    logger.info(
        "Section extraction completed",
        initial_sections=len(initial_result["sections"]),
        final_sections=len(refined_result["sections"]),
        trace_id=trace_id,
    )

    return create_flat_sections(refined_result["sections"])


async def handle_extract_metadata(
    *,
    formatted_sources: str,
    full_cfp_text: str,
    organizations: list[OrganizationNamespace],
    trace_id: str,
) -> CFPMetadataResult:
    metadata_result = await extract_cfp_metadata(
        CFP_METADATA_EXTRACTION_USER_PROMPT.to_string(
            rag_sources=formatted_sources,
            organizations=organizations,
        ),
        trace_id=trace_id,
    )

    if not metadata_result["org_id"]:
        logger.info("Organization not identified in extraction, using hybrid identification", trace_id=trace_id)

        org_id, confidence, method = await identify_granting_institution(
            cfp_text=full_cfp_text,
            organizations=organizations,
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
            metadata_result["org_id"] = org_id
            logger.info(
                "Organization identified via hybrid method",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

    return metadata_result


async def handle_cfp_analysis(
    *,
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    job_manager: "JobManager[Any]",
    trace_id: str,
) -> CFPAnalysis:
    await job_manager.ensure_not_cancelled()

    logger.info("Starting comprehensive CFP analysis", trace_id=trace_id)

    rag_sources, organizations, full_cfp_text = await handle_prepare_context(
        grant_template=grant_template,
        session_maker=session_maker,
    )

    await job_manager.ensure_not_cancelled()

    formatted_sources = format_rag_sources_for_prompt(rag_sources)

    logger.info("Extracting and structuring CFP content", trace_id=trace_id)
    content_sections = await handle_extract_sections(
        formatted_sources=formatted_sources,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    logger.info("Starting detailed parallel analysis", trace_id=trace_id)
    (metadata_result, categories_result, constraints_result) = await asyncio.gather(
        handle_extract_metadata(
            full_cfp_text=full_cfp_text,
            formatted_sources=formatted_sources,
            organizations=organizations,
            trace_id=trace_id,
        ),
        extract_cfp_categories(rag_sources=formatted_sources, sections=content_sections, trace_id=trace_id),
        extract_cfp_constraints(rag_sources=formatted_sources, sections=content_sections, trace_id=trace_id),
    )

    await job_manager.ensure_not_cancelled()

    sections_map = {section["id"]: section for section in content_sections}
    for categorized_section in categories_result["sections"]:
        if section := sections_map.get(categorized_section["id"]):
            section["categories"] = categorized_section["categories"]

    for constrained_section in constraints_result["sections"]:
        if section := sections_map.get(constrained_section["id"]):
            section["constraints"] = constrained_section["constraints"]

    final_content = list(sections_map.values())

    all_categories = [
        category for section in final_content if section.get("categories") for category in section["categories"]
    ]
    all_constraints = [
        constraint for section in final_content if section.get("constraints") for constraint in section["constraints"]
    ]

    total_sections = len(final_content)
    total_requirements = len(all_constraints)
    source_count = len(rag_sources)

    organization = None
    if metadata_result["org_id"] and (orgs := [org for org in organizations if org["id"] == metadata_result["org_id"]]):
        organization = orgs[0]

    logger.info(
        "CFP analysis completed successfully",
        sections_count=total_sections,
        organization=organization,
        has_deadline=bool(metadata_result["deadline"]),
        categories_found=len(all_categories),
        constraints_found=total_requirements,
        trace_id=trace_id,
    )

    return CFPAnalysis(
        subject=metadata_result["subject"],
        content=final_content,
        deadline=metadata_result["deadline"],
        analysis_metadata=CFPAnalysisData(
            categories=all_categories,
            constraints=all_constraints,
            metadata={
                "total_sections": total_sections,
                "total_requirements": total_requirements,
                "source_count": source_count,
            },
        ),
        organization=organization,
    )
