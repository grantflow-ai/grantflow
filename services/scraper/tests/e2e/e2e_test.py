import logging
import os
from datetime import UTC, datetime, timedelta

import pytest
from services.scraper.src.db_utils import get_existing_grant_identifiers
from services.scraper.src.main import run_scraper
from testing.performance_framework import Domain, ExecutionSpeed, performance_test


def _setup_test_environment(project_suffix: str = "test") -> None:
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


async def _verify_postgresql_changes(
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
        "PostgreSQL state verification successful - initial: %d, final: %d, new: %d, search: %d",
        initial_count,
        final_count,
        new_files,
        search_count,
    )


@performance_test(execution_speed=ExecutionSpeed.SMOKE, domain=Domain.SCRAPER, timeout=600)
@pytest.mark.e2e
async def test_scraper_smoke(logger: logging.Logger) -> None:
    _setup_test_environment("smoke-test")

    logger.info("Getting initial grant count")
    initial_grants = await get_existing_grant_identifiers()
    initial_count = len(initial_grants)
    logger.info("Initial grant count in PostgreSQL: %d", initial_count)

    logger.info("Running scraper with recent date range")
    recent_date = datetime.now(UTC).date() - timedelta(days=30)
    today = datetime.now(UTC).date()

    metrics = await run_scraper(from_date=recent_date, to_date=today)
    logger.info("Scraper completed: %s", metrics)

    logger.info("Validating metrics")
    await _validate_scraper_metrics(metrics, logger)

    logger.info("Verifying PostgreSQL changes")
    await _verify_postgresql_changes(metrics, initial_count, logger)

    logger.info("Scraper smoke test passed successfully")


@performance_test(execution_speed=ExecutionSpeed.E2E_FULL, domain=Domain.SCRAPER, timeout=1800)
@pytest.mark.e2e
async def test_scraper_full_e2e(logger: logging.Logger) -> None:
    _setup_test_environment("full-e2e-test")

    logger.info("Getting initial grant count for full e2e test")
    initial_grants = await get_existing_grant_identifiers()
    initial_count = len(initial_grants)
    logger.info("Initial grant count in PostgreSQL: %d", initial_count)

    logger.info("Running scraper with wider date range for full e2e")
    from_date = datetime.now(UTC).date() - timedelta(days=90)
    to_date = datetime.now(UTC).date()

    metrics = await run_scraper(from_date=from_date, to_date=to_date)
    logger.info("Full e2e scraper completed: %s", metrics)

    logger.info("Validating full e2e metrics")
    await _validate_scraper_metrics(metrics, logger)

    logger.info("Verifying PostgreSQL changes for full e2e")
    await _verify_postgresql_changes(metrics, initial_count, logger)

    if metrics["search_results_count"] > 0:
        final_grants = await get_existing_grant_identifiers()
        logger.info(
            "Full e2e test - verified grants persisted to PostgreSQL",
            extra={
                "initial_count": initial_count,
                "final_count": len(final_grants),
                "new_grants": metrics["new_files_downloaded"],
            },
        )

    logger.info("Scraper full e2e test passed successfully")
