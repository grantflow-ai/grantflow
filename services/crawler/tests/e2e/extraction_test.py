from os import environ

import pytest
from services.crawler.src.extraction import crawl_url


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extraction() -> None:
    url = "https://www.cosmos.esa.int/web/bepicolombo-ids-gi-2025"
    results, files = await crawl_url(url)
    assert len(results) == 27
    assert len(files) == 2
