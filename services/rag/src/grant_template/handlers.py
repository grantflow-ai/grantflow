from datetime import UTC, datetime
from typing import Any, cast

from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.json_objects import CFPAnalysisResult, GrantElement, GrantLongFormSection
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.dto import OrganizationNamespace
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.cfp_section_analysis import handle_analyze_cfp
from services.rag.src.grant_template.dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
    StageDTO,
)
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data
from services.rag.src.grant_template.extract_sections import handle_extract_sections
from services.rag.src.grant_template.generate_metadata import handle_generate_grant_template_metadata
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


async def handle_cfp_extraction_stage(
    *,
    grant_template: GrantTemplate,
    job_manager: JobManager[StageDTO],
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> ExtractCFPContentStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="Analyzing call for proposals document",
        notification_type="info",
    )

    # this can take a while, that's why we are rechecking cancellation ~keep
    await verify_rag_sources_indexed(
        parent_id=grant_template.id,
        session_maker=session_maker,
        entity_type=GrantTemplate,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    async with session_maker() as session:
        source_ids = list(
            await session.scalars(
                select(RagSource.id)
                .join(GrantTemplateSource, RagSource.id == GrantTemplateSource.rag_source_id)
                .where(GrantTemplateSource.grant_template_id == grant_template.id)
                .where(RagSource.indexing_status == SourceIndexingStatusEnum.FINISHED)
                .where(RagSource.deleted_at.is_(None))
            )
        )

        funding_organizations = list(
            await session.scalars(select_active(GrantingInstitution).order_by(GrantingInstitution.full_name.asc()))
        )

    extraction_result = await handle_extract_cfp_data(
        source_ids=[str(v) for v in source_ids],
        organization_mapping={
            str(org.id): {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
        },
        session_maker=session_maker,
        job_manager=job_manager,
        trace_id=trace_id,
    )

    organization = (
        next(
            (
                OrganizationNamespace(
                    organization_id=org.id,
                    abbreviation=org.abbreviation,
                    full_name=org.full_name,
                )
                for org in funding_organizations
                if str(org.id) == extraction_result["organization_id"]
            ),
            None,
        )
        if extraction_result["organization_id"]
        else None
    )

    org_name = organization["full_name"] if organization else "Unknown"
    submission_date = (
        datetime.strptime(extraction_result["submission_date"], "%Y-%m-%d").date()  # noqa: DTZ007
        if extraction_result["submission_date"]
        else None
    )

    await job_manager.add_notification(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="Document analysis complete",
        notification_type="success",
        data={
            "organization": org_name,
            "subject": extraction_result["cfp_subject"][:100] if extraction_result["cfp_subject"] else None,
            "deadline": str(submission_date) if submission_date else None,
        },
    )

    return ExtractCFPContentStageDTO(extracted_data=extraction_result, organization=organization)


async def handle_cfp_analysis_stage(
    *,
    extracted_cfp: ExtractCFPContentStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> AnalyzeCFPContentStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.SECTIONS_EXTRACTED,
        message="Analyzing application requirements",
        notification_type="info",
    )

    analysis_results: CFPAnalysisResult = await handle_analyze_cfp(
        full_cfp_text="\n".join(
            [
                f"{content['title']}: {' '.join(content['subtitles'])}"
                for content in extracted_cfp["extracted_data"]["content"]
            ]
        ),
        trace_id=trace_id,
    )

    await job_manager.add_notification(
        event=NotificationEvents.SECTIONS_EXTRACTED,
        message="Requirements analysis complete",
        notification_type="success",
        data={
            "categories_found": analysis_results["analysis_metadata"]["categories_found"],
            "total_sentences": analysis_results["analysis_metadata"]["total_sentences"],
        },
    )

    return AnalyzeCFPContentStageDTO(
        organization=extracted_cfp["organization"],
        extracted_data=extracted_cfp["extracted_data"],
        analysis_results=analysis_results,
    )


async def handle_section_extraction_stage(
    *,
    analysis_result: AnalyzeCFPContentStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> ExtractionSectionsStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.METADATA_GENERATED,
        message="Extracting application sections",
        notification_type="info",
    )

    sections = await handle_extract_sections(
        cfp_content=analysis_result["extracted_data"]["content"],
        cfp_subject=analysis_result["extracted_data"]["cfp_subject"],
        trace_id=trace_id,
        job_manager=job_manager,
        organization=analysis_result["organization"],
        cfp_analysis=analysis_result.get("analysis_results"),
    )

    await job_manager.add_notification(
        event=NotificationEvents.METADATA_GENERATED,
        message="Section extraction complete",
        notification_type="success",
        data={
            "sections": len(sections),
        },
    )

    return ExtractionSectionsStageDTO(
        **analysis_result,
        extracted_sections=sections,
    )


async def handle_generate_metadata_stage(
    *,
    section_extraction_result: ExtractionSectionsStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> list[GrantElement | GrantLongFormSection]:
    await job_manager.ensure_not_cancelled()

    sections_requiring_writing = [
        s for s in section_extraction_result["extracted_sections"] if s.get("needs_applicant_writing", True)
    ]

    section_metadata = await handle_generate_grant_template_metadata(
        cfp_content="\n".join(
            [
                f"{content['title']}: {'...'.join(content['subtitles'])}"
                for content in section_extraction_result["extracted_data"]["content"]
            ]
        ),
        cfp_subject=section_extraction_result["extracted_data"]["cfp_subject"],
        organization=section_extraction_result["organization"],
        long_form_sections=[s for s in sections_requiring_writing if not s.get("is_title_only")],
        trace_id=trace_id,
        job_manager=job_manager,
    )

    mapped_metadata = {metadata["id"]: metadata for metadata in section_metadata}

    ret: list[GrantElement | GrantLongFormSection] = []
    for section in sections_requiring_writing:
        if section.get("is_title_only"):
            element: GrantElement = {
                "id": section["id"],
                "order": section["order"],
                "parent_id": section.get("parent_id"),
                "title": section["title"],
            }
            needs_writing = section.get("needs_applicant_writing")
            if needs_writing is not None:
                element["needs_applicant_writing"] = needs_writing
            ret.append(element)
        else:
            metadata = mapped_metadata[section["id"]]
            long_form: GrantLongFormSection = {
                "depends_on": metadata["depends_on"],
                "generation_instructions": metadata["generation_instructions"],
                "id": section["id"],
                "is_clinical_trial": section.get("is_clinical_trial"),
                "is_detailed_research_plan": section.get("is_detailed_research_plan"),
                "keywords": metadata["keywords"],
                "max_words": metadata["max_words"],
                "order": section["order"],
                "parent_id": section.get("parent_id"),
                "search_queries": metadata["search_queries"],
                "title": section["title"],
                "topics": metadata["topics"],
            }
            needs_writing = section.get("needs_applicant_writing")
            if needs_writing is not None:
                long_form["needs_applicant_writing"] = needs_writing
            ret.append(long_form)

    return ret


async def handle_save_grant_template(
    *,
    cfp_analysis: CFPAnalysisResult,
    extracted_cfp: ExtractionSectionsStageDTO,
    grant_sections: list[GrantElement | GrantLongFormSection],
    grant_template: GrantTemplate,
    job_manager: JobManager[StageDTO],
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    await job_manager.ensure_not_cancelled()

    async with session_maker() as session, session.begin():
        try:
            update_values = {
                "granting_institution_id": extracted_cfp["organization"]["organization_id"]
                if extracted_cfp["organization"]
                else None,
                "submission_date": datetime.strptime(extracted_cfp["extracted_data"]["submission_date"], "%Y-%m-%d")
                .replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC)
                .date()
                if extracted_cfp["extracted_data"]["submission_date"]
                else None,
                "grant_sections": grant_sections,
                "cfp_analysis": cfp_analysis,
            }

            updated_template = await session.scalar(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id)
                .values(update_values)
                .returning(GrantTemplate)
            )

            if not updated_template:
                raise DatabaseError("Failed to update and retrieve grant template")

            await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
            await job_manager.add_notification(
                event=NotificationEvents.GRANT_TEMPLATE_CREATED,
                message="Grant template ready",
                notification_type="success",
                data={
                    "template_id": str(updated_template.id),
                    "sections": len(grant_sections),
                    "organization": extracted_cfp["organization"]["full_name"]
                    if extracted_cfp["organization"]
                    else "Unknown",
                },
            )

            return cast("GrantTemplate", updated_template)
        except SQLAlchemyError as e:
            logger.error(
                "Failed to save grant template",
                error=str(e),
                trace_id=trace_id,
            )
            raise DatabaseError("Error saving grant template", context=str(e)) from e
