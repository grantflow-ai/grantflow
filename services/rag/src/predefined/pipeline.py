from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import uuid4

import sqlalchemy as sa
from packages.db.src.connection import get_session_maker
from packages.db.src.enums import GrantType
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, OrganizationNamespace
from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from packages.shared_utils.src.extraction import extract_file_content
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import delete, select

from services.rag.src.grant_template.cfp_analysis.handler import handle_enrich_sections, handle_extract_sections
from services.rag.src.grant_template.cfp_analysis.metadata_extraction import extract_metadata_with_org_identification
from services.rag.src.grant_template.template_generation.content_metadata import generate_content_metadata
from services.rag.src.grant_template.template_generation.dependencies import generate_section_dependencies
from services.rag.src.grant_template.template_generation.handler import merge_and_transform
from services.rag.src.grant_template.template_generation.section_classification import classify_sections
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt
from services.rag.src.grant_template.utils.category_extraction import categorize_text
from services.rag.src.utils.shared_prompts import ORGANIZATION_GUIDELINES_FRAGMENT

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from services.rag.src.predefined.manifest import TemplateSpec

logger = get_logger(__name__)


def _resolve_grant_type(value: str) -> GrantType:
    try:
        return GrantType[value.upper()]
    except KeyError:
        logger.warning("Unknown grant type, defaulting to RESEARCH", grant_type=value)
        return GrantType.RESEARCH


@dataclass(slots=True)
class GuidelineData:
    rag_sources: list[RagSourceData]
    full_text: str
    organization_guidelines: str


async def ensure_granting_institution(
    session_maker: async_sessionmaker[Any],
    *,
    spec: TemplateSpec,
) -> GrantingInstitution:
    async with session_maker() as session, session.begin():
        institution: GrantingInstitution | None = await session.scalar(
            select(GrantingInstitution).where(GrantingInstitution.full_name == spec.granting_institution_full_name)
        )

        if institution:
            return institution

        institution = GrantingInstitution(
            full_name=spec.granting_institution_full_name,
            abbreviation=spec.granting_institution_abbreviation,
        )
        session.add(institution)
        await session.flush()
        await session.refresh(institution)
        logger.info(
            "Created granting institution for predefined template generation",
            institution_id=str(institution.id),
            institution_name=institution.full_name,
        )
        return institution


async def load_guideline_data(spec: TemplateSpec) -> GuidelineData:
    content_bytes = Path(spec.guideline_source).read_bytes()
    text, _, chunks, _ = await extract_file_content(
        content=content_bytes,
        mime_type="application/pdf" if spec.guideline_source.suffix.lower() == ".pdf" else "text/plain",
        enable_chunking=True,
        enable_token_reduction=True,
        enable_document_classification=False,
    )

    nlp_analysis = await categorize_text(text)

    rag_sources: list[RagSourceData] = [
        RagSourceData(
            source_id=spec.key,
            source_type="guideline",
            text_content=text,
            chunks=chunks or [],
            nlp_analysis=nlp_analysis,
        )
    ]

    organization_guidelines = ORGANIZATION_GUIDELINES_FRAGMENT.to_string(
        rag_results="\n\n".join((chunks or [])[:5]) or text[:5000],
        organization_full_name=spec.granting_institution_full_name,
        organization_abbreviation=spec.granting_institution_abbreviation,
    )

    return GuidelineData(rag_sources=rag_sources, full_text=text, organization_guidelines=organization_guidelines)


async def analyze_guideline(
    *,
    guideline: GuidelineData,
    institution: GrantingInstitution,
    trace_id: str,
) -> tuple[dict[str, Any], list[OrganizationNamespace]]:
    formatted_sources = format_rag_sources_for_prompt(guideline.rag_sources)
    cfp_categories = await categorize_text(guideline.full_text)

    organizations: list[OrganizationNamespace] = [
        OrganizationNamespace(
            id=str(institution.id),
            full_name=institution.full_name,
            abbreviation=institution.abbreviation or "",
        )
    ]

    metadata_result = await extract_metadata_with_org_identification(
        full_cfp_text=guideline.full_text,
        formatted_sources=formatted_sources,
        organizations=organizations,
        cfp_categories=cfp_categories,
        trace_id=trace_id,
    )

    organization: OrganizationNamespace | None = None
    if metadata_result["org_id"]:
        organization = next((org for org in organizations if org["id"] == metadata_result["org_id"]), None)

    if organization is None:
        organization = organizations[0]
        logger.info(
            "Defaulted organization metadata to manifest entry",
            trace_id=trace_id,
            organization_id=organization["id"],
        )

    organization["guidelines"] = guideline.organization_guidelines

    sections = await handle_extract_sections(
        formatted_sources=formatted_sources,
        organization_guidelines=guideline.organization_guidelines,
        cfp_categories=cfp_categories,
        trace_id=trace_id,
    )

    enriched_sections = await handle_enrich_sections(
        formatted_sources=formatted_sources,
        sections=sections,
        organization_guidelines=guideline.organization_guidelines,
        cfp_categories=cfp_categories,
        trace_id=trace_id,
    )

    cfp_analysis = {
        "subject": metadata_result["subject"],
        "sections": enriched_sections,
        "deadlines": metadata_result["deadlines"],
        "global_constraints": metadata_result["constraints"],
        "organization": organization,
    }

    return cfp_analysis, organizations


