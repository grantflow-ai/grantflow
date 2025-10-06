import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src import select_active
from packages.db.src.tables import GrantingInstitution, GrantTemplate, Organization, RagSource
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_mra_cfp_template_generation_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    mra_grant_template_with_rag_source: GrantTemplate,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "melanoma_research_alliance")
    performance_context.set_metadata("test_type", "full_pipeline")
    performance_context.set_metadata("pipeline_stage", "complete_template_generation")

    logger.info("🏭 Starting MRA CFP template generation pipeline test")

    performance_context.start_stage("run_template_generation_pipeline")

    await handle_grant_template_pipeline(
        grant_template=mra_grant_template_with_rag_source,
        session_maker=async_session_maker,
        trace_id="mra-pipeline-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_pipeline_results")

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select_active(mra_grant_template_with_rag_source.__class__)
            .where(mra_grant_template_with_rag_source.__class__.id == mra_grant_template_with_rag_source.id)
            .options(selectinload(mra_grant_template_with_rag_source.__class__.grant_sections))
        )

        assert updated_template is not None, "Template should exist after pipeline"

        if hasattr(updated_template, "cfp_analysis") and updated_template.cfp_analysis:
            cfp_data = updated_template.cfp_analysis
            assert "subject" in cfp_data, "CFP analysis should contain subject"
            assert "content" in cfp_data, "CFP analysis should contain content"

            if cfp_data["content"]:
                sections_count = len(cfp_data["content"])
                assert sections_count > 0, "Should have extracted sections"

                performance_context.set_metadata("pipeline_sections_extracted", sections_count)
                logger.info("Pipeline extracted %d sections", sections_count)

        if updated_template.grant_sections:
            sections_created = len(updated_template.grant_sections)
            performance_context.set_metadata("grant_sections_created", sections_created)
            logger.info("Pipeline created %d grant sections", sections_created)

    performance_context.end_stage()

    logger.info("✅ MRA CFP template generation pipeline test completed successfully")


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_israeli_chief_scientist_template_generation_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    israeli_chief_scientist_cfp_file: Path,
    israeli_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "israeli_chief_scientist")
    performance_context.set_metadata("test_type", "full_pipeline")
    performance_context.set_metadata("granting_body", "israeli_ministry_of_health")

    logger.info("🏭 Starting Israeli Chief Scientist CFP template generation pipeline test")

    performance_context.start_stage("setup_grant_template")

    from .conftest import create_test_grant_template

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=israeli_granting_institution,
        organization=test_organization,
        title="Israeli Chief Scientist E2E Test Template",
    )

    cfp_content = israeli_chief_scientist_cfp_file.read_text(encoding="utf-8")

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="israeli-chief-scientist-pipeline-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content=cfp_content,
            status="indexed",
        )
        session.add(rag_source)
        await session.flush()

        from packages.db.src.tables import GrantTemplateSource

        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("run_template_generation_pipeline")

    await handle_grant_template_pipeline(
        grant_template=grant_template,
        session_maker=async_session_maker,
        trace_id="israeli-chief-scientist-pipeline-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_pipeline_results")

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select_active(grant_template.__class__)
            .where(grant_template.__class__.id == grant_template.id)
            .options(selectinload(grant_template.__class__.grant_sections))
        )

        assert updated_template is not None, "Template should exist after pipeline"

        if hasattr(updated_template, "cfp_analysis") and updated_template.cfp_analysis:
            cfp_data = updated_template.cfp_analysis
            assert "subject" in cfp_data, "CFP analysis should contain subject"
            assert "content" in cfp_data, "CFP analysis should contain content"

            if cfp_data["content"]:
                sections_count = len(cfp_data["content"])
                assert sections_count > 0, "Should have extracted sections"

                section_titles = [s["title"].lower() for s in cfp_data["content"]]
                has_project_section = any("project" in title for title in section_titles)
                has_research_section = any("research" in title for title in section_titles)
                has_budget_section = any("budget" in title or "funding" in title for title in section_titles)

                performance_context.set_metadata("pipeline_sections_extracted", sections_count)
                performance_context.set_metadata("has_project_section", has_project_section)
                performance_context.set_metadata("has_research_section", has_research_section)
                performance_context.set_metadata("has_budget_section", has_budget_section)

        if updated_template.grant_sections:
            sections_created = len(updated_template.grant_sections)
            performance_context.set_metadata("grant_sections_created", sections_created)

    performance_context.end_stage()

    logger.info("✅ Israeli Chief Scientist CFP template generation pipeline test completed successfully")


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_nih_par_25_450_template_generation_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("test_type", "full_pipeline")
    performance_context.set_metadata("grant_mechanism", "R21")

    logger.info("🏭 Starting NIH PAR-25-450 CFP template generation pipeline test")

    performance_context.start_stage("setup_grant_template")

    from .conftest import create_test_grant_template

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 E2E Test Template",
    )

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-par-25-450-pipeline-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content="NIH PAR-25-450 Clinical Trial Readiness pipeline test content",
            status="indexed",
        )
        session.add(rag_source)
        await session.flush()

        from packages.db.src.tables import GrantTemplateSource

        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("run_template_generation_pipeline")

    await handle_grant_template_pipeline(
        grant_template_id=str(grant_template.id),
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
        trace_id="nih-par-25-450-pipeline-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_pipeline_results")

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select_active(grant_template.__class__)
            .where(grant_template.__class__.id == grant_template.id)
            .options(selectinload(grant_template.__class__.grant_sections))
        )

        assert updated_template is not None, "Template should exist after pipeline"

        if hasattr(updated_template, "cfp_analysis") and updated_template.cfp_analysis:
            cfp_data = updated_template.cfp_analysis
            assert "subject" in cfp_data, "CFP analysis should contain subject"
            assert "content" in cfp_data, "CFP analysis should contain content"

            if cfp_data["content"]:
                sections_count = len(cfp_data["content"])
                assert sections_count > 0, "Should have extracted sections"

                section_titles = [s["title"].lower() for s in cfp_data["content"]]
                has_research_section = any("research" in title for title in section_titles)
                has_budget_section = any("budget" in title for title in section_titles)

                performance_context.set_metadata("pipeline_sections_extracted", sections_count)
                performance_context.set_metadata("has_research_section", has_research_section)
                performance_context.set_metadata("has_budget_section", has_budget_section)

        if updated_template.grant_sections:
            sections_created = len(updated_template.grant_sections)
            performance_context.set_metadata("grant_sections_created", sections_created)

    performance_context.end_stage()

    logger.info("✅ NIH PAR-25-450 CFP template generation pipeline test completed successfully")
