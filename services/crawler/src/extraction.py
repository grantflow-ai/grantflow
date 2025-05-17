import re
from asyncio import gather
from typing import Any, TypedDict, cast
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse

import trafilatura
from anyio import Path, TemporaryDirectory
from bs4 import BeautifulSoup, Tag
from html_to_markdown import convert_to_markdown
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.json_objects import Chunk
from packages.db.src.tables import RagSource, RagUrl, TextVector
from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.exceptions import (
    DatabaseError,
    ExternalOperationError,
    FileParsingError,
    UrlParsingError,
)
from packages.shared_utils.src.logger import get_logger
from services.crawler.src.constants import CHUNKS_BATCH_SIZE, FILE_RX, MAX_DEPTH
from services.crawler.src.html_utils import download_file, download_page_html, sanitize_html
from services.crawler.src.utils import safe_filename_from_url
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class FileContent(TypedDict):
    filename: str
    content: bytes


async def create_vector_dto(
    *,
    chunk: Chunk,
    rag_source_id: str,
) -> VectorDTO:
    try:
        embedding = await generate_embeddings([chunk["content"]])

        if len(embedding) != 1:
            logger.error("Expected a single embedding to be generated for the content")
            raise ExternalOperationError("Expected a single embedding to be generated for the content")

        return VectorDTO(
            chunk=chunk,
            embedding=embedding[0],
            rag_source_id=rag_source_id,
        )
    except ValueError as e:
        raise ExternalOperationError("Failed to generate embedding", context=str(e)) from e


class CrawlResult(TypedDict):
    url: str
    document_links: list[str]
    markdown_content: str
    text_content: str
    saved_path: str


async def prepare_url_data(
    url: str, raw_html: str | None = None, visited_urls: list[str] | None = None
) -> tuple[str, list[str]]:
    """
    Download and prepare HTML data for a given URL.

    Args:
        url: The URL to process
        raw_html: HTML content if already downloaded
        visited_urls: List of URLs already visited

    Returns:
        Tuple of (raw_html, updated_visited_urls)
    """
    if visited_urls is None:
        visited_urls = []

    if not raw_html:
        try:
            raw_html = await download_page_html(url)
            visited_urls.append(url)
        except (URLError, HTTPError) as e:
            logger.error("Network error downloading page HTML: {error}", error=str(e), url=url)
            raise ExternalOperationError(f"Failed to download page HTML from {url}", context=str(e)) from e
        except TimeoutError as e:
            logger.error("Timeout when downloading page HTML: {error}", error=str(e), url=url)
            raise ExternalOperationError(f"Timeout when downloading page from {url}", context=str(e)) from e

    return raw_html, visited_urls


def extract_links(raw_html: str, base_url: str) -> tuple[set[str], set[str]]:
    """
    Extract document links and normal links from HTML content.

    Args:
        raw_html: HTML content
        base_url: Base URL for resolving relative links

    Returns:
        Tuple of (document_links, normal_links)
    """
    soup = BeautifulSoup(raw_html, "html.parser")
    sanitized_html = sanitize_html(soup)

    a_tags = sanitized_html.find_all("a")
    raw_links = cast("list[str]", [a["href"] for a in a_tags if isinstance(a, Tag) and a.has_attr("href")])
    absolute_links = [urljoin(base_url, href) for href in raw_links]
    absolute_links = [link for link in absolute_links if urlparse(link).scheme in {"http", "https"}]

    rx = re.compile(FILE_RX, re.IGNORECASE)
    doc_links = set()
    normal_links = set()

    for absolute in absolute_links:
        if rx.search(urlparse(absolute).path):
            doc_links.add(absolute)
        else:
            normal_links.add(absolute)

    return doc_links, normal_links


async def extract_and_process_content(
    url: str, raw_html: str, page_text: str | None = None, main_embeddings: list[list[float]] | None = None
) -> tuple[str, str, list[list[float]]]:
    """
    Extract and process text content from HTML.
    """
    if page_text is None:
        try:
            page_text = trafilatura.extract(raw_html, output_format="txt", include_comments=False)
            if page_text is None:
                logger.warning("Failed to extract text content from {url}", url=url)
                page_text = ""
        except Exception as e:
            logger.error("Error extracting text with trafilatura: {error}", error=str(e), url=url)
            raise UrlParsingError(f"Failed to extract text content from {url}", context=str(e)) from e

    if main_embeddings is None:
        try:
            content_to_embed = page_text if page_text is not None else ""
            main_embeddings = await generate_embeddings([content_to_embed])
        except ValueError as e:
            logger.error("Error generating embeddings: {error}", error=str(e), url=url)
            raise ExternalOperationError(f"Failed to generate embeddings for {url}", context=str(e)) from e

    soup = BeautifulSoup(raw_html, "html.parser")
    sanitized_html = sanitize_html(soup)
    md_out = convert_to_markdown(sanitized_html)

    return md_out, page_text, main_embeddings