async def generate_grant_sections(
    *,
    cfp_analysis: dict[str, Any],
    trace_id: str,
) -> list[GrantElement | GrantLongFormSection]:
    organization = cfp_analysis.get("organization") or {}
    organization_guidelines = organization.get("guidelines", "")
    cfp_sections = cfp_analysis["sections"]

    classification_result = await classify_sections(
        sections=cfp_sections,
        organization_guidelines=organization_guidelines,
        trace_id=trace_id,
    )

    content_result, dependency_result = await asyncio.gather(
        generate_content_metadata(
            sections=classification_result["sections"],
            organization_guidelines=organization_guidelines,
            trace_id=trace_id,
        ),
        generate_section_dependencies(classification=classification_result["sections"], trace_id=trace_id),
    )

    return merge_and_transform(
        cfp_sections=cfp_sections,
        classifications=classification_result["sections"],
        content_metadata=content_result["sections"],
        dependencies=dependency_result["sections"],
    )


async def persist_predefined_template(
    *,
    session_maker: async_sessionmaker[Any],
    spec: TemplateSpec,
    institution: GrantingInstitution,
    guideline_path: Path,
    grant_sections: list[GrantElement | GrantLongFormSection],
    dry_run: bool,
    force: bool,
    guideline_hash: str | None = None,
) -> None:
    guideline_hash = guideline_hash or hashlib.sha256(guideline_path.read_bytes()).hexdigest()
    guideline_version = spec.guideline_version or "unspecified"

    if dry_run:
        logger.info(
            "[dry-run] Generated predefined template",
            manifest_key=spec.key,
            sections=len(grant_sections),
            activity_code=spec.activity_code,
        )
        return

    async with session_maker() as session, session.begin():
        activity_condition = (
            PredefinedGrantTemplate.activity_code.is_(None)
            if spec.activity_code is None
            else PredefinedGrantTemplate.activity_code == spec.activity_code
        )

        if force:
            await session.execute(
                delete(PredefinedGrantTemplate).where(
                    PredefinedGrantTemplate.granting_institution_id == institution.id,
                    activity_condition,
                )
            )
        else:
            exists = await session.scalar(
                select(sa.true()).where(
                    PredefinedGrantTemplate.granting_institution_id == institution.id,
                    activity_condition,
                )
            )
            if exists:
                logger.info(
                    "Predefined template already exists; skipping",
                    manifest_key=spec.key,
                    activity_code=spec.activity_code,
                    institution_id=str(institution.id),
                )
                return

        record = PredefinedGrantTemplate(
            name=spec.name,
            description=spec.description,
            activity_code=spec.activity_code,
            grant_type=_resolve_grant_type(spec.grant_type),
            grant_sections=grant_sections,
            guideline_source=str(spec.guideline_source),
            guideline_version=guideline_version,
            guideline_hash=guideline_hash,
            granting_institution_id=institution.id,
        )
        session.add(record)
        logger.info(
            "Stored predefined template",
            manifest_key=spec.key,
            sections=len(grant_sections),
            activity_code=spec.activity_code,
            institution_id=str(institution.id),
        )


async def generate_predefined_template(
    spec: TemplateSpec,
    *,
    session_maker: async_sessionmaker[Any] | None = None,
    dry_run: bool = False,
    force: bool = False,
    guideline_hash: str | None = None,
) -> None:
    if session_maker is None:
        session_maker = get_session_maker()

    trace_id = str(uuid4())
    institution = await ensure_granting_institution(session_maker, spec=spec)
    guideline = await load_guideline_data(spec)
    cfp_analysis, _ = await analyze_guideline(
        guideline=guideline,
        institution=institution,
        trace_id=trace_id,
    )
    grant_sections = await generate_grant_sections(cfp_analysis=cfp_analysis, trace_id=trace_id)

    await persist_predefined_template(
        session_maker=session_maker,
        spec=spec,
        institution=institution,
        guideline_path=spec.guideline_source,
        grant_sections=grant_sections,
        dry_run=dry_run,
        force=force,
        guideline_hash=guideline_hash,
    )


async def clone_predefined_template_if_possible(
    *,
    spec: TemplateSpec,
    session_maker: async_sessionmaker[Any],
    guideline_hash: str,
    dry_run: bool,
    force: bool,
) -> bool:
    institution = await ensure_granting_institution(session_maker, spec=spec)

    async with session_maker() as session:
        existing = await session.scalar(
            select(PredefinedGrantTemplate)
            .where(PredefinedGrantTemplate.guideline_hash == guideline_hash)
            .where(PredefinedGrantTemplate.granting_institution_id == institution.id)
            .order_by(PredefinedGrantTemplate.created_at.desc())
        )

    if not existing:
        return False

    await persist_predefined_template(
        session_maker=session_maker,
        spec=spec,
        institution=institution,
        guideline_path=spec.guideline_source,
        grant_sections=existing.grant_sections,
        dry_run=dry_run,
        force=force,
        guideline_hash=guideline_hash,
    )

    logger.info(
        "Cloned predefined template from existing guideline output",
        source_activity_code=existing.activity_code,
        target_activity_code=spec.activity_code,
    )
    return True
