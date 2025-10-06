import asyncio
from collections import defaultdict
from typing import TYPE_CHECKING, Any

from packages.db.src.json_objects import (
    CFPAnalysis,
    CFPSection,
    OrganizationNamespace,
)
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource, TextVector
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.cfp_analysis.application_structure import (
    extract_cfp_structure,
    validate_and_refine_cfp_structure,
)
from services.rag.src.grant_template.cfp_analysis.metadata_extraction import (
    extract_metadata_with_org_identification,
)
from services.rag.src.grant_template.cfp_analysis.section_enrichment import (
    enrich_sections,
    validate_and_refine_enrichment,
)
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt
from services.rag.src.grant_template.utils.category_extraction import categorize_text

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager

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




async def handle_extract_sections(
    *,
    formatted_sources: str,
    trace_id: str,
) -> list[CFPSection]:
    """2-step section extraction: extract → validate."""
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

    return refined_result["sections"]


async def handle_enrich_sections(
    *,
    formatted_sources: str,
    sections: list[CFPSection],
    trace_id: str,
) -> list[CFPSection]:
    """2-step section enrichment: enrich → validate."""
    logger.info("Enriching sections with categories/constraints (step 1)", trace_id=trace_id)
    enriched = await enrich_sections(
        formatted_sources=formatted_sources,
        sections=sections,
        trace_id=trace_id,
    )

    logger.info("Validating and refining enrichment (step 2)", trace_id=trace_id)
    validated = await validate_and_refine_enrichment(
        formatted_sources=formatted_sources,
        enriched_sections=enriched["sections"],
        trace_id=trace_id,
    )

    logger.info("Section enrichment completed", sections_count=len(validated["sections"]), trace_id=trace_id)
    return validated["sections"]




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
    metadata_result, enriched_sections = await asyncio.gather(
        extract_metadata_with_org_identification(
            full_cfp_text=full_cfp_text,
            formatted_sources=formatted_sources,
            organizations=organizations,
            trace_id=trace_id,
        ),
        handle_enrich_sections(
            formatted_sources=formatted_sources,
            sections=content_sections,
            trace_id=trace_id,
        ),
    )

    await job_manager.ensure_not_cancelled()

    organization = None
    if metadata_result["org_id"] and (orgs := [org for org in organizations if org["id"] == metadata_result["org_id"]]):
        organization = orgs[0]

    logger.info(
        "CFP analysis completed successfully",
        sections_count=len(enriched_sections),
        organization=organization,
        deadlines_found=len(metadata_result["deadlines"]),
        global_constraints_found=len(metadata_result["constraints"]),
        trace_id=trace_id,
    )

    return CFPAnalysis(
        subject=metadata_result["subject"],
        content=enriched_sections,
        deadlines=metadata_result["deadlines"],
        global_constraints=metadata_result["constraints"],
        organization=organization,
    )