async def save_page_content(url: str, temp_dir: Path, markdown_content: str) -> Path:
    """
    Save page content to a file.

    Args:
        url: The URL being processed
        temp_dir: Path to temporary directory for saving files
        markdown_content: Markdown content to save

    Returns:
        Path to the saved file
    """
    page_filename = safe_filename_from_url(url)
    page_path = temp_dir / page_filename

    try:
        await page_path.write_text(markdown_content)
        return page_path
    except (OSError, PermissionError) as e:
        logger.error("Error writing page content to file: {error}", error=str(e), url=url, file=str(page_path))
        raise FileParsingError(f"Failed to write page content to file: {page_path}", context=str(e)) from e


async def download_documents(
    doc_links: set[str], temp_dir: Path, downloaded_files: dict[str, Path] | None = None
) -> dict[str, Path]:
    """
    Download document files from links.

    Args:
        doc_links: Set of document links to download
        temp_dir: Path to temporary directory for saving files
        downloaded_files: Dictionary mapping URLs to downloaded file paths

    Returns:
        Updated dictionary of downloaded files
    """
    if downloaded_files is None:
        downloaded_files = {}

    for doc_url in doc_links:
        if doc_url in downloaded_files:
            logger.info("Already downloaded {url}, skipping.", url=doc_url)
            continue

        doc_filename = safe_filename_from_url(doc_url)
        doc_path = temp_dir / doc_filename

        try:
            doc_content = await download_file(doc_url)
            await doc_path.write_bytes(doc_content)
            downloaded_files[doc_url] = doc_path
        except (URLError, HTTPError) as e:
            logger.info("Network error downloading file: {error}", error=str(e), file_url=doc_url)
        except (OSError, PermissionError) as e:
            logger.info("File system error when saving: {error}", error=str(e), file_url=doc_url)
        except TimeoutError as e:
            logger.info("Timeout when downloading file: {error}", error=str(e), file_url=doc_url)

    return downloaded_files


async def find_relevant_links(
    url: str, normal_links: set[str], main_embeddings: list[list[float]], visited_urls: list[str]
) -> list[tuple[str, str, list[list[float]], str]]:
    """
    Find relevant links based on content similarity.

    Args:
        url: The current URL being processed
        normal_links: Set of normal (non-document) links
        main_embeddings: Embeddings of the current page
        visited_urls: List of already visited URLs

    Returns:
        List of tuples (link, html, embeddings, text) for relevant links
    """
    relevant_links = []

    for link in normal_links:
        try:
            if link in visited_urls:
                logger.info("Already visited {url}, skipping.", url=link)
                continue

            link_html = await download_page_html(str(link))
            visited_urls.append(str(link))

            link_text = trafilatura.extract(link_html, output_format="txt", include_comments=False)
            if link_text is not None:
                link_embeddings = await generate_embeddings([link_text])
            else:
                raise UrlParsingError(f"Failed to extract text content from {link}")

            similarity = cosine_similarity(main_embeddings, link_embeddings)

            if similarity[0][0] >= 0.58:
                relevant_links.append((link, link_html, link_embeddings, link_text))
        except (URLError, HTTPError) as e:
            logger.info("Network error when comparing URLs: {error}", error=str(e), url1=url, url2=link)
        except UrlParsingError as e:
            logger.info("Content extraction error: {error}", error=str(e), url1=url, url2=link)
        except ExternalOperationError as e:
            logger.info("Embedding generation error: {error}", error=str(e), url1=url, url2=link)
        except Exception as e:  # noqa: BLE001
            logger.info("Unexpected error comparing URL content: {error}", error=str(e), url1=url, url2=link)

    return relevant_links


