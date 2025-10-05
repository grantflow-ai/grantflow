"""Fixture-based quality tests for extract_sections stage. ~keep

These tests use cfp_analysis fixtures as inputs to validate extract_sections quality
consistently across multiple CFPs (MRA, NIH PAR-25-450). This approach is:
- Faster than E2E tests (no real API calls)
- More deterministic (same input every time)
- Better for regression testing

Tests validate:
1. Section structure quality (titles, IDs, hierarchy)
2. Constraint matching accuracy
3. Guideline extraction completeness
4. Definition generation quality
5. Classification accuracy (long_form, is_plan, clinical)
"""

import logging
from unittest.mock import AsyncMock

from packages.db.src.json_objects import CFPAnalysis
from packages.db.src.tables import GrantingInstitution
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.dto import CFPAnalysisStageDTO
from services.rag.src.grant_template.handlers import handle_section_extraction_stage


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=300)
async def test_extract_sections_mra_fixture_quality(
    logger: logging.Logger,
    performance_context: PerformanceTestContext,
    mra_cfp_analysis_fixture: CFPAnalysis,
    mra_granting_institution: GrantingInstitution,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_fixture_quality")
    performance_context.set_metadata("cfp_type", "mra")
    performance_context.set_metadata("input_source", "fixture")

    logger.info("🧪 Testing extract_sections quality with MRA fixture")
    logger.info("📊 Fixture has %d content sections", len(mra_cfp_analysis_fixture["content"]))

    performance_context.start_stage("run_extract_sections")

    fixture_with_real_org = dict(mra_cfp_analysis_fixture)
    fixture_with_real_org["organization"] = {
        "id": str(mra_granting_institution.id),
        "full_name": mra_granting_institution.full_name,
        "abbreviation": mra_granting_institution.abbreviation,
    }

    cfp_analysis_stage_dto = CFPAnalysisStageDTO(
        organization=str(mra_granting_institution.id),
        cfp_analysis=fixture_with_real_org,
    )

    section_extraction_result = await handle_section_extraction_stage(
        cfp_analysis_result=cfp_analysis_stage_dto,
        job_manager=mock_job_manager,
        trace_id="mra-fixture-quality-test",
    )

    extracted_sections = section_extraction_result["extracted_sections"]

    performance_context.end_stage()

    performance_context.start_stage("validate_section_structure")

    logger.info("📊 Extracted %d sections from fixture", len(extracted_sections))

    # DEBUG: Print section breakdown
    sum(1 for s in extracted_sections if s.get("long_form"))
    sum(1 for s in extracted_sections if s.get("needs_writing"))
    sum(1 for s in extracted_sections if s.get("length_limit") or s.get("other_limits"))
    sum(1 for s in extracted_sections if s.get("guidelines"))


    assert len(extracted_sections) >= 8, (
        f"Should extract at least core sections from MRA fixture: {len(extracted_sections)}"
    )
    assert len(extracted_sections) <= 25, (
        f"Should not over-extract sections from MRA fixture: {len(extracted_sections)}"
    )

    section_titles = []
    section_ids = []

    for section in extracted_sections:
        section_title = section.get("title", "")
        section_id = section.get("id", "")

        assert section_title, f"Section missing title: {section}"
        assert section_id, f"Section missing id: {section}"
        assert "order" in section, f"Order missing for {section_title}"
        assert section["order"] >= 0, f"Invalid order for {section_title}"
        assert "long_form" in section, f"long_form missing for {section_title}"

        section_titles.append(section_title)
        section_ids.append(section_id)

    assert len(section_titles) == len(set(section_titles)), (
        f"Section titles must be unique. Duplicates: {[t for t in section_titles if section_titles.count(t) > 1]}"
    )
    assert len(section_ids) == len(set(section_ids)), (
        f"Section IDs must be unique. Duplicates: {[i for i in section_ids if section_ids.count(i) > 1]}"
    )

    for section_id in section_ids:
        assert section_id.islower(), f"Section ID should be lowercase: {section_id}"
        assert " " not in section_id, f"Section ID should not have spaces: {section_id}"

    logger.info("✅ Section structure validated: %d unique sections", len(extracted_sections))

    performance_context.set_metadata("total_sections", len(extracted_sections))

    performance_context.end_stage()

    performance_context.start_stage("validate_constraint_matching")

    sections_with_constraints = [
        s for s in extracted_sections
        if s.get("length_limit") is not None and s["length_limit"] > 0
    ]

    logger.info(
        "📊 Constraint matching: %d/%d sections have constraints",
        len(sections_with_constraints), len(extracted_sections)
    )

    # NOTE: With aggressive filtering, we may have fewer constraint matches
    assert len(sections_with_constraints) >= 1, (
        f"Should match at least some MRA constraints to sections: {len(sections_with_constraints)}"
    )

    for section in sections_with_constraints:
        section_title = section.get("title", "")
        length_limit = section.get("length_limit")
        length_source = section.get("length_source")

        assert length_limit > 0, f"length_limit must be positive for {section_title}: {length_limit}"
        assert length_source, f"length_source missing for {section_title}"

        logger.info(
            "✅ Constraint matched for '%s': %d words (source: %s)",
            section_title, length_limit, length_source
        )

    performance_context.set_metadata("sections_with_constraints", len(sections_with_constraints))
    performance_context.set_metadata(
        "constraint_match_rate",
        len(sections_with_constraints) / len(extracted_sections),
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_guideline_extraction")

    long_form_sections = [s for s in extracted_sections if s.get("long_form", False)]
    sections_with_guidelines = [s for s in long_form_sections if s.get("guidelines")]

    logger.info(
        "📊 Guideline extraction: %d/%d long-form sections have guidelines",
        len(sections_with_guidelines), len(long_form_sections)
    )

    if long_form_sections:
        guideline_coverage = len(sections_with_guidelines) / len(long_form_sections)
        assert guideline_coverage >= 0.5, (
            f"Guideline coverage too low: {guideline_coverage:.1%} "
            f"({len(sections_with_guidelines)}/{len(long_form_sections)})"
        )

        for section in sections_with_guidelines:
            section_title = section.get("title", "")
            guidelines = section.get("guidelines", [])

            assert isinstance(guidelines, list), f"Guidelines must be list for {section_title}"
            assert len(guidelines) > 0, f"Guidelines list empty for {section_title}"
            assert len(guidelines) <= 10, f"Too many guidelines for {section_title}: {len(guidelines)}"

            assert len(guidelines) == len(set(guidelines)), (
                f"Guidelines must be unique for {section_title}"
            )

            for guideline in guidelines:
                assert isinstance(guideline, str), f"Guideline must be string: {guideline}"
                assert len(guideline) > 10, f"Guideline too short for {section_title}: {guideline}"

            logger.info(
                "✅ Guidelines validated for '%s': %d unique guidelines",
                section_title, len(guidelines)
            )

        performance_context.set_metadata("guideline_coverage", guideline_coverage)

    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("sections_with_guidelines", len(sections_with_guidelines))

    performance_context.end_stage()

    performance_context.start_stage("validate_definition_generation")

    sections_with_definitions = [
        s for s in sections_with_guidelines
        if s.get("definition")
    ]

    logger.info(
        "📊 Definition generation: %d/%d sections with guidelines have definitions",
        len(sections_with_definitions), len(sections_with_guidelines)
    )

    if sections_with_guidelines:
        definition_rate = len(sections_with_definitions) / len(sections_with_guidelines)
        assert definition_rate >= 0.95, (
            f"Definition generation rate too low: {definition_rate:.1%} "
            f"({len(sections_with_definitions)}/{len(sections_with_guidelines)})"
        )

        for section in sections_with_definitions:
            section_title = section.get("title", "")
            definition = section.get("definition")
            guidelines = section.get("guidelines", [])

            assert isinstance(definition, str), f"Definition must be string for {section_title}"
            assert len(definition) > 0, f"Definition empty for {section_title}"

            if len(guidelines) == 1:
                assert definition == guidelines[0], (
                    f"Single guideline definition should match guideline for {section_title}"
                )
            elif len(guidelines) in [2, 3]:
                assert definition == guidelines[0], (
                    f"2-3 guideline definition should be first guideline for {section_title}"
                )
            elif len(guidelines) >= 4:
                assert "plus" in definition.lower() or "additional" in definition.lower(), (
                    f"4+ guideline definition should include summary text for {section_title}: {definition}"
                )

            logger.info(
                "✅ Definition validated for '%s': %d chars",
                section_title, len(definition)
            )

        performance_context.set_metadata("definition_generation_rate", definition_rate)

    performance_context.set_metadata("sections_with_definitions", len(sections_with_definitions))

    performance_context.end_stage()

    performance_context.start_stage("validate_classification")

    classification_stats = {
        "long_form": sum(1 for s in extracted_sections if s.get("long_form", False)),
        "short_form": sum(1 for s in extracted_sections if not s.get("long_form", True)),
        "is_plan": sum(1 for s in extracted_sections if s.get("is_plan", False)),
        "clinical": sum(1 for s in extracted_sections if s.get("clinical", False)),
        "needs_writing": sum(1 for s in extracted_sections if s.get("needs_writing", False)),
    }

    logger.info("📊 Classification stats: %s", classification_stats)

    assert classification_stats["long_form"] >= 3, (
        f"Should identify long-form sections in MRA CFP: {classification_stats['long_form']}"
    )
    assert classification_stats["long_form"] <= len(extracted_sections), (
        "long_form count cannot exceed total sections"
    )

    needs_writing_rate = classification_stats["needs_writing"] / len(extracted_sections)
    assert needs_writing_rate >= 0.5, (
        f"Most sections should need writing: {needs_writing_rate:.1%}"
    )

    performance_context.set_metadata("classification_stats", classification_stats)

    performance_context.end_stage()

    logger.info(
        "✅ MRA fixture extract_sections quality test completed successfully",
        extra={
            "total_sections": len(extracted_sections),
            "sections_with_constraints": len(sections_with_constraints),
            "sections_with_guidelines": len(sections_with_guidelines),
            "sections_with_definitions": len(sections_with_definitions),
            "long_form_sections": classification_stats["long_form"],
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=300)
async def test_extract_sections_nih_par_25_450_fixture_quality(
    logger: logging.Logger,
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_analysis_fixture: CFPAnalysis,
    nih_granting_institution: GrantingInstitution,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "extract_sections_fixture_quality")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("input_source", "fixture")

    logger.info("🧪 Testing extract_sections quality with NIH PAR-25-450 fixture")
    logger.info("📊 Fixture has %d content sections", len(nih_par_25_450_cfp_analysis_fixture["content"]))

    performance_context.start_stage("run_extract_sections")

    fixture_with_real_org = dict(nih_par_25_450_cfp_analysis_fixture)
    fixture_with_real_org["organization"] = {
        "id": str(nih_granting_institution.id),
        "full_name": nih_granting_institution.full_name,
        "abbreviation": nih_granting_institution.abbreviation,
    }

    cfp_analysis_stage_dto = CFPAnalysisStageDTO(
        organization=str(nih_granting_institution.id),
        cfp_analysis=fixture_with_real_org,
    )

    section_extraction_result = await handle_section_extraction_stage(
        cfp_analysis_result=cfp_analysis_stage_dto,
        job_manager=mock_job_manager,
        trace_id="nih-par-25-450-fixture-quality-test",
    )

    extracted_sections = section_extraction_result["extracted_sections"]

    performance_context.end_stage()

    performance_context.start_stage("validate_section_structure")

    logger.info("📊 Extracted %d sections from NIH fixture", len(extracted_sections))

    assert len(extracted_sections) >= 10, (
        f"Should extract substantial sections from NIH fixture: {len(extracted_sections)}"
    )
    assert len(extracted_sections) <= 25, (
        f"Should not over-extract sections from NIH fixture: {len(extracted_sections)}"
    )

    section_titles = []
    section_ids = []

    for section in extracted_sections:
        section_title = section.get("title", "")
        section_id = section.get("id", "")

        assert section_title, f"Section missing title: {section}"
        assert section_id, f"Section missing id: {section}"
        assert "order" in section, f"Order missing for {section_title}"
        assert section["order"] >= 0, f"Invalid order for {section_title}"
        assert "long_form" in section, f"long_form missing for {section_title}"

        section_titles.append(section_title)
        section_ids.append(section_id)

    assert len(section_titles) == len(set(section_titles)), (
        "Section titles must be unique"
    )
    assert len(section_ids) == len(set(section_ids)), (
        "Section IDs must be unique"
    )

    logger.info("✅ Section structure validated: %d unique sections", len(extracted_sections))

    performance_context.set_metadata("total_sections", len(extracted_sections))

    performance_context.end_stage()

    performance_context.start_stage("validate_constraint_matching")

    sections_with_constraints = [
        s for s in extracted_sections
        if s.get("length_limit") is not None and s["length_limit"] > 0
    ]

    logger.info(
        "📊 Constraint matching: %d/%d sections have constraints",
        len(sections_with_constraints), len(extracted_sections)
    )

    assert len(sections_with_constraints) >= 2, (
        f"Should match NIH constraints to sections: {len(sections_with_constraints)}"
    )

    for section in sections_with_constraints:
        section_title = section.get("title", "")
        length_limit = section.get("length_limit")
        length_source = section.get("length_source")

        assert length_limit > 0, f"length_limit must be positive for {section_title}: {length_limit}"
        assert length_source, f"length_source missing for {section_title}"

        logger.info(
            "✅ Constraint matched for '%s': %d words (source: %s)",
            section_title, length_limit, length_source
        )

    performance_context.set_metadata("sections_with_constraints", len(sections_with_constraints))
    performance_context.set_metadata(
        "constraint_match_rate",
        len(sections_with_constraints) / len(extracted_sections),
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_guideline_extraction")

    long_form_sections = [s for s in extracted_sections if s.get("long_form", False)]
    sections_with_guidelines = [s for s in long_form_sections if s.get("guidelines")]

    logger.info(
        "📊 Guideline extraction: %d/%d long-form sections have guidelines",
        len(sections_with_guidelines), len(long_form_sections)
    )

    if long_form_sections:
        guideline_coverage = len(sections_with_guidelines) / len(long_form_sections)
        assert guideline_coverage >= 0.65, (
            f"NIH guideline coverage too low: {guideline_coverage:.1%} "
            f"({len(sections_with_guidelines)}/{len(long_form_sections)})"
        )

        for section in sections_with_guidelines:
            section_title = section.get("title", "")
            guidelines = section.get("guidelines", [])

            assert len(guidelines) > 0, f"Guidelines empty for {section_title}"
            assert len(guidelines) <= 10, f"Too many guidelines for {section_title}: {len(guidelines)}"

            avg_guideline_length = sum(len(g) for g in guidelines) / len(guidelines)
            assert avg_guideline_length >= 20, (
                f"NIH guidelines too short for {section_title}: avg {avg_guideline_length:.0f} chars"
            )

            logger.info(
                "✅ Guidelines validated for '%s': %d guidelines, avg %.0f chars",
                section_title, len(guidelines), avg_guideline_length
            )

        performance_context.set_metadata("guideline_coverage", guideline_coverage)

    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("sections_with_guidelines", len(sections_with_guidelines))

    performance_context.end_stage()

    performance_context.start_stage("validate_definition_generation")

    sections_with_definitions = [
        s for s in sections_with_guidelines
        if s.get("definition")
    ]

    logger.info(
        "📊 Definition generation: %d/%d sections with guidelines have definitions",
        len(sections_with_definitions), len(sections_with_guidelines)
    )

    if sections_with_guidelines:
        definition_rate = len(sections_with_definitions) / len(sections_with_guidelines)
        assert definition_rate >= 0.95, (
            f"NIH definition generation rate too low: {definition_rate:.1%}"
        )

        for section in sections_with_definitions:
            section_title = section.get("title", "")
            definition = section.get("definition")

            assert definition, f"Definition missing for {section_title}"
            assert len(definition) > 0, f"Definition empty for {section_title}"

            logger.info(
                "✅ Definition validated for '%s': %d chars",
                section_title, len(definition)
            )

        performance_context.set_metadata("definition_generation_rate", definition_rate)

    performance_context.set_metadata("sections_with_definitions", len(sections_with_definitions))

    performance_context.end_stage()

    performance_context.start_stage("validate_classification")

    classification_stats = {
        "long_form": sum(1 for s in extracted_sections if s.get("long_form", False)),
        "is_plan": sum(1 for s in extracted_sections if s.get("is_plan", False)),
        "clinical": sum(1 for s in extracted_sections if s.get("clinical", False)),
        "needs_writing": sum(1 for s in extracted_sections if s.get("needs_writing", False)),
    }

    logger.info("📊 Classification stats: %s", classification_stats)

    assert classification_stats["clinical"] >= 1, (
        f"Should identify clinical sections in NIH trial readiness CFP: {classification_stats['clinical']}"
    )

    assert classification_stats["is_plan"] >= 1, (
        f"Should identify plan sections in NIH CFP: {classification_stats['is_plan']}"
    )

    needs_writing_rate = classification_stats["needs_writing"] / len(extracted_sections)
    assert needs_writing_rate >= 0.5, (
        f"Most NIH sections should need writing: {needs_writing_rate:.1%}"
    )

    performance_context.set_metadata("classification_stats", classification_stats)

    performance_context.end_stage()

    logger.info(
        "✅ NIH PAR-25-450 fixture extract_sections quality test completed successfully",
        extra={
            "total_sections": len(extracted_sections),
            "sections_with_constraints": len(sections_with_constraints),
            "sections_with_guidelines": len(sections_with_guidelines),
            "sections_with_definitions": len(sections_with_definitions),
            "long_form_sections": classification_stats["long_form"],
            "clinical_sections": classification_stats["clinical"],
        },
    )
