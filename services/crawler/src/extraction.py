import re
import time
from asyncio import gather
from itertools import chain
from typing import TypedDict, cast
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse

from anyio import Path, TemporaryDirectory
from bs4 import BeautifulSoup, Tag
from html_to_markdown import convert_to_markdown
from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import generate_embeddings, index_chunks
from packages.shared_utils.src.exceptions import (
    ExternalOperationError,
    UrlParsingError,
)
from packages.shared_utils.src.html import sanitize_html
from packages.shared_utils.src.logger import get_logger
from sklearn.metrics.pairwise import cosine_similarity
from trafilatura import extract

from services.crawler.src.constants import FILE_RX, MAX_DEPTH
from services.crawler.src.utils import (
    download_file,
    download_page_html,
    safe_filename_from_url,
)

logger = get_logger(__name__)


class FileContent(TypedDict):
    filename: str
    content: bytes


class CrawlResult(TypedDict):
    url: str
    document_links: list[str]
    markdown_content: str
    text_content: str
    saved_path: str


async def prepare_url_data(
    url: str, raw_html: str | None = None, visited_urls: list[str] | None = None
) -> tuple[str, list[str]]:
    if visited_urls is None:
        visited_urls = []

    if not raw_html:
        try:
            raw_html = await download_page_html(url)
            visited_urls.append(url)
        except (URLError, HTTPError, TimeoutError) as e:
            raise ExternalOperationError(
                f"Failed to download page HTML from {url}", context=str(e)
            ) from e

    return raw_html, visited_urls


def extract_links(raw_html: str, base_url: str) -> tuple[set[str], set[str]]:
    soup = BeautifulSoup(raw_html, "html.parser")
    sanitized_html = sanitize_html(soup)

    a_tags = sanitized_html.find_all("a")
    raw_links = cast(
        "list[str]",
        [a["href"] for a in a_tags if isinstance(a, Tag) and a.has_attr("href")],
    )
    absolute_links = [urljoin(base_url, href) for href in raw_links]
    absolute_links = [
        link for link in absolute_links if urlparse(link).scheme in {"http", "https"}
    ]

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
    url: str,
    raw_html: str,
    page_text: str | None = None,
    main_embeddings: list[list[float]] | None = None,
) -> tuple[str, str, list[list[float]]]:
    start_time = time.time()
    logger.debug(
        "Starting content extraction and processing",
        url=url,
        html_length=len(raw_html),
        has_cached_text=page_text is not None,
        has_cached_embeddings=main_embeddings is not None,
    )

    if page_text is None:
        try:
            extraction_start = time.time()
            page_text = extract(
                raw_html, output_format="markdown", include_comments=False
            )
            extraction_duration = time.time() - extraction_start

            if page_text is None:
                logger.warning(
                    "Failed to extract text content",
                    url=url,
                    html_length=len(raw_html) if raw_html else 0,
                    html_preview=raw_html[:500] if raw_html else None,
                )
                page_text = ""
            else:
                logger.debug(
                    "Text extraction completed",
                    url=url,
                    text_length=len(page_text),
                    extraction_duration_ms=round(extraction_duration * 1000, 2),
                )
        except Exception as e:
            logger.error(
                "Text extraction failed",
                url=url,
                error_type=type(e).__name__,
                error=str(e),
            )
            raise UrlParsingError(
                f"Failed to extract text content from {url}", context=str(e)
            ) from e

    if main_embeddings is None:
        try:
            embedding_start = time.time()
            content_to_embed = page_text if page_text is not None else ""
            main_embeddings = await generate_embeddings([content_to_embed])
            embedding_duration = time.time() - embedding_start

            logger.debug(
                "Embeddings generated",
                url=url,
                content_length=len(content_to_embed),
                embedding_count=len(main_embeddings),
                embedding_dimension=len(main_embeddings[0]) if main_embeddings else 0,
                embedding_duration_ms=round(embedding_duration * 1000, 2),
            )
        except ValueError as e:
            logger.error(
                "Embedding generation failed",
                url=url,
                error_type=type(e).__name__,
                error=str(e),
            )
            raise ExternalOperationError(
                f"Failed to generate embeddings for {url}", context=str(e)
            ) from e

    markdown_start = time.time()
    soup = BeautifulSoup(raw_html, "html.parser")
    sanitized_html = sanitize_html(soup)
    md_out = convert_to_markdown(sanitized_html)
    markdown_duration = time.time() - markdown_start

    total_duration = time.time() - start_time
    logger.debug(
        "Content processing completed",
        url=url,
        markdown_length=len(md_out),
        text_length=len(page_text),
        markdown_duration_ms=round(markdown_duration * 1000, 2),
        total_duration_ms=round(total_duration * 1000, 2),
    )

    return md_out, page_text, main_embeddings