async def crawl(
    url: str,
    temp_dir: Path,
    depth: int = 0,
    raw_html: str | None = None,
    main_embeddings: list[list[float]] | None = None,
    page_text: str | None = None,
    visited_urls: list[str] | None = None,
    downloaded_files: dict[str, Path] | None = None,
    results: list[CrawlResult] | None = None,
) -> list[CrawlResult]:
    """
    Crawl a URL and its linked pages, downloading files and saving page content.

    Args:
        url: The URL to crawl
        temp_dir: Path to temporary directory for saving files
        depth: Current crawl depth
        raw_html: HTML content if already downloaded
        main_embeddings: Embeddings if already computed
        page_text: Plain text for the webpage if already extracted
        visited_urls: List of URLs already visited
        downloaded_files: Dictionary mapping URLs to downloaded file paths
        results: List to store results for all crawled pages

    Returns:
        List of dictionaries containing info about crawled pages
    """
    if visited_urls is None:
        visited_urls = []
    if downloaded_files is None:
        downloaded_files = {}
    if results is None:
        results = []

    # Skip already visited URLs
    if url in visited_urls and raw_html is None:
        return results

    # Parse URL for base
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    # Download and prepare HTML
    raw_html, visited_urls = await prepare_url_data(url, raw_html, visited_urls)

    # Extract links
    doc_links, normal_links = extract_links(raw_html, base_url)

    # Process content
    md_out, page_text, main_embeddings = await extract_and_process_content(url, raw_html, page_text, main_embeddings)

    # Save content to file
    page_path = await save_page_content(url, temp_dir, md_out)

    # Download documents
    downloaded_files = await download_documents(doc_links, temp_dir, downloaded_files)

    # Create result and add to results list
    page_result: CrawlResult = {
        "url": url,
        "document_links": cast("list[str]", list(doc_links)),
        "markdown_content": md_out,
        "text_content": str(page_text),
        "saved_path": str(page_path),
    }
    results.append(page_result)

    # Find relevant links
    relevant_links = await find_relevant_links(url, normal_links, main_embeddings, visited_urls)

    # Recursively crawl relevant links if not at max depth
    if depth < MAX_DEPTH:
        for rlink in relevant_links:
            await crawl(
                str(rlink[0]),
                temp_dir,
                depth=depth + 1,
                raw_html=rlink[1],
                main_embeddings=rlink[2],
                page_text=rlink[3],
                visited_urls=visited_urls,
                downloaded_files=downloaded_files,
                results=results,
            )

    return results


async def crawl_url(*, url: str, source_id: str, session_maker: async_sessionmaker[Any]) -> list[FileContent]:
    try:
        async with (
            TemporaryDirectory() as temp_dir_str,
        ):
            temp_dir = Path(temp_dir_str)
            crawl_results = await crawl(url, temp_dir)

            files = [
                FileContent(filename=file.name, content=await file.read_bytes())
                async for file in Path(temp_dir).glob("**/*")
                if file.is_file()
            ]

            content = ""
            title: str | None = None
            description: str | None = None

        for result in crawl_results:
            content += "\n\n" + result["markdown_content"]

        chunks = chunk_text(text=content, mime_type="text/markdown")
        vectors: list[VectorDTO] = []

        for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
            results = await gather(
                *[
                    create_vector_dto(
                        chunk=chunk,
                        rag_source_id=source_id,
                    )
                    for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
                ]
            )
            vectors.extend([result for result in results if result is not None])

    # Skip TextVector insertion for now since we don't have valid vector data for tests
    except (URLError, HTTPError, TimeoutError) as e:
        await _mark_source_as_failed(session_maker, source_id)
        raise ExternalOperationError(f"Network error when crawling URL: {url}", context=str(e)) from e
    except UrlParsingError as e:
        await _mark_source_as_failed(session_maker, source_id)
        raise UrlParsingError("Error parsing URL content", context=str(e)) from e
    except FileParsingError as e:
        await _mark_source_as_failed(session_maker, source_id)
        raise FileParsingError("Error with file operations during crawling", context=str(e)) from e
    except ExternalOperationError as e:
        await _mark_source_as_failed(session_maker, source_id)
        raise ExternalOperationError("External operation error during crawling", context=str(e)) from e
    except SQLAlchemyError as e:
        await _mark_source_as_failed(session_maker, source_id)
        raise DatabaseError("Database error during crawling", context=str(e)) from e
    else:
        async with session_maker() as session, session.begin():
            try:
                await session.execute(insert(TextVector).values(vectors))

                await session.execute(
                    update(RagSource)
                    .where(RagSource.id == source_id)
                    .values({"indexing_status": FileIndexingStatusEnum.FINISHED, "text_content": content})
                )
                await session.execute(
                    update(RagUrl).where(RagUrl.id == source_id).values({"title": title, "description": description})
                )
                await session.commit()
                logger.info("Successfully indexed URL", url=url, source_id=source_id)
            except SQLAlchemyError as e:
                if "connection" in str(e).lower():
                    logger.error("Database connection error", exc_info=e, url=url)
                    await session.rollback()
                    raise DatabaseError("Database connection failed", context=str(e)) from e
                logger.error("Database operation error", exc_info=e, url=url)
                await session.rollback()
                raise DatabaseError("Error in database operation", context=str(e)) from e

        return files


async def _mark_source_as_failed(session_maker: async_sessionmaker[Any], source_id: str) -> None:
    """Mark a source as failed in the database."""
    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(RagSource).where(RagSource.id == source_id).values(indexing_status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()
        except SQLAlchemyError as e:
            logger.error("Failed to mark source as failed: {error}", error=str(e), source_id=source_id)
            await session.rollback()
