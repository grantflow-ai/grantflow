import logging
from os import environ

import pytest
from packages.shared_utils.src.exceptions import (
    ExternalOperationError,
    UrlParsingError,
    ValidationError,
)

from services.crawler.src.extraction import extract_links, prepare_url_data


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.e2e_full
@pytest.mark.timeout(120)
@pytest.mark.parametrize(
    "test_url,expected_content",
    [
        ("https://httpbin.org/html", "Herman Melville"),
        ("https://example.com", "Example Domain"),
    ],
)
async def test_url_content_extraction(
    logger: logging.Logger, test_url: str, expected_content: str
) -> None:
    """Test URL content extraction with real web requests"""
    logger.info("Running URL content extraction test for %s", test_url)

    try:
        html_content, visited_urls = await prepare_url_data(test_url)

        assert html_content is not None, "HTML content is None"
        assert isinstance(html_content, str), "HTML content should be a string"
        assert len(html_content) > 100, (
            f"HTML content too short: {len(html_content)} chars"
        )
        assert expected_content.lower() in html_content.lower(), (
            f"Expected content '{expected_content}' not found"
        )
        assert test_url in visited_urls, f"Test URL {test_url} not in visited URLs"

        doc_links, normal_links = extract_links(html_content, test_url)
        total_links = len(doc_links) + len(normal_links)

        logger.info(
            "✓ URL content extraction test passed: %s - %d chars, %d links (%d docs, %d normal)",
            test_url,
            len(html_content),
            total_links,
            len(doc_links),
            len(normal_links),
        )

    except (UrlParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("URL content extraction failed for %s: %s", test_url, e)
        pytest.fail(f"URL content extraction failed for {test_url}: {e}")
    except Exception as e:
        logger.exception("Unexpected error in URL extraction for %s", test_url)
        pytest.fail(f"Unexpected URL extraction error for {test_url}: {e}")


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.e2e_full
async def test_link_extraction_comprehensive(logger: logging.Logger) -> None:
    """Test comprehensive link extraction with various link types"""
    logger.info("Running comprehensive link extraction test")

    test_html = """
    <html>
    <head><title>Test Page</title></head>
    <body>
        <h1>Sample Grant Website</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/grants/current">Current Grants</a>
        </nav>
        <main>
            <h2>Documents</h2>
            <ul>
                <li><a href="/docs/application-form.pdf">Application Form (PDF)</a></li>
                <li><a href="/docs/guidelines.docx">Guidelines (Word)</a></li>
                <li><a href="https://external.gov/regulations.pdf">Federal Regulations</a></li>
                <li><a href="mailto:grants@example.com">Contact Email</a></li>
                <li><a href="tel:+1234567890">Phone</a></li>
            </ul>
            <h2>Resources</h2>
            <a href="../resources/templates.zip">Templates Archive</a>
            <a href="http://unsecure.example.com/old-page">Legacy Page</a>
        </main>
        <footer>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
        </footer>
    </body>
    </html>
    """

    base_url = "https://grants.example.com/current-page"

    try:
        doc_links, normal_links = extract_links(test_html, base_url)
        all_links = list(doc_links) + list(normal_links)

        assert len(all_links) > 0, "No links extracted"

        link_set = set(all_links)

        expected_absolute_links = [
            "https://grants.example.com/",
            "https://grants.example.com/about",
            "https://grants.example.com/grants/current",
            "https://grants.example.com/docs/application-form.pdf",
            "https://grants.example.com/docs/guidelines.docx",
            "https://grants.example.com/privacy",
            "https://grants.example.com/terms",
        ]

        for expected_link in expected_absolute_links:
            assert expected_link in link_set, (
                f"Expected link not found: {expected_link}"
            )

        assert "https://external.gov/regulations.pdf" in link_set, (
            "External absolute URL not preserved"
        )

        assert "https://grants.example.com/resources/templates.zip" in link_set, (
            "Relative path not resolved correctly"
        )

        mailto_links = [link for link in all_links if link.startswith("mailto:")]
        tel_links = [link for link in all_links if link.startswith("tel:")]

        http_links = [link for link in all_links if link.startswith("http")]
        assert len(http_links) >= 6, f"Too few HTTP links extracted: {len(http_links)}"

        logger.info(
            "✓ Comprehensive link extraction test passed: %d total links (%d docs, %d normal), %d HTTP links, %d mailto, %d tel",
            len(all_links),
            len(doc_links),
            len(normal_links),
            len(http_links),
            len(mailto_links),
            len(tel_links),
        )

    except (ValidationError, ExternalOperationError) as e:
        logger.error("Comprehensive link extraction test failed: %s", e)
        pytest.fail(f"Comprehensive link extraction test failed: {e}")
    except Exception as e:
        logger.exception("Unexpected error in comprehensive link extraction")
        pytest.fail(f"Unexpected comprehensive link extraction error: {e}")
