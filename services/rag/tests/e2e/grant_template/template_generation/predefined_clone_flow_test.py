import logging
from typing import Any

from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import (
    GrantingInstitution,
    GrantTemplate,
    Organization,
    PredefinedGrantTemplate,
    RagGenerationJob,
)
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import PredefinedGrantTemplateFactory
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from services.rag.tests.e2e.grant_template.conftest import create_test_grant_template


async def _enqueue_template_for_generation(
    *,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
    granting_institution: GrantingInstitution,
    activity_code: str | None,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJob(
            grant_template_id=grant_template.id,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            status=RagGenerationStatusEnum.COMPLETED,
            checkpoint_data={
                "cfp_analysis": {
                    "subject": "NIH CFP auto-clone test",
                    "sections": [],
                    "deadlines": ["2025-01-01"],
                    "global_constraints": [],
                    "organization": {
                        "id": str(granting_institution.id),
                        "full_name": granting_institution.full_name,
                        "abbreviation": granting_institution.abbreviation,
                    },
                    "activity_code": activity_code,
                }
            },
        )
        session.add(job)


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1200)
async def test_predefined_template_auto_clone_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
) -> None:
    performance_context.set_metadata("cfp_type", "nih_predefined_clone")
    performance_context.set_metadata("grant_mechanisms", ["R21", "institution_fallback"])

    logger.info("🧪 Starting NIH predefined template auto-clone E2E test")

    performance_context.start_stage("setup_templates")

    template_with_activity = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="Auto-clone R21 Template",
    )
    template_without_activity = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="Auto-clone Default Template",
    )

    async with async_session_maker() as session, session.begin():
        await session.execute(
            delete(PredefinedGrantTemplate).where(
                PredefinedGrantTemplate.granting_institution_id == nih_granting_institution.id
            )
        )
        code_predefined = PredefinedGrantTemplateFactory.build(
            granting_institution_id=nih_granting_institution.id,
            activity_code="R21",
            grant_sections=[
                {
                    "id": "specific-aims",
                    "order": 1,
                    "title": "Specific Aims - Catalog R21",
                    "evidence": "",
                    "parent_id": None,
                    "needs_applicant_writing": True,
                }
            ],
        )
        fallback_predefined = PredefinedGrantTemplateFactory.build(
            granting_institution_id=nih_granting_institution.id,
            activity_code=None,
            grant_sections=[
                {
                    "id": "institution-overview",
                    "order": 1,
                    "title": "Institution Default Overview",
                    "evidence": "",
                    "parent_id": None,
                    "needs_applicant_writing": False,
                }
            ],
        )
        session.add_all([code_predefined, fallback_predefined])
        await session.flush()
        code_predefined_id = code_predefined.id
        fallback_predefined_id = fallback_predefined.id

    performance_context.end_stage()

    performance_context.start_stage("auto_clone_activity_code_match")

    await _enqueue_template_for_generation(
        async_session_maker=async_session_maker,
        grant_template=template_with_activity,
        granting_institution=nih_granting_institution,
        activity_code="R21",
    )

    async with async_session_maker() as session:
        template_with_activity = await session.get(GrantTemplate, template_with_activity.id)
        assert template_with_activity is not None

    result_with_activity = await handle_grant_template_pipeline(
        grant_template=template_with_activity,
        session_maker=async_session_maker,
        trace_id="nih-auto-clone-r21",
    )

    performance_context.end_stage()

    assert result_with_activity is not None, "Pipeline should return cloned template when activity code matches catalog"

    async with async_session_maker() as session:
        refreshed_with_activity = await session.get(GrantTemplate, template_with_activity.id)
        assert refreshed_with_activity is not None

    assert refreshed_with_activity.predefined_template_id == code_predefined_id
    assert refreshed_with_activity.grant_sections[0]["title"] == "Specific Aims - Catalog R21"

    performance_context.start_stage("auto_clone_institution_fallback")

    await _enqueue_template_for_generation(
        async_session_maker=async_session_maker,
        grant_template=template_without_activity,
        granting_institution=nih_granting_institution,
        activity_code=None,
    )

    async with async_session_maker() as session:
        template_without_activity = await session.get(GrantTemplate, template_without_activity.id)
        assert template_without_activity is not None

    result_without_activity = await handle_grant_template_pipeline(
        grant_template=template_without_activity,
        session_maker=async_session_maker,
        trace_id="nih-auto-clone-fallback",
    )

    performance_context.end_stage()

    assert result_without_activity is not None, "Pipeline should fall back to institution-level predefined template"

    async with async_session_maker() as session:
        refreshed_without_activity = await session.get(GrantTemplate, template_without_activity.id)
        assert refreshed_without_activity is not None

    assert refreshed_without_activity.predefined_template_id == fallback_predefined_id
    assert refreshed_without_activity.grant_sections[0]["title"] == "Institution Default Overview"

    performance_context.set_metadata(
        "auto_clone_results",
        {
            "activity_match_template_id": str(code_predefined_id),
            "fallback_template_id": str(fallback_predefined_id),
        },
    )

    logger.info(
        "✅ NIH predefined template auto-clone E2E test completed successfully",
        extra={
            "activity_template_id": str(code_predefined_id),
            "fallback_template_id": str(fallback_predefined_id),
        },
    )
