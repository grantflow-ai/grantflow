"""
E2E test for red team critical review workflow.

Tests the complete flow: Load existing application → Run critical review → Save outputs.
"""

import logging
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=180)
async def test_red_team_critical_review_workflow(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
) -> None:
    """Test complete red team review workflow with real application and CFP."""
    from services.rag.src.utils.red_team_reviewer import run_critical_review

    performance_context.set_metadata("test_type", "red_team_review_workflow")
    performance_context.set_metadata("includes", "application_load,kb_retrieval,critical_review,markdown_export")

    logger.info("🔍 Starting red team critical review E2E test")

    app_path = Path(
        "testing/results/red_team/2025-10-23/novel_crispr-based_therapeutics_for_melanoma_treat_20251023_093319.md"
    )

    if not app_path.exists():
        pytest.skip(f"Test application not found at {app_path}. Run pipeline first to generate test data.")

    application_text = app_path.read_text()
    logger.info("✓ Loaded application (%s characters)", f"{len(application_text):,}")

    cfp_path = Path("testing/test_data/fixtures/cfps/melanoma_alliance.md")
    if not cfp_path.exists():
        pytest.skip(f"CFP fixture not found at {cfp_path}")

    cfp_text = cfp_path.read_text()
    logger.info("✓ Loaded CFP (%s characters)", f"{len(cfp_text):,}")

    # Load knowledge base (optional - for testing without real application_id)
    # In production, use retrieve_knowledge_base_for_application(application_id, trace_id)
    knowledge_base_path = Path("testing/test_data/fixtures/knowledge_bases/melanoma_research.txt")
    knowledge_base = None
    if knowledge_base_path.exists():
        knowledge_base = knowledge_base_path.read_text()
        logger.info("✓ Loaded knowledge base: %s chars", f"{len(knowledge_base):,}")
    else:
        logger.info("⚠ No knowledge base file found, proceeding without source verification")

    # Run critical review
    performance_context.start_stage("critical_review")

    review = await run_critical_review(
        application_text=application_text,
        cfp_text=cfp_text,
        knowledge_base=knowledge_base,
        trace_id="red-team-e2e-test",
    )

    performance_context.end_stage()

    # Validate review structure
    assert "review_letter" in review, "Review missing review_letter"
    assert len(review["review_letter"]) > 0, "Review letter should not be empty"

    word_count = len(review["review_letter"].split())
    logger.info("✓ Review completed: %s words, %s characters", word_count, len(review["review_letter"]))
    logger.info("  Letter preview: %s...", review["review_letter"][:150])

    min_review_words = 300
    target_review_words_range = (600, 1000)
    assert word_count >= min_review_words, (
        f"Review letter too short: {word_count} words "
        f"(minimum: {min_review_words}, target: {target_review_words_range[0]}-{target_review_words_range[1]})"
    )

    # Save outputs to demonstrate full workflow
    performance_context.start_stage("save_outputs")

    from datetime import UTC, datetime

    timestamp = datetime.now(UTC)
    output_dir = Path("testing/results/red_team") / timestamp.strftime("%Y-%m-%d")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Build review markdown
    review_md_path = output_dir / f"e2e_test_review_{timestamp.strftime('%H%M%S')}.md"

    review_md = f"""# Red Team Critical Review (E2E Test)

**Generated:** {timestamp.isoformat()}
**Word Count:** {word_count}
**Source Verification:** {"Enabled" if knowledge_base else "Disabled"}

---

{review["review_letter"]}
"""

    review_md_path.write_text(review_md)

    logger.info("✓ Saved review markdown to %s", review_md_path)

    performance_context.end_stage()

    # Assertions
    assert review_md_path.exists(), "Review markdown file should be created"

    logger.info("✅ Red team review E2E test completed successfully")

    performance_context.set_metadata("word_count", word_count)
    performance_context.set_metadata("review_length", len(review["review_letter"]))
    performance_context.set_metadata("output_file", str(review_md_path))
    performance_context.set_metadata("has_knowledge_base", knowledge_base is not None)
