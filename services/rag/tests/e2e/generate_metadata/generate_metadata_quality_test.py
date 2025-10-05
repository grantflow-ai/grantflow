
import logging
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.tables import GrantingInstitution, Organization
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.extract_sections import handle_extract_sections
from services.rag.src.grant_template.generate_metadata import handle_generate_grant_template_metadata
from services.rag.tests.e2e.grant_template.conftest import (
    create_test_grant_template,
    validate_dual_field_preservation,
    validate_metadata_quality,
)


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_field_preservation_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_field_preservation")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("🔧 Starting NIH PAR-25-450 field preservation test for generate_metadata")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Metadata Field Preservation Test",
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
        trace_id="metadata-field-preservation-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    CFPAnalysisStageDTO(
        organization=cfp_analysis_result.get("organization"),
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="metadata-field-preservation-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("run_generate_metadata")

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="metadata-field-preservation-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_field_preservation")

    logger.info(
        "📊 Validating field preservation for %d grant sections from %d extracted sections",
        len(grant_sections),
        len(extracted_sections),
    )

    long_form_grant_sections = [s for s in grant_sections if s.get("long_form", False)]

    for grant_section in long_form_grant_sections:
        section_title = grant_section.get("title", "Unknown")
        section_id = grant_section.get("id")

        extracted = next(
            (s for s in extracted_sections if s["id"] == section_id),
            None,
        )

        if not extracted:
            logger.warning("⚠️ No extracted section found for grant section: %s", section_title)
            continue

        logger.info("✅ Validating field preservation for '%s'", section_title)

        if extracted.get("length_limit"):
            assert "length_limit" in grant_section, f"length_limit missing for {section_title}"
            assert grant_section["length_limit"] == extracted["length_limit"], (
                f"length_limit changed for {section_title}: "
                f"{extracted['length_limit']} → {grant_section.get('length_limit')}"
            )

            assert grant_section.get("length_source"), f"length_source missing for {section_title}"

        if extracted.get("guidelines"):
            assert "guidelines" in grant_section, f"guidelines missing for {section_title}"
            assert grant_section["guidelines"] == extracted["guidelines"], f"guidelines changed for {section_title}"

        if extracted.get("definition"):
            assert "definition" in grant_section, f"definition missing for {section_title}"
            assert grant_section["definition"] == extracted["definition"], f"definition changed for {section_title}"

        assert "max_words" in grant_section, f"max_words missing for {section_title}"
        assert grant_section["max_words"] > 0, (
            f"max_words should be positive for {section_title}: {grant_section.get('max_words')}"
        )

        assert grant_section.get("keywords"), f"keywords missing or empty for {section_title}"
        assert grant_section.get("topics"), f"topics missing or empty for {section_title}"
        assert grant_section.get("search_queries"), f"search_queries missing or empty for {section_title}"

    performance_context.end_stage()

    performance_context.set_metadata("total_grant_sections", len(grant_sections))
    performance_context.set_metadata("long_form_sections", len(long_form_grant_sections))

    logger.info(
        "✅ NIH PAR-25-450 metadata field preservation test completed successfully",
        extra={
            "total_grant_sections": len(grant_sections),
            "long_form_sections": len(long_form_grant_sections),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_field_preservation_mra(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    mra_cfp_rag_source: Any,
    mra_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_field_preservation")
    performance_context.set_metadata("cfp_type", "mra")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("🔧 Starting MRA field preservation test for generate_metadata")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=mra_granting_institution,
        organization=test_organization,
        title="MRA Metadata Field Preservation Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=mra_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="mra-metadata-preservation-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    CFPAnalysisStageDTO(
        organization=cfp_analysis_result.get("organization"),
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="mra-metadata-preservation-test",
    )

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="mra-metadata-preservation-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_field_preservation")

    logger.info("📊 Validating MRA field preservation for %d sections", len(grant_sections))

    assert len(grant_sections) > 0, "Should generate at least one section"

    long_form_sections = [s for s in grant_sections if s.get("long_form", False)]
    for section in long_form_sections:
        section_title = section.get("title", "Unknown")

        assert "max_words" in section, f"max_words missing for {section_title}"
        assert section["max_words"] > 0, f"max_words invalid for {section_title}"
        assert "keywords" in section, f"keywords missing for {section_title}"
        assert len(section["keywords"]) >= 3, f"keywords too few for {section_title}"

    performance_context.end_stage()

    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("long_form_sections", len(long_form_sections))

    logger.info(
        "✅ MRA metadata field preservation test completed successfully",
        extra={
            "total_sections": len(grant_sections),
            "long_form_sections": len(long_form_sections),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_quality_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
    expected_nih_metadata_quality: dict[str, dict[str, int]],
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_quality")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("📈 Starting NIH PAR-25-450 metadata quality test")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Metadata Quality Test",
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
        trace_id="metadata-quality-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    CFPAnalysisStageDTO(
        organization=cfp_analysis_result.get("organization"),
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="metadata-quality-test",
    )

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="metadata-quality-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_metadata_quality")

    logger.info("📊 Validating metadata quality for %d sections", len(grant_sections))

    long_form_sections = [s for s in grant_sections if s.get("long_form", False)]

    for section in long_form_sections:
        section_title = section.get("title", "Unknown")

        logger.info(
            "✅ Validating metadata quality for '%s': keywords=%d, topics=%d, max_words=%d",
            section_title,
            len(section.get("keywords", [])),
            len(section.get("topics", [])),
            section.get("max_words", 0),
        )

        validate_metadata_quality(
            section=section,
            quality_metrics=expected_nih_metadata_quality,
        )

    performance_context.end_stage()

    total_keywords = sum(len(s.get("keywords", [])) for s in long_form_sections)
    total_topics = sum(len(s.get("topics", [])) for s in long_form_sections)
    total_queries = sum(len(s.get("search_queries", [])) for s in long_form_sections)

    performance_context.set_metadata("total_long_form_sections", len(long_form_sections))
    performance_context.set_metadata(
        "avg_keywords_per_section", total_keywords / len(long_form_sections) if long_form_sections else 0
    )
    performance_context.set_metadata(
        "avg_topics_per_section", total_topics / len(long_form_sections) if long_form_sections else 0
    )
    performance_context.set_metadata(
        "avg_queries_per_section", total_queries / len(long_form_sections) if long_form_sections else 0
    )

    logger.info(
        "✅ NIH PAR-25-450 metadata quality test completed successfully",
        extra={
            "long_form_sections": len(long_form_sections),
            "avg_keywords": f"{total_keywords / len(long_form_sections):.1f}" if long_form_sections else 0,
            "avg_topics": f"{total_topics / len(long_form_sections):.1f}" if long_form_sections else 0,
            "avg_queries": f"{total_queries / len(long_form_sections):.1f}" if long_form_sections else 0,
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_dual_field_preservation_nih(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_dual_field_preservation")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("🔀 Starting NIH PAR-25-450 dual-field preservation test")

    performance_context.start_stage("setup_and_run_pipeline")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 Dual-Field Preservation Test",
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
        trace_id="dual-field-preservation-test",
    )

    from services.rag.src.grant_template.dto import CFPAnalysisStageDTO

    CFPAnalysisStageDTO(
        organization=cfp_analysis_result.get("organization"),
        cfp_analysis=cfp_analysis_result,
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="dual-field-preservation-test",
    )

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="dual-field-preservation-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_dual_field_preservation")

    logger.info("📊 Validating dual-field preservation for %d sections", len(grant_sections))

    long_form_sections = [s for s in grant_sections if s.get("long_form", False)]
    sections_with_cfp_constraints = [s for s in long_form_sections if s.get("length_limit")]

    logger.info(
        "Found %d/%d long-form sections with CFP constraints",
        len(sections_with_cfp_constraints),
        len(long_form_sections),
    )

    for section in sections_with_cfp_constraints:
        section_title = section.get("title", "Unknown")

        logger.info(
            "✅ Validating dual fields for '%s': max_words=%s, length_limit=%s",
            section_title,
            section.get("max_words"),
            section.get("length_limit"),
        )

        validate_dual_field_preservation(
            section=section,
            has_cfp_constraint=True,
        )

    sections_without_constraints = [s for s in long_form_sections if s not in sections_with_cfp_constraints]

    for section in sections_without_constraints:
        section_title = section.get("title", "Unknown")

        validate_dual_field_preservation(
            section=section,
            has_cfp_constraint=False,
        )

    performance_context.end_stage()

    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("sections_with_constraints", len(sections_with_cfp_constraints))
    performance_context.set_metadata("sections_without_constraints", len(sections_without_constraints))

    logger.info(
        "✅ NIH PAR-25-450 dual-field preservation test completed successfully",
        extra={
            "long_form_sections": len(long_form_sections),
            "with_constraints": len(sections_with_cfp_constraints),
            "without_constraints": len(sections_without_constraints),
        },
    )
