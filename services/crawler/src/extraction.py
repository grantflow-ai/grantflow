import re
from asyncio import gather
from contextlib import suppress
from itertools import chain
from typing import TypedDict, cast
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse

from anyio import Path, TemporaryDirectory
from bs4 import BeautifulSoup, Tag
from html_to_markdown import convert_to_markdown
from packages.db.src.json_objects import Chunk
from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.exceptions import (
    ExternalOperationError,
    UrlParsingError,
)
from packages.shared_utils.src.logger import get_logger
from services.crawler.src.constants import CHUNKS_BATCH_SIZE, FILE_RX, MAX_DEPTH
from services.crawler.src.utils import (
    download_file,
    download_page_html,
    safe_filename_from_url,
    sanitize_html,
)
from sklearn.metrics.pairwise import cosine_similarity
from trafilatura import extract

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
            raise ExternalOperationError(f"Failed to download page HTML from {url}", context=str(e)) from e

    return raw_html, visited_urls


def extract_links(raw_html: str, base_url: str) -> tuple[set[str], set[str]]:
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
    if page_text is None:
        try:
            page_text = extract(raw_html, output_format="markdown", include_comments=False)
            if page_text is None:
                logger.warning(
                    "Failed to extract text content",
                    url=url,
                    html_length=len(raw_html) if raw_html else 0,
                    html_preview=raw_html[:500] if raw_html else None,
                )
                page_text = ""
        except Exception as e:
            raise UrlParsingError(f"Failed to extract text content from {url}", context=str(e)) from e

    if main_embeddings is None:
        try:
            content_to_embed = page_text if page_text is not None else ""
            main_embeddings = await generate_embeddings([content_to_embed])
        except ValueError as e:
            raise ExternalOperationError(f"Failed to generate embeddings for {url}", context=str(e)) from e

    soup = BeautifulSoup(raw_html, "html.parser")
    sanitized_html = sanitize_html(soup)
    md_out = convert_to_markdown(sanitized_html)

    return md_out, page_text, main_embeddings


async def save_page_content(url: str, temp_dir: Path, markdown_content: str) -> Path:
    page_filename = safe_filename_from_url(url)
    page_path = temp_dir / page_filename

    await page_path.write_text(markdown_content)
    return page_path


async def download_documents(
    doc_links: set[str], temp_dir: Path, downloaded_files: dict[str, Path] | None = None
) -> dict[str, Path]:
    if downloaded_files is None:
        downloaded_files = {}

    for doc_url in doc_links:
        if doc_url in downloaded_files:
            logger.info("Already downloaded {url}, skipping.", url=doc_url)
            continue

        doc_filename = safe_filename_from_url(doc_url)
        doc_path = temp_dir / doc_filename

        with suppress(Exception):
            doc_content = await download_file(doc_url)
            await doc_path.write_bytes(doc_content)
            downloaded_files[doc_url] = doc_path

    return downloaded_files


async def find_relevant_links(
    normal_links: set[str], main_embeddings: list[list[float]], visited_urls: list[str]
) -> list[tuple[str, str, list[list[float]], str]]:
    relevant_links = []

    for link in normal_links:
        if link in visited_urls:
            logger.debug("Already visited url, skipping.", url=link)
            continue

        try:
            link_html = await download_page_html(str(link))
            visited_urls.append(str(link))

            if link_text := extract(link_html, output_format="markdown", include_comments=False):
                link_embeddings = await generate_embeddings([link_text])
                similarity = cosine_similarity(main_embeddings, link_embeddings)
                if similarity[0][0] >= 0.58:
                    relevant_links.append((link, link_html, link_embeddings, link_text))
        except Exception as e:  # noqa: BLE001
            logger.warning("Failed to download or process link, skipping", url=str(link), error=str(e))
            continue

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
    try:
        if visited_urls is None:
            visited_urls = []
        if downloaded_files is None:
            downloaded_files = {}
        if results is None:
            results = []

        if url in visited_urls and raw_html is None:
            return results

        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        raw_html, visited_urls = await prepare_url_data(url, raw_html, visited_urls)
        doc_links, normal_links = extract_links(raw_html, base_url)
        md_out, page_text, main_embeddings = await extract_and_process_content(
            url, raw_html, page_text, main_embeddings
        )
        page_path = await save_page_content(url, temp_dir, md_out)
        downloaded_files = await download_documents(doc_links, temp_dir, downloaded_files)

        page_result: CrawlResult = {
            "url": url,
            "document_links": cast("list[str]", list(doc_links)),
            "markdown_content": md_out,
            "text_content": str(page_text),
            "saved_path": str(page_path),
        }
        results.append(page_result)
        relevant_links = await find_relevant_links(normal_links, main_embeddings, visited_urls)

        if depth < MAX_DEPTH:
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
            if crawl_tasks:
                crawl_results = await gather(*crawl_tasks)
                results.extend(chain.from_iterable(result for result in crawl_results if result))

        return results
    except Exception as e:
        if is_initial_crawl:
            raise UrlParsingError(f"Failed to crawl {url}", context=str(e)) from e
        # we suppress all errors here because we don't want to fail the entire crawl ~keep
        return []


async def crawl_url(*, url: str, source_id: str) -> tuple[list[VectorDTO], str, list[FileContent]]:
    async with (
        TemporaryDirectory() as temp_dir,
    ):
        crawl_results = await crawl(url=url, temp_dir=Path(temp_dir), is_initial_crawl=True)

        files = [
            FileContent(filename=file.name, content=await file.read_bytes())
            async for file in Path(temp_dir).glob("**/*")
            if await file.is_file()
        ]

        content = ""

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

    return vectors, content, files
