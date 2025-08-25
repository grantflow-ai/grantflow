import logging
import os
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from services.scraper.src.firestore_utils import get_existing_grant_identifiers, get_grants_collection
from services.scraper.src.main import run_scraper
from testing.e2e_utils import E2ETestCategory, ProgressReporter, e2e_test


def _setup_test_environment(project_suffix: str = "test") -> None:
    os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
    os.environ["GCP_PROJECT_ID"] = f"grantflow-{project_suffix}"
    os.environ["ENVIRONMENT"] = "test"


async def _validate_scraper_metrics(metrics: dict[str, int | float], logger: logging.Logger) -> None:
    required_metrics = [
        "search_results_count",
        "new_files_downloaded",
        "existing_files_skipped",
        "existing_files_count",
        "total_duration_ms",
    ]

    for metric in required_metrics:
        assert metric in metrics, f"Missing required metric: {metric}"
        assert isinstance(metrics[metric], (int, float)), (
            f"Metric {metric} should be numeric, got {type(metrics[metric])}"
        )
        assert metrics[metric] >= 0, f"Metric {metric} should be non-negative, got {metrics[metric]}"

    assert metrics["total_duration_ms"] > 0, "Scraper should have taken some time to run"

    search_count = metrics["search_results_count"]
    new_files = metrics["new_files_downloaded"]
    skipped_files = metrics["existing_files_skipped"]

    assert search_count == new_files + skipped_files, (
        f"Search results ({search_count}) should equal new files ({new_files}) + skipped ({skipped_files})"
    )

    logger.info("Metrics validation passed")


async def _verify_firestore_changes(
    metrics: dict[str, int | float], initial_count: int, logger: logging.Logger
) -> None:
    search_count = int(metrics["search_results_count"])
    new_files = int(metrics["new_files_downloaded"])

    if search_count == 0:
        logger.info("No search results found - this is acceptable for recent date ranges")
        return

    final_grants = await get_existing_grant_identifiers()
    final_count = len(final_grants)

    expected_final_count = initial_count + new_files
    assert final_count >= expected_final_count, (
        f"Final count ({final_count}) should be at least initial ({initial_count}) + new ({new_files})"
    )

    logger.info(
        "Firestore state verification successful - initial: %d, final: %d, new: %d, search: %d",
        initial_count,
        final_count,
        new_files,
        search_count,
    )


async def _verify_basic_document_structure(logger: logging.Logger, sample_size: int) -> None:
    if sample_size == 0:
        return

    collection = await get_grants_collection()
    docs_query = collection.limit(sample_size)
    docs = [doc async for doc in docs_query.stream()]

    assert len(docs) > 0, "Should have at least one document in Firestore"

    for i, doc in enumerate(docs):
        doc_data = doc.to_dict()

        required_fields = ["url", "created_at", "updated_at", "scraped_at"]
        for field in required_fields:
            assert field in doc_data, f"Document {i} missing required field: {field}"

        url = doc_data["url"]
        assert isinstance(url, str), f"URL should be string in doc {i}: {url}"
        assert "grants.nih.gov" in url, f"Invalid NIH URL in doc {i}: {url}"

        for ts_field in ["created_at", "updated_at", "scraped_at"]:
            ts_value = doc_data[ts_field]
            assert isinstance(ts_value, str), f"Timestamp {ts_field} should be string in doc {i}"
            assert "T" in ts_value, f"Timestamp {ts_field} missing 'T' in doc {i}: {ts_value}"
            assert "Z" in ts_value, f"Timestamp {ts_field} missing 'Z' in doc {i}: {ts_value}"

    logger.info(
        "Basic document structure verification passed - verified %d docs, sample URL: %s",
        len(docs),
        docs[0].to_dict()["url"] if docs else "none",
    )


async def _verify_page_content_quality(logger: logging.Logger, sample_count: int) -> None:
    if sample_count == 0:
        logger.info("No documents to verify page content for")
        return

    collection = await get_grants_collection()

    docs_with_content = []
    async for doc in collection.limit(sample_count * 3).stream():
        doc_data = doc.to_dict()
        if doc_data.get("page_content"):
            docs_with_content.append((doc.id, doc_data))
            if len(docs_with_content) >= sample_count:
                break

    if len(docs_with_content) == 0:
        logger.warning("No documents with page content found - page downloading may not be working")
        return

    content_lengths = []
    for doc_id, doc_data in docs_with_content:
        page_content = doc_data["page_content"]

        assert isinstance(page_content, str), f"Page content should be string for doc {doc_id}"
        assert len(page_content.strip()) > 50, f"Page content too short for doc {doc_id}: {len(page_content)} chars"

        words = page_content.split()
        assert len(words) > 10, f"Page content has too few words for doc {doc_id}: {len(words)}"

        content_lower = page_content.lower()
        grant_terms = ["grant", "funding", "research", "application", "award"]
        found_terms = sum(1 for term in grant_terms if term in content_lower)
        assert found_terms > 0, f"Page content lacks grant-related terms for doc {doc_id}"

        assert "content_scraped_at" in doc_data, f"Missing content_scraped_at timestamp for doc {doc_id}"

        content_lengths.append(len(page_content))

    avg_length = sum(content_lengths) // len(content_lengths)
    logger.info(
        "Page content quality verification passed - verified %d docs, avg length: %d, range: %d-%d",
        len(docs_with_content),
        avg_length,
        min(content_lengths),
        max(content_lengths),
    )