async def save_page_content(url: str, temp_dir: Path, markdown_content: str) -> Path:
    page_filename = safe_filename_from_url(url)
    page_path = temp_dir / page_filename

    await page_path.write_text(markdown_content)
    return page_path


async def download_documents(
    doc_links: set[str], temp_dir: Path, downloaded_files: dict[str, Path] | None = None
) -> dict[str, Path]:
    start_time = time.time()
    logger.debug("Starting document downloads", doc_count=len(doc_links))

    if downloaded_files is None:
        downloaded_files = {}

    downloaded_count = 0
    skipped_count = 0
    failed_count = 0

    for doc_url in doc_links:
        if doc_url in downloaded_files:
            logger.debug("Already downloaded, skipping", url=doc_url)
            skipped_count += 1
            continue

        doc_filename = safe_filename_from_url(doc_url)
        doc_path = temp_dir / doc_filename

        try:
            download_start = time.time()
            doc_content = await download_file(doc_url)
            await doc_path.write_bytes(doc_content)
            download_duration = time.time() - download_start

            downloaded_files[doc_url] = doc_path
            downloaded_count += 1

            logger.debug(
                "Document downloaded successfully",
                url=doc_url,
                filename=doc_filename,
                file_size=len(doc_content),
                download_duration_ms=round(download_duration * 1000, 2),
            )
        except Exception as e:
            failed_count += 1
            logger.warning(
                "Failed to download document",
                url=doc_url,
                filename=doc_filename,
                error_type=type(e).__name__,
                error=str(e),
            )

    total_duration = time.time() - start_time
    logger.debug(
        "Document downloads completed",
        total_docs=len(doc_links),
        downloaded_count=downloaded_count,
        skipped_count=skipped_count,
        failed_count=failed_count,
        total_downloaded=len(downloaded_files),
        total_duration_ms=round(total_duration * 1000, 2),
    )

    return downloaded_files


async def find_relevant_links(
    normal_links: set[str], main_embeddings: list[list[float]], visited_urls: list[str]
) -> list[tuple[str, str, list[list[float]], str]]:
    start_time = time.time()
    logger.debug("Finding relevant links", total_links=len(normal_links))

    relevant_links = []
    processed_count = 0
    skipped_count = 0

    for link in normal_links:
        if link in visited_urls:
            logger.debug("Already visited url, skipping", url=link)
            skipped_count += 1
            continue

        try:
            link_start = time.time()
            link_html = await download_page_html(str(link))
            visited_urls.append(str(link))

            if link_text := extract(
                link_html, output_format="markdown", include_comments=False
            ):
                link_embeddings = await generate_embeddings([link_text])
                similarity = cosine_similarity(main_embeddings, link_embeddings)
                similarity_score = similarity[0][0]

                link_duration = time.time() - link_start

                if similarity_score >= 0.58:
                    relevant_links.append((link, link_html, link_embeddings, link_text))
                    logger.debug(
                        "Link marked as relevant",
                        url=link,
                        similarity_score=round(similarity_score, 3),
                        text_length=len(link_text),
                        processing_duration_ms=round(link_duration * 1000, 2),
                    )
                else:
                    logger.debug(
                        "Link not relevant enough",
                        url=link,
                        similarity_score=round(similarity_score, 3),
                        processing_duration_ms=round(link_duration * 1000, 2),
                    )

                processed_count += 1
        except Exception as e:  # noqa: BLE001
            logger.warning(
                "Failed to download or process link, skipping",
                url=str(link),
                error_type=type(e).__name__,
                error=str(e),
            )
            skipped_count += 1
            continue

    total_duration = time.time() - start_time
    logger.debug(
        "Relevant link analysis completed",
        total_links=len(normal_links),
        processed_count=processed_count,
        skipped_count=skipped_count,
        relevant_count=len(relevant_links),
        total_duration_ms=round(total_duration * 1000, 2),
    )

    return relevant_links


