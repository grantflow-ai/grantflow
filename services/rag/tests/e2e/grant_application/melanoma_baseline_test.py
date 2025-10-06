import logging
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.tables import GrantApplication
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test
from testing.scenarios.base import load_scenario


def create_mock_job_manager() -> AsyncMock:
    mock_job_manager = AsyncMock()
    mock_job_manager.create_grant_application_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    return mock_job_manager


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1800)
async def test_generate_melanoma_baseline_application_text(
    logger: logging.Logger,
    melanoma_alliance_full_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
) -> None:
    from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
    from services.rag.src.grant_application.utils import generate_application_text

    scenario = load_scenario("melanoma_alliance_baseline")

    performance_context.set_metadata("scenario_name", scenario.scenario_name)
    performance_context.set_metadata("test_type", "baseline_application_generation")
    performance_context.set_metadata("application_type", "melanoma_alliance")
    performance_context.set_metadata("uses_existing_data", True)
    performance_context.set_metadata("researcher", scenario.metadata.researcher)

    logger.info("📄 Generating melanoma baseline application using scenario: %s", scenario.scenario_name)

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    async with async_session_maker() as session:
        grant_application = await session.scalar(
            select_active(GrantApplication)
            .where(GrantApplication.id == melanoma_alliance_full_application.id)
            .options(selectinload(GrantApplication.grant_template))
        )

        if not grant_application:
            raise ValueError("Grant application not found")

        if not grant_application.grant_template:
            raise ValueError("Grant application has no template")

        if not grant_application.grant_template.grant_sections:
            raise ValueError("Grant template has no sections")

    performance_context.start_stage("generate_full_application_text")

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        trace_id="melanoma-baseline-e2e-test",
    )

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    async with async_session_maker() as session:
        updated_application = await session.scalar(
            select_active(GrantApplication)
            .where(GrantApplication.id == grant_application.id)
            .options(selectinload(GrantApplication.grant_template))
        )

        if not updated_application:
            raise ValueError("Failed to retrieve updated application")

        section_texts = {}
        if updated_application.rag_jobs and updated_application.rag_jobs[0].checkpoint_data:
            checkpoint_data = updated_application.rag_jobs[0].checkpoint_data
            if "section_texts" in checkpoint_data:
                section_texts = {text["section_id"]: text["text"] for text in checkpoint_data["section_texts"]}
        text = generate_application_text(
            title=updated_application.title or "Grant Application",
            grant_sections=updated_application.grant_template.grant_sections,
            section_texts=section_texts,
        )

    performance_context.end_stage()

    performance_context.start_stage("validate_baseline_content")

    assert text, "Generated text should not be empty"
    assert len(text) > 1000, f"Generated text too short: {len(text)} characters"
    assert "# " in text, "Generated text should have at least one markdown header"

    assert section_texts, "Section texts should not be empty"
    assert len(section_texts) > 0, "There should be at least one section"

    for section_title, section_content in section_texts.items():
        assert isinstance(section_title, str), f"Section title should be a string: {section_title}"
        assert isinstance(section_content, str), f"Section content should be a string: {section_content}"
        assert len(section_content) > 0, f"Section content for '{section_title}' should not be empty"
        assert section_content in text, f"Section content for '{section_title}' not found in the full text"

    melanoma_terms = ["melanoma", "cancer", "immunotherapy", "treatment", "metastases"]
    found_terms = [term for term in melanoma_terms if term.lower() in text.lower()]
    assert len(found_terms) >= 3, f"Should contain melanoma research terminology, found: {found_terms}"

    word_count = len(text.split())
    assert word_count > 200, f"Generated text should have substantial content: {word_count} words"

    performance_context.end_stage()

    character_count = len(text)
    section_count = len(section_texts)
    avg_section_length = (
        sum(len(content) for content in section_texts.values()) / len(section_texts) if section_texts else 0
    )

    performance_context.set_metadata("generated_word_count", word_count)
    performance_context.set_metadata("generated_character_count", character_count)
    performance_context.set_metadata("section_count", section_count)
    performance_context.set_metadata("avg_section_length", avg_section_length)
    performance_context.set_metadata("melanoma_terms_found", found_terms)
    performance_context.set_metadata("source_files_count", len(scenario.get_source_files()))

    logger.info(
        "✅ Melanoma baseline application generated successfully",
        extra={
            "scenario": scenario.scenario_name,
            "words": word_count,
            "characters": character_count,
            "sections": section_count,
            "avg_section_length": f"{avg_section_length:.0f}",
            "melanoma_terms": len(found_terms),
            "source_files": len(scenario.get_source_files()),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_APPLICATION, timeout=900)
async def test_validate_melanoma_scenario_structure(
    logger: logging.Logger,
    performance_context: PerformanceTestContext,
) -> None:
    logger.info("🔍 Validating melanoma baseline scenario structure and metadata")

    scenario = load_scenario("melanoma_alliance_baseline")

    performance_context.set_metadata("scenario_name", scenario.scenario_name)
    performance_context.set_metadata("validation_type", "scenario_structure")

    performance_context.start_stage("validate_metadata")

    metadata = scenario.metadata
    assert metadata.name == "Melanoma Alliance Baseline", f"Unexpected scenario name: {metadata.name}"
    assert metadata.researcher == "Baseline", f"Unexpected researcher: {metadata.researcher}"
    assert metadata.grant_type == "Melanoma Alliance", f"Unexpected grant type: {metadata.grant_type}"
    assert metadata.research_domain == "melanoma_immunotherapy", (
        f"Unexpected research domain: {metadata.research_domain}"
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_research_objectives")

    objectives = scenario.research_objectives
    assert len(objectives) >= 2, f"Should have at least 2 research objectives, got {len(objectives)}"

    immunotherapy_objective = next((obj for obj in objectives if "immunotherapy" in obj.get("title", "")), None)
    assert immunotherapy_objective is not None, "Should have an objective about immunotherapy"

    performance_context.end_stage()

    performance_context.start_stage("validate_form_inputs")

    form_inputs = scenario.form_inputs
    required_fields = ["background_context", "hypothesis", "rationale", "novelty_and_innovation"]
    for field in required_fields:
        assert field in form_inputs, f"Missing required form input field: {field}"
        field_value = str(form_inputs.get(field, ""))
        assert len(field_value) > 20, f"Form input '{field}' too short: {len(field_value)}"

    background = str(form_inputs.get("background_context", "")).lower()
    hypothesis = str(form_inputs.get("hypothesis", "")).lower()
    assert "melanoma" in background, "Background should mention melanoma"
    assert "car-t" in hypothesis, "Hypothesis should mention CAR-T"

    performance_context.end_stage()

    performance_context.start_stage("validate_file_structure")

    assert scenario.cfp_file.exists(), f"CFP file should exist: {scenario.cfp_file}"
    assert scenario.sources_dir.exists(), f"Sources directory should exist: {scenario.sources_dir}"
    assert scenario.fixtures_dir.exists(), f"Fixtures directory should exist: {scenario.fixtures_dir}"

    source_files = scenario.get_source_files()
    assert len(source_files) > 0, "Should have source files for melanoma research"

    fixture_files = scenario.get_fixture_files()
    assert len(fixture_files) > 0, "Should have fixture files (grant templates)"

    performance_context.end_stage()

    logger.info(
        "✅ Melanoma baseline scenario structure validation completed",
        extra={
            "scenario": scenario.scenario_name,
            "objectives_count": len(objectives),
            "source_files": len(source_files),
            "fixture_files": len(fixture_files),
        },
    )
