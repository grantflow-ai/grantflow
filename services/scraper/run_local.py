#!/usr/bin/env python
"""Run the scraper locally for debugging."""
import asyncio
import logging
import os
import traceback
from datetime import UTC, datetime

from services.scraper.src.main import run_scraper

# Configure logging to see detailed output
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

async def main() -> None:
    """Run the scraper with GCS emulator."""
    # Set up environment for GCS emulator
    os.environ["STORAGE_EMULATOR_HOST"] = "http://localhost:8080"
    os.environ["SCRAPER_GCS_BUCKET_NAME"] = "grantflow-scraper-local"

    # Set date range - from beginning of time to today
    to_date = datetime.now(UTC).date()
    from_date = datetime(1991, 1, 2, tzinfo=UTC).date()  # NIH default start date

    print("Running scraper locally with GCS emulator...")
    print(f"Date range: {from_date} to {to_date}")
    print(f"GCS bucket: {os.environ['SCRAPER_GCS_BUCKET_NAME']}")
    print(f"Emulator: {os.environ['STORAGE_EMULATOR_HOST']}")
    print("-" * 50)

    try:
        metrics = await run_scraper(
            from_date=from_date,
            to_date=to_date
        )

        print("\nScraper completed successfully!")
        print(f"Search results found: {metrics['search_results_count']}")
        print(f"New files downloaded: {metrics['new_files_downloaded']}")
        print(f"Existing files skipped: {metrics['existing_files_skipped']}")
        print(f"Total duration: {metrics['total_duration_ms']}ms")

        print("\nNote: Files are stored in the GCS emulator.")
        print("To view files, use: gsutil -o 'Credentials:gs_json_host=localhost:8080' ls gs://grantflow-scraper-local/")

    except Exception as e:
        print(f"\nError running scraper: {e}")
        traceback.print_exc()
        print("\nMake sure the GCS emulator is running:")
        print("  task emulator:gcs:up")

if __name__ == "__main__":
    asyncio.run(main())
