
import logging
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.tables import GrantingInstitution, Organization
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.extract_sections import handle_extract_sections
from services.rag.tests.e2e.grant_template.conftest import (
    create_test_grant_template,
    validate_constraint_match,
    validate_definition_generation,
    validate_guidelines_extraction,
)


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_extract_sections_constraint_matching_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
    expected_nih_par_25_450_constraints: dict[str, dict[str, Any]],
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_constraint_matching")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "extract_sections")

    logger.info("🔍 Starting NIH PAR-25-450 constraint matching test")

    performance_context.start_stage("setup_grant_template")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Constraint Matching Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=nih_par_25_450_cfp_rag_source.id,
        )
        session.add(template_source)

    performance_context.end_stage()

    performance_context.start_stage("run_cfp_analysis")

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="constraint-matching-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("run_extract_sections")

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    stage_dto = CFPAnalysisStageDTO(
        organization=cfp_analysis_result.organization,
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        grant_template=grant_template,
        previous_stage_data=stage_dto,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="constraint-matching-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_constraint_matching")

    sections_with_constraints = [s for s in extracted_sections if "length_limit" in s and s["length_limit"] is not None]

    logger.info(
        "📊 Constraint matching results: %d/%d sections have constraints",
        len(sections_with_constraints),
        len(extracted_sections),
    )

    assert len(sections_with_constraints) >= 3, (
        f"Should match constraints to sections: {len(sections_with_constraints)}"
    )

    for section in sections_with_constraints:
        section_title = section.get("title", "Unknown")

        if section_title in expected_nih_par_25_450_constraints:
            expected_constraint = expected_nih_par_25_450_constraints[section_title]

            logger.info(
                "✅ Validating constraint for '%s': expected=%d, actual=%d",
                section_title,
                expected_constraint["length_limit"],
                section["length_limit"],
            )

            validate_constraint_match(
                section=section,
                expected_constraint=expected_constraint,
                tolerance=0.15,
            )

        assert section["length_limit"] > 0, f"Invalid length_limit for {section_title}: {section['length_limit']}"
        assert section.get("length_source"), f"length_source missing for {section_title}"

    performance_context.end_stage()

    performance_context.set_metadata("total_sections_extracted", len(extracted_sections))
    performance_context.set_metadata("sections_with_constraints", len(sections_with_constraints))
    performance_context.set_metadata(
        "constraint_match_rate",
        len(sections_with_constraints) / len(extracted_sections) if extracted_sections else 0,
    )

    logger.info(
        "✅ NIH PAR-25-450 constraint matching test completed successfully",
        extra={
            "total_sections": len(extracted_sections),
            "sections_with_constraints": len(sections_with_constraints),
            "constraint_match_rate": f"{len(sections_with_constraints) / len(extracted_sections) * 100:.1f}%",
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_extract_sections_constraint_matching_mra(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    mra_cfp_rag_source: Any,
    mra_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
    expected_mra_constraints: dict[str, dict[str, Any]],
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_constraint_matching")
    performance_context.set_metadata("cfp_type", "mra")
    performance_context.set_metadata("stage", "extract_sections")

    logger.info("🔍 Starting MRA constraint matching test")

    performance_context.start_stage("setup_grant_template")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=mra_granting_institution,
        organization=test_organization,
        title="MRA Constraint Matching Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=mra_cfp_rag_source.id,
        )
        session.add(template_source)

    performance_context.end_stage()

    performance_context.start_stage("run_cfp_analysis")

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="mra-constraint-matching-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("run_extract_sections")

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    stage_dto = CFPAnalysisStageDTO(
        organization=cfp_analysis_result.organization,
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        grant_template=grant_template,
        previous_stage_data=stage_dto,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="mra-constraint-matching-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_constraint_matching")

    sections_with_constraints = [s for s in extracted_sections if "length_limit" in s and s["length_limit"] is not None]

    logger.info(
        "📊 MRA constraint matching results: %d/%d sections have constraints",
        len(sections_with_constraints),
        len(extracted_sections),
    )

    for section in sections_with_constraints:
        section_title = section.get("title", "Unknown")

        if section_title in expected_mra_constraints:
            expected_constraint = expected_mra_constraints[section_title]

            logger.info(
                "✅ Validating constraint for '%s': expected=%d, actual=%d",
                section_title,
                expected_constraint["length_limit"],
                section["length_limit"],
            )

            validate_constraint_match(
                section=section,
                expected_constraint=expected_constraint,
                tolerance=0.15,
            )

        assert section["length_limit"] > 0, f"Invalid length_limit for {section_title}: {section['length_limit']}"

    performance_context.end_stage()

    performance_context.set_metadata("total_sections_extracted", len(extracted_sections))
    performance_context.set_metadata("sections_with_constraints", len(sections_with_constraints))

    logger.info(
        "✅ MRA constraint matching test completed successfully",
        extra={
            "total_sections": len(extracted_sections),
            "sections_with_constraints": len(sections_with_constraints),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_extract_sections_guideline_extraction_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_guideline_extraction")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "extract_sections")

    logger.info("📝 Starting NIH PAR-25-450 guideline extraction test")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Guideline Extraction Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=nih_par_25_450_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="guideline-extraction-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    stage_dto = CFPAnalysisStageDTO(
        organization=cfp_analysis_result.organization,
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        grant_template=grant_template,
        previous_stage_data=stage_dto,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="guideline-extraction-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_guideline_extraction")

    long_form_sections = [s for s in extracted_sections if s.get("long_form", False)]
    sections_with_guidelines = [s for s in long_form_sections if s.get("guidelines")]

    logger.info(
        "📊 Guideline extraction results: %d/%d long-form sections have guidelines",
        len(sections_with_guidelines),
        len(long_form_sections),
    )

    guideline_coverage = len(sections_with_guidelines) / len(long_form_sections) if long_form_sections else 0
    assert guideline_coverage >= 0.7, (
        f"Guideline coverage too low: {guideline_coverage:.1%} "
        f"({len(sections_with_guidelines)}/{len(long_form_sections)})"
    )

    for section in sections_with_guidelines:
        section_title = section.get("title", "Unknown")

        logger.info("✅ Validating guidelines for '%s': %d guidelines", section_title, len(section["guidelines"]))

        validate_guidelines_extraction(
            section=section,
            min_guidelines=1,
            max_guidelines=10,
        )

    performance_context.end_stage()

    performance_context.set_metadata("total_long_form_sections", len(long_form_sections))
    performance_context.set_metadata("sections_with_guidelines", len(sections_with_guidelines))
    performance_context.set_metadata("guideline_coverage", guideline_coverage)

    logger.info(
        "✅ NIH PAR-25-450 guideline extraction test completed successfully",
        extra={
            "long_form_sections": len(long_form_sections),
            "sections_with_guidelines": len(sections_with_guidelines),
            "coverage": f"{guideline_coverage * 100:.1f}%",
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_extract_sections_definition_generation_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_definition_generation")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "extract_sections")

    logger.info("📖 Starting NIH PAR-25-450 definition generation test")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Definition Generation Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=nih_par_25_450_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="definition-generation-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    stage_dto = CFPAnalysisStageDTO(
        organization=cfp_analysis_result.organization,
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        grant_template=grant_template,
        previous_stage_data=stage_dto,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="definition-generation-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_definition_generation")

    sections_with_guidelines = [s for s in extracted_sections if s.get("guidelines")]

    logger.info("📊 Definition generation results: validating %d sections", len(sections_with_guidelines))

    sections_with_definitions = [s for s in sections_with_guidelines if s.get("definition")]

    assert len(sections_with_definitions) == len(sections_with_guidelines), (
        f"All sections with guidelines should have definitions: "
        f"{len(sections_with_definitions)}/{len(sections_with_guidelines)}"
    )

    for section in sections_with_guidelines:
        section_title = section.get("title", "Unknown")
        guidelines = section.get("guidelines", [])

        logger.info("✅ Validating definition for '%s': %d guidelines → definition", section_title, len(guidelines))

        validate_definition_generation(
            section=section,
            guidelines=guidelines,
        )

    performance_context.end_stage()

    performance_context.set_metadata("sections_with_guidelines", len(sections_with_guidelines))
    performance_context.set_metadata("sections_with_definitions", len(sections_with_definitions))

    logger.info(
        "✅ NIH PAR-25-450 definition generation test completed successfully",
        extra={
            "sections_with_guidelines": len(sections_with_guidelines),
            "sections_with_definitions": len(sections_with_definitions),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_extract_sections_field_preservation_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_field_preservation")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "extract_sections")

    logger.info("🔧 Starting NIH PAR-25-450 field preservation test")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Field Preservation Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=nih_par_25_450_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="field-preservation-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    stage_dto = CFPAnalysisStageDTO(
        organization=cfp_analysis_result.organization,
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        grant_template=grant_template,
        previous_stage_data=stage_dto,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="field-preservation-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_field_preservation")

    logger.info("📊 Validating field preservation for %d sections", len(extracted_sections))

    for section in extracted_sections:
        section_title = section.get("title", "Unknown")

        assert section.get("title"), f"title missing for {section_title}"
        assert section.get("id"), f"id missing for {section_title}"
        assert "order" in section, f"order missing for {section_title}"
        assert section["order"] >= 0, f"order invalid for {section_title}"
        assert "long_form" in section, f"long_form missing for {section_title}"

        if section.get("length_limit"):
            assert section["length_limit"] > 0, (
                f"length_limit should be positive for {section_title}: {section['length_limit']}"
            )
            assert section.get("length_source"), f"length_source missing for {section_title} with length_limit"

        if section.get("guidelines"):
            assert isinstance(section["guidelines"], list), f"guidelines should be list for {section_title}"
            assert "definition" in section, f"definition missing for {section_title} with guidelines"

    performance_context.end_stage()

    performance_context.set_metadata("total_sections_validated", len(extracted_sections))

    logger.info(
        "✅ NIH PAR-25-450 field preservation test completed successfully",
        extra={
            "sections_validated": len(extracted_sections),
        },
    )