async def _verify_document_structure_integrity(logger: logging.Logger) -> None:
    collection = await get_grants_collection()

    docs = [doc async for doc in collection.limit(10).stream()]

    if len(docs) == 0:
        logger.info("No documents to verify structure integrity for")
        return

    structure_issues: list[str] = []

    for doc in docs:
        doc_data = doc.to_dict()
        doc_id = doc.id

        required_fields = ["url", "created_at", "updated_at", "scraped_at"]
        missing_fields = [field for field in required_fields if field not in doc_data]
        structure_issues.extend(f"Doc {doc_id} missing {field}" for field in missing_fields)

        if "url" in doc_data:
            url = doc_data["url"]
            if not isinstance(url, str) or "grants.nih.gov" not in url:
                structure_issues.append(f"Doc {doc_id} has invalid URL: {url}")

        for ts_field in ["created_at", "updated_at", "scraped_at"]:
            if ts_field in doc_data:
                ts_value = doc_data[ts_field]
                if not isinstance(ts_value, str) or "T" not in ts_value:
                    structure_issues.append(f"Doc {doc_id} has malformed {ts_field}: {ts_value}")

    if structure_issues:
        logger.error("Document structure integrity issues found: %s", structure_issues[:5])
        raise AssertionError(f"Document structure issues: {structure_issues[:3]}")

    logger.info("Document structure integrity verification passed - verified %d docs", len(docs))


async def _validate_search_storage_consistency(metrics: dict[str, int | float], logger: logging.Logger) -> None:
    search_count = int(metrics["search_results_count"])
    new_files = int(metrics["new_files_downloaded"])
    skipped_files = int(metrics["existing_files_skipped"])

    assert search_count == new_files + skipped_files, (
        f"Inconsistent counts: search={search_count}, new={new_files}, skipped={skipped_files}"
    )

    if search_count > 0:
        stored_grants = await get_existing_grant_identifiers()
        assert len(stored_grants) >= new_files, (
            f"Stored grants ({len(stored_grants)}) should be at least new files ({new_files})"
        )

    logger.info(
        "Search-storage consistency validation passed - search: %d, new: %d, skipped: %d",
        search_count,
        new_files,
        skipped_files,
    )


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
async def test_scraper_smoke(logger: logging.Logger) -> None:
    progress = ProgressReporter(logger, "scraper_smoke", 6)

    progress.report_step("Setting up emulator environment")
    _setup_test_environment()

    with patch("packages.shared_utils.src.discord.send_scraper_report") as mock_discord:
        mock_discord.return_value = None

        progress.report_step("Configuring test date range")
        today = datetime.now(UTC).date()
        yesterday = today - timedelta(days=1)

        logger.info("Running smoke test from %s to %s", yesterday.isoformat(), today.isoformat())

        progress.report_step("Getting baseline Firestore state")
        initial_grants = await get_existing_grant_identifiers()
        initial_count = len(initial_grants)

        progress.report_step(
            "Executing real scraper with NIH integration",
            {"initial_grants": initial_count, "date_range": f"{yesterday} to {today}"},
        )

        metrics = await run_scraper(from_date=yesterday, to_date=today)

        progress.report_step("Validating metrics and data consistency")
        await _validate_scraper_metrics(metrics, logger)

        progress.report_step("Verifying Firestore data integrity")
        await _verify_firestore_changes(metrics, initial_count, logger)

        progress.report_final_status(
            True,
            {
                "search_results": metrics["search_results_count"],
                "new_files": metrics["new_files_downloaded"],
                "duration_ms": metrics["total_duration_ms"],
            },
        )


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=900)
async def test_scraper_quality_assessment(logger: logging.Logger) -> None:
    progress = ProgressReporter(logger, "scraper_quality_assessment", 8)

    progress.report_step("Setting up extended test environment")
    _setup_test_environment(project_suffix="extended")

    with patch("packages.shared_utils.src.discord.send_scraper_report") as mock_discord:
        mock_discord.return_value = None

        progress.report_step("Configuring extended date range")
        today = datetime.now(UTC).date()
        week_ago = today - timedelta(days=7)

        logger.info("Running quality assessment test from %s to %s", week_ago.isoformat(), today.isoformat())

        progress.report_step("Getting baseline Firestore state")
        initial_grants = await get_existing_grant_identifiers()
        initial_count = len(initial_grants)

        progress.report_step(
            "Executing extended scraper run",
            {
                "initial_grants": initial_count,
                "date_range": f"{week_ago} to {today}",
                "expected_results": "Higher volume expected",
            },
        )

        metrics = await run_scraper(from_date=week_ago, to_date=today)

        progress.report_step("Validating extended metrics")
        await _validate_scraper_metrics(metrics, logger)

        progress.report_step("Verifying data changes in Firestore")
        search_count = metrics["search_results_count"]
        new_files = metrics["new_files_downloaded"]

        await _verify_firestore_changes(metrics, initial_count, logger)

        progress.report_step("Testing page content quality and structure")
        if new_files > 0:
            await _verify_page_content_quality(logger, min(5, int(new_files)))
            await _verify_document_structure_integrity(logger)
        else:
            logger.warning("No new files downloaded in 7-day period - may indicate data issue")

        progress.report_step("Validating search vs storage consistency")
        await _validate_search_storage_consistency(metrics, logger)

        progress.report_final_status(
            True,
            {
                "search_results": search_count,
                "new_files": new_files,
                "quality_checks": "passed",
                "duration_ms": metrics["total_duration_ms"],
            },
        )
