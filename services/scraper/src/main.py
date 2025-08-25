import time
from datetime import date
from typing import NotRequired, TypedDict

from litestar import post
from packages.shared_utils.src.discord import send_scraper_report
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.server import create_litestar_app
from services.scraper.src.db_utils import get_existing_grant_identifiers
from services.scraper.src.grant_pages import download_grant_pages
from services.scraper.src.search_data import DEFAULT_FROM_DATE, TODAY_DATE, download_search_data

configure_otel("scraper")

logger = get_logger(__name__)


class ScraperResponse(TypedDict):
    message: str
    status: str
    search_results_count: NotRequired[int]
    search_results_found: NotRequired[int]
    new_files_downloaded: NotRequired[int]
    existing_files_skipped: NotRequired[int]
    existing_files_count: NotRequired[int]
    total_duration_ms: NotRequired[float]
    total_processing_time_ms: NotRequired[float]


async def run_scraper(from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> dict[str, int | float]:
    start_time = time.time()

    logger.info(
        "Starting scraper run",
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
    )

    existing_grant_identifiers = await get_existing_grant_identifiers()
    logger.info("Found existing grant identifiers", count=len(existing_grant_identifiers))

    search_results = await download_search_data(from_date=from_date, to_date=to_date)
    logger.info("Downloaded search results", count=len(search_results))

    new_files_downloaded = await download_grant_pages(
        search_results=search_results, existing_file_identifiers=existing_grant_identifiers
    )

    total_duration = time.time() - start_time
    total_duration_ms = round(total_duration * 1000, 2)

    search_results_count = len(search_results)
    existing_grants_count = len(existing_grant_identifiers)
    existing_grants_skipped = search_results_count - new_files_downloaded

    logger.info(
        "Scraper run completed",
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        search_results_count=search_results_count,
        new_files_downloaded=new_files_downloaded,
        existing_grants_skipped=existing_grants_skipped,
        existing_identifiers_count=existing_grants_count,
        total_duration_ms=total_duration_ms,
    )

    return {
        "search_results_count": search_results_count,
        "new_files_downloaded": new_files_downloaded,
        "existing_files_skipped": existing_grants_skipped,
        "existing_files_count": existing_grants_count,
        "total_duration_ms": total_duration_ms,
    }


@post("/")
async def handle_scraper_request() -> ScraperResponse:
    start_time = time.time()
    logger.info("Received scraper request")

    discord_webhook_url = get_env("DISCORD_WEBHOOK_URL", raise_on_missing=False, fallback="")
    environment = get_env("ENVIRONMENT", raise_on_missing=False, fallback="staging")

    try:
        logger.info("Using PostgreSQL for grant storage")

        metrics = await run_scraper()

        total_duration = time.time() - start_time
        logger.info(
            "Scraper request completed successfully",
            total_duration_ms=round(total_duration * 1000, 2),
        )

        if discord_webhook_url:
            try:
                try:
                    all_grants = await get_existing_grant_identifiers()
                    total_grants_in_postgresql = len(all_grants)
                except (ValueError, RuntimeError, OSError) as ex:
                    logger.warning("Could not get total grant count from PostgreSQL", error=str(ex))

                await send_scraper_report(
                    webhook_url=discord_webhook_url,
                    environment=environment,
                    date_range=f"{DEFAULT_FROM_DATE.isoformat()} to {TODAY_DATE.isoformat()}",
                    search_results_found=int(metrics["search_results_count"]),
                    new_files_downloaded=int(metrics["new_files_downloaded"]),
                    existing_files_skipped=int(metrics["existing_files_skipped"]),
                    total_processing_time_ms=metrics["total_duration_ms"],
                    bucket_name="postgresql:grants",
                    total_files_in_bucket=total_grants_in_postgresql,
                    success=True,
                )
                logger.info("Discord notification sent successfully")
            except Exception:
                logger.exception("Failed to send Discord notification")
        else:
            logger.info("Discord webhook URL not configured, skipping notification")

        return ScraperResponse(
            status="success",
            message="Finished scraping NIH grants",
            search_results_found=int(metrics["search_results_count"]),
            new_files_downloaded=int(metrics["new_files_downloaded"]),
            existing_files_skipped=int(metrics["existing_files_skipped"]),
            total_processing_time_ms=metrics["total_duration_ms"],
        )

    except Exception as e:
        error_duration = time.time() - start_time
        logger.exception(
            "Scraper request failed",
            error_type=type(e).__name__,
            error_duration_ms=round(error_duration * 1000, 2),
        )

        if discord_webhook_url:
            try:
                await send_scraper_report(
                    webhook_url=discord_webhook_url,
                    environment=environment,
                    date_range=f"{DEFAULT_FROM_DATE.isoformat()} to {TODAY_DATE.isoformat()}",
                    search_results_found=0,
                    new_files_downloaded=0,
                    existing_files_skipped=0,
                    total_processing_time_ms=round(error_duration * 1000, 2),
                    bucket_name="postgresql:grants",
                    success=False,
                    error_message=str(e),
                )
                logger.info("Discord failure notification sent")
            except Exception:
                logger.exception("Failed to send Discord failure notification")

        raise


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_scraper_request,
    ],
    add_session_maker=True,
)