async def crawl(
    *,
    depth: int = 0,
    downloaded_files: dict[str, Path] | None = None,
    is_initial_crawl: bool = False,
    main_embeddings: list[list[float]] | None = None,
    page_text: str | None = None,
    raw_html: str | None = None,
    results: list[CrawlResult] | None = None,
    temp_dir: Path,
    url: str,
    visited_urls: list[str] | None = None,
) -> list[CrawlResult]:
    start_time = time.time()
    logger.debug(
        "Starting crawl",
        url=url,
        depth=depth,
        is_initial_crawl=is_initial_crawl,
        has_cached_html=raw_html is not None,
    )

    try:
        if visited_urls is None:
            visited_urls = []
        if downloaded_files is None:
            downloaded_files = {}
        if results is None:
            results = []

        if url in visited_urls and raw_html is None:
            logger.debug("URL already visited, skipping", url=url)
            return results

        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"

        prep_start = time.time()
        raw_html, visited_urls = await prepare_url_data(url, raw_html, visited_urls)
        prep_duration = time.time() - prep_start

        logger.debug(
            "URL data prepared",
            url=url,
            html_length=len(raw_html),
            prep_duration_ms=round(prep_duration * 1000, 2),
        )

        extract_start = time.time()
        doc_links, normal_links = extract_links(raw_html, base_url)
        extract_duration = time.time() - extract_start

        logger.debug(
            "Links extracted",
            url=url,
            doc_link_count=len(doc_links),
            normal_link_count=len(normal_links),
            extract_duration_ms=round(extract_duration * 1000, 2),
        )

        process_start = time.time()
        md_out, page_text, main_embeddings = await extract_and_process_content(
            url, raw_html, page_text, main_embeddings
        )
        process_duration = time.time() - process_start

        logger.debug(
            "Content processed",
            url=url,
            markdown_length=len(md_out),
            text_length=len(page_text),
            process_duration_ms=round(process_duration * 1000, 2),
        )

        save_start = time.time()
        page_path = await save_page_content(url, temp_dir, md_out)
        save_duration = time.time() - save_start

        logger.debug(
            "Page content saved",
            url=url,
            saved_path=str(page_path),
            save_duration_ms=round(save_duration * 1000, 2),
        )

        download_start = time.time()
        downloaded_files = await download_documents(
            doc_links, temp_dir, downloaded_files
        )
        download_duration = time.time() - download_start

        logger.debug(
            "Documents downloaded",
            url=url,
            doc_count=len(doc_links),
            total_downloaded=len(downloaded_files),
            download_duration_ms=round(download_duration * 1000, 2),
        )

        page_result: CrawlResult = {
            "url": url,
            "document_links": cast("list[str]", list(doc_links)),
            "markdown_content": md_out,
            "text_content": str(page_text),
            "saved_path": str(page_path),
        }
        results.append(page_result)

        relevant_start = time.time()
        relevant_links = await find_relevant_links(
            normal_links, main_embeddings, visited_urls
        )
        relevant_duration = time.time() - relevant_start

        logger.debug(
            "Relevant links found",
            url=url,
            relevant_count=len(relevant_links),
            relevant_duration_ms=round(relevant_duration * 1000, 2),
        )

        if depth < MAX_DEPTH:
            if relevant_links:
                logger.debug(
                    "Starting recursive crawls",
                    url=url,
                    depth=depth,
                    max_depth=MAX_DEPTH,
                    links_to_crawl=len(relevant_links),
                )

                recursive_start = time.time()
                crawl_tasks = [
                    crawl(
                        url=str(rlink[0]),
                        temp_dir=temp_dir,
                        depth=depth + 1,
                        raw_html=rlink[1],
                        main_embeddings=rlink[2],
                        page_text=rlink[3],
                        visited_urls=visited_urls,
                        downloaded_files=downloaded_files,
                    )
                    for rlink in relevant_links
                ]
                crawl_results = await gather(*crawl_tasks)
                results.extend(
                    chain.from_iterable(result for result in crawl_results if result)
                )
                recursive_duration = time.time() - recursive_start

                logger.debug(
                    "Recursive crawls completed",
                    url=url,
                    recursive_duration_ms=round(recursive_duration * 1000, 2),
                )
            else:
                logger.debug("No relevant links found for further crawling", url=url)
        else:
            logger.debug("Maximum depth reached, stopping crawl", url=url, depth=depth)

        total_duration = time.time() - start_time
        logger.debug(
            "Crawl completed",
            url=url,
            depth=depth,
            result_count=len(results),
            total_duration_ms=round(total_duration * 1000, 2),
        )

        return results
    except Exception as e:
        error_duration = time.time() - start_time
        if is_initial_crawl:
            logger.error(
                "Initial crawl failed",
                url=url,
                error_type=type(e).__name__,
                error_duration_ms=round(error_duration * 1000, 2),
            )
            raise UrlParsingError(f"Failed to crawl {url}", context=str(e)) from e

        logger.warning(
            "Recursive crawl failed, continuing",
            url=url,
            depth=depth,
            error_type=type(e).__name__,
            error_duration_ms=round(error_duration * 1000, 2),
        )
        return []


