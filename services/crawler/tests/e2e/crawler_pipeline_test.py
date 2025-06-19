import logging
from typing import Any

import pytest
from packages.db.src.tables import GrantApplicationRagSource
from packages.shared_utils.src.exceptions import (
    ExternalOperationError,
    UrlParsingError,
    ValidationError,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import (
    E2ETestCategory,
    e2e_test,
    validate_content_quality,
    validate_embedding_quality,
)

from services.crawler.src.extraction import (
    crawl_url,
    download_documents,
    extract_and_process_content,
    extract_links,
    find_relevant_links,
    prepare_url_data,
)


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
@pytest.mark.parametrize(
    "test_url,expected_content",
    [
        ("https://httpbin.org/html", "Herman Melville"),
        ("https://example.com", "Example Domain"),
    ],
)
async def test_url_preparation_smoke(
    logger: logging.Logger, test_url: str, expected_content: str
) -> None:
    logger.info("Running smoke test for URL preparation: %s", test_url)

    try:
        html_content, visited_urls = await prepare_url_data(test_url)

        assert html_content is not None, "HTML content is None"
        assert isinstance(html_content, str), "HTML content should be a string"
        assert len(html_content) > 50, (
            f"HTML content too short: {len(html_content)} chars"
        )
        assert expected_content in html_content, (
            f"Expected content '{expected_content}' not found in HTML"
        )
        assert test_url in visited_urls, f"Test URL {test_url} not in visited URLs"

        logger.info(
            "✓ URL preparation smoke test passed: %d chars retrieved", len(html_content)
        )
    except (UrlParsingError, ValidationError, ExternalOperationError) as e:
        pytest.fail(f"URL preparation failed for {test_url}: {e}")


@e2e_test(category=E2ETestCategory.SMOKE, timeout=90)
async def test_link_extraction_smoke(logger: logging.Logger) -> None:
    logger.info("Running smoke test for link extraction")

    test_html = """
    <html>
    <body>
        <h1>Test Page</h1>
        <a href="https://example.com/doc1.pdf">Document 1</a>
        <a href="/relative/doc2.pdf">Document 2</a>
        <a href="mailto:test@example.com">Email</a>
        <a href="https://example.com/page1">Page 1</a>
        <a href="https://external.com/page">External</a>
    </body>
    </html>
    """
    base_url = "https://example.com"

    try:
        doc_links, normal_links = extract_links(test_html, base_url)
        all_links = list(doc_links) + list(normal_links)

        assert len(all_links) > 0, "No links extracted"

        absolute_links = [link for link in all_links if link.startswith("http")]
        assert len(absolute_links) >= 2, (
            f"Too few absolute links: {len(absolute_links)}"
        )

        doc2_link = "https://example.com/relative/doc2.pdf"
        assert doc2_link in doc_links, (
            f"Relative URL not properly converted: {doc2_link}"
        )

        logger.info(
            "✓ Link extraction smoke test passed: %d total links (%d docs, %d normal)",
            len(all_links),
            len(doc_links),
            len(normal_links),
        )
    except (UrlParsingError, ValidationError) as e:
        pytest.fail(f"Link extraction failed: {e}")


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_content_processing_smoke(
    logger: logging.Logger, grant_application_file: GrantApplicationRagSource
) -> None:
    logger.info("Running smoke test for content processing")

    test_html = """
    <html>
    <head><title>Test Document</title></head>
    <body>
        <h1>Research Proposal</h1>
        <p>This is a comprehensive research proposal about machine learning applications in healthcare.</p>
        <h2>Background</h2>
        <p>Machine learning has shown great promise in medical diagnosis and treatment recommendation.</p>
        <p>Our research aims to develop novel algorithms for early disease detection.</p>
        <h2>Methodology</h2>
        <p>We will use deep learning techniques combined with traditional statistical methods.</p>
        <p>The study will involve analysis of clinical data from multiple healthcare institutions.</p>
    </body>
    </html>
    """

    try:
        markdown_content, text_content, embeddings = await extract_and_process_content(
            url="https://example.com/test-page", raw_html=test_html
        )

        assert markdown_content.strip(), "No markdown content extracted"
        assert text_content.strip(), "No text content extracted"

        validate_content_quality(text_content, min_length=100, min_alpha_ratio=0.3)

        assert embeddings is not None, "No embeddings generated"

        logger.info(
            "✓ Content processing smoke test passed: %d chars text, %d chars markdown",
            len(text_content),
            len(markdown_content),
        )
    except (ValidationError, ExternalOperationError) as e:
        pytest.fail(f"Content processing failed: {e}")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
@pytest.mark.parametrize(
    "test_url",
    [
        "https://httpbin.org/html",
        "https://example.com",
    ],
)
async def test_crawling_quality_assessment(
    logger: logging.Logger,
    test_url: str,
    grant_application_file: GrantApplicationRagSource,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running quality assessment for crawling: %s", test_url)

    try:
        vectors, text_content, files = await crawl_url(
            url=test_url, source_id=str(grant_application_file.rag_source_id)
        )

        assert len(vectors) > 0, "No vectors generated"
        validate_content_quality(text_content)

        chunk_lengths = []
        embedding_norms = []

        for vector in vectors:
            assert vector["rag_source_id"] == str(
                grant_application_file.rag_source_id
            ), "Incorrect rag_source_id"
            assert "chunk" in vector, "Missing chunk attribute"
            assert vector["chunk"]["content"], "Missing chunk content"
            assert "embedding" in vector, "Missing embedding attribute"

            chunk_content = vector["chunk"]["content"]
            embedding = vector["embedding"]

            chunk_lengths.append(len(chunk_content))
            assert len(chunk_content) >= 50, (
                f"Chunk too short: {len(chunk_content)} chars"
            )

            validate_embedding_quality(embedding)

            import math

            norm = math.sqrt(sum(x**2 for x in embedding))
            embedding_norms.append(norm)

        if chunk_lengths:
            avg_chunk_length = sum(chunk_lengths) / len(chunk_lengths)
            assert 100 <= avg_chunk_length <= 2500, (
                f"Average chunk length suspicious: {avg_chunk_length}"
            )

        if embedding_norms:
            avg_embedding_norm = sum(embedding_norms) / len(embedding_norms)
            assert 0.5 <= avg_embedding_norm <= 2.0, (
                f"Average embedding norm suspicious: {avg_embedding_norm}"
            )

        for file_info in files:
            assert "content" in file_info, "Missing content in file info"
            assert "filename" in file_info, "Missing filename in file info"
            assert len(file_info["content"]) > 0, "Empty file content"
            assert file_info["filename"], "Empty filename"

        logger.info(
            "✓ Crawling quality assessment passed: %d chars, %d vectors, %d files",
            len(text_content),
            len(vectors),
            len(files),
        )
    except (UrlParsingError, ValidationError, ExternalOperationError) as e:
        pytest.fail(f"Crawling quality assessment failed for {test_url}: {e}")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=240)
async def test_link_relevance_assessment(logger: logging.Logger) -> None:
    logger.info("Running link relevance assessment")

    test_html = """
    <html>
    <body>
        <h1>Grant Application Resources</h1>
        <a href="/application-form.pdf">Application Form PDF</a>
        <a href="/guidelines.docx">Grant Guidelines</a>
        <a href="/budget-template.xlsx">Budget Template</a>
        <a href="/contact.html">Contact Information</a>
        <a href="/news.html">Latest News</a>
        <a href="/research-proposal-sample.pdf">Sample Research Proposal</a>
        <a href="/terms-of-service.html">Terms of Service</a>
        <a href="/funding-opportunities.pdf">Funding Opportunities</a>
    </body>
    </html>
    """

    base_url = "https://grants.example.com"
    doc_links, normal_links = extract_links(test_html, base_url)

    mock_main_embeddings = [[0.1] * 384]
    visited_urls: list[str] = []

    try:
        relevant_links = await find_relevant_links(
            normal_links, mock_main_embeddings, visited_urls
        )

        assert isinstance(relevant_links, list), "Expected list of relevant links"

        for link_data in relevant_links:
            assert isinstance(link_data, tuple), "Each relevant link should be a tuple"
            assert len(link_data) == 4, (
                "Each relevant link tuple should have 4 elements"
            )
            url, html, embeddings, text = link_data
            assert isinstance(url, str), "URL should be string"
            assert isinstance(html, str), "HTML should be string"
            assert isinstance(embeddings, list), "Embeddings should be list"
            assert isinstance(text, str), "Text should be string"

        logger.info(
            "✓ Link relevance assessment passed: function structure validated, %d links processed",
            len(normal_links),
        )
    except (ValidationError, ExternalOperationError) as e:
        pytest.fail(f"Link relevance assessment failed: {e}")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_document_processing_quality(
    logger: logging.Logger, grant_application_file: GrantApplicationRagSource
) -> None:
    logger.info("Running document processing quality test")

    mock_documents = {
        "https://httpbin.org/base64/SFRUUEJJTiBpcyBhd2Vzb21l",
    }

    try:
        from anyio import Path, TemporaryDirectory

        async with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            downloaded_files = await download_documents(
                doc_links=mock_documents, temp_dir=temp_path
            )

            if downloaded_files:
                for doc_url, file_path in downloaded_files.items():
                    assert await file_path.exists(), "Downloaded file should exist"
                    assert await file_path.is_file(), "Should be a file"

                    content = await file_path.read_bytes()
                    filename = file_path.name

                    assert content, "Empty file content"
                    assert filename, "Empty filename"
                    assert isinstance(content, bytes), "File content should be bytes"
                    assert len(content) > 0, "File content is empty"

                    assert "/" not in filename, "Unsafe filename with path separator"
                    assert "\\" not in filename, "Unsafe filename with backslash"
                    assert not filename.startswith("."), "Hidden filename not allowed"

                logger.info(
                    "✓ Document processing quality test passed: %d files processed",
                    len(downloaded_files),
                )
            else:
                logger.info("✓ No documents found - test passed (documents optional)")

    except (ExternalOperationError, ValidationError) as e:
        pytest.fail(f"Document processing quality test failed: {e}")


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=600)
@pytest.mark.parametrize(
    "test_url",
    [
        "https://httpbin.org/html",
    ],
)
async def test_comprehensive_crawling_pipeline(
    logger: logging.Logger,
    test_url: str,
    grant_application_file: GrantApplicationRagSource,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running comprehensive crawling pipeline evaluation for %s", test_url)

    try:
        vectors, text_content, files = await crawl_url(
            url=test_url, source_id=str(grant_application_file.rag_source_id)
        )

        assert len(vectors) > 0, "No vectors generated"
        validate_content_quality(text_content, min_length=50, min_alpha_ratio=0.15)

        chunk_lengths = []
        embedding_norms = []
        chunk_contents = [v["chunk"]["content"] for v in vectors]

        for vector in vectors:
            assert vector["rag_source_id"] == str(
                grant_application_file.rag_source_id
            ), "Incorrect rag_source_id"

            chunk_content = vector["chunk"]["content"]
            chunk_lengths.append(len(chunk_content))
            assert 50 <= len(chunk_content) <= 3000, (
                f"Chunk length out of range: {len(chunk_content)}"
            )

            embedding = vector["embedding"]
            validate_embedding_quality(embedding)

            import math

            norm = math.sqrt(sum(x**2 for x in embedding))
            embedding_norms.append(norm)

        avg_chunk_length = sum(chunk_lengths) / len(chunk_lengths)
        avg_embedding_norm = sum(embedding_norms) / len(embedding_norms)

        assert 100 <= avg_chunk_length <= 2500, (
            f"Average chunk length suspicious: {avg_chunk_length}"
        )
        assert 0.5 <= avg_embedding_norm <= 2.0, (
            f"Average embedding norm suspicious: {avg_embedding_norm}"
        )

        total_chunk_chars = sum(chunk_lengths)
        coverage_ratio = total_chunk_chars / len(text_content) if text_content else 0
        assert 0.5 <= coverage_ratio <= 2.0, (
            f"Coverage ratio suspicious: {coverage_ratio}"
        )

        unique_contents = set(chunk_contents)
        duplicate_ratio = 1 - (len(unique_contents) / len(chunk_contents))
        assert duplicate_ratio < 0.3, (
            f"Too many duplicate chunks: {duplicate_ratio:.1%}"
        )

        logger.info(
            "✓ Comprehensive pipeline evaluation passed: %s - %d chars, %d vectors, coverage: %.1f%%, %d files",
            test_url,
            len(text_content),
            len(vectors),
            coverage_ratio * 100,
            len(files),
        )
    except (UrlParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Comprehensive evaluation failed for %s: %s", test_url, e)
        pytest.fail(f"Comprehensive evaluation failed for {test_url}: {e}")


@e2e_test(category=E2ETestCategory.SEMANTIC_EVALUATION, timeout=240)
async def test_content_semantic_quality(
    logger: logging.Logger, grant_application_file: GrantApplicationRagSource
) -> None:
    logger.info("Running content semantic quality evaluation")

    test_html = """
    <html>
    <head><title>Research Grant Application Guidelines</title></head>
    <body>
        <h1>National Science Foundation Grant Application</h1>
        <h2>Project Description</h2>
        <p>The project description should clearly articulate the research objectives, methodology, and expected outcomes.</p>
        <p>Applicants must demonstrate the significance and innovation of their proposed research.</p>

        <h2>Budget Justification</h2>
        <p>All budget items must be thoroughly justified with detailed explanations.</p>
        <p>Personnel costs should include salary, benefits, and time allocation for each team member.</p>

        <h2>Timeline and Milestones</h2>
        <p>Provide a detailed timeline with specific milestones and deliverables.</p>
        <p>Include contingency plans for potential delays or challenges.</p>
    </body>
    </html>
    """

    try:
        markdown_content, text_content, embeddings = await extract_and_process_content(
            url="https://example.com/grant-guidelines", raw_html=test_html
        )

        research_keywords = [
            "research",
            "grant",
            "application",
            "project",
            "budget",
            "methodology",
        ]

        validate_content_quality(
            text_content,
            min_length=200,
            min_alpha_ratio=0.5,
            required_keywords=research_keywords,
        )

        lines = text_content.split("\n")
        non_empty_lines = [line for line in lines if line.strip()]
        assert len(non_empty_lines) >= 5, (
            f"Poor content structure: {len(non_empty_lines)} lines"
        )

        logger.info(
            "✓ Content semantic quality evaluation passed: %d chars, %d lines",
            len(text_content),
            len(non_empty_lines),
        )
    except (ValidationError, ExternalOperationError) as e:
        pytest.fail(f"Content semantic quality evaluation failed: {e}")