async def crawl_url(
    *, url: str, source_id: str
) -> tuple[list[VectorDTO], str, list[FileContent]]:
    start_time = time.time()
    logger.debug("Starting URL crawl", url=url, source_id=source_id)

    async with (
        TemporaryDirectory() as temp_dir,
    ):
        crawl_start = time.time()
        crawl_results = await crawl(
            url=url, temp_dir=Path(temp_dir), is_initial_crawl=True
        )
        crawl_duration = time.time() - crawl_start

        logger.debug(
            "Crawl completed",
            url=url,
            result_count=len(crawl_results),
            crawl_duration_ms=round(crawl_duration * 1000, 2),
        )

        file_collect_start = time.time()
        files = [
            FileContent(filename=file.name, content=await file.read_bytes())
            async for file in Path(temp_dir).glob("**/*")
            if await file.is_file()
        ]
        file_collect_duration = time.time() - file_collect_start

        logger.debug(
            "Files collected from temp directory",
            file_count=len(files),
            file_collect_duration_ms=round(file_collect_duration * 1000, 2),
        )

        content = ""

    content_assembly_start = time.time()
    for result in crawl_results:
        content += "\n\n" + result["markdown_content"]
    content_assembly_duration = time.time() - content_assembly_start

    logger.debug(
        "Content assembled",
        content_length=len(content),
        content_assembly_duration_ms=round(content_assembly_duration * 1000, 2),
    )

    chunking_start = time.time()
    chunks = chunk_text(text=content, mime_type="text/markdown")
    chunking_duration = time.time() - chunking_start

    logger.debug(
        "Text chunking completed",
        chunk_count=len(chunks),
        chunking_duration_ms=round(chunking_duration * 1000, 2),
    )

    indexing_start = time.time()
    vectors = await index_chunks(chunks=chunks, source_id=source_id)
    indexing_duration = time.time() - indexing_start

    total_duration = time.time() - start_time
    logger.info(
        "URL crawl and indexing completed",
        url=url,
        source_id=source_id,
        vector_count=len(vectors),
        chunk_count=len(chunks),
        content_length=len(content),
        file_count=len(files),
        indexing_duration_ms=round(indexing_duration * 1000, 2),
        total_duration_ms=round(total_duration * 1000, 2),
    )

    return vectors, content, files
