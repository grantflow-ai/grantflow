import re
from asyncio import gather
from pathlib import Path as PathlibPath
from typing import Any, TypedDict, cast
from urllib.parse import urljoin, urlparse

import trafilatura
from anyio import Path, TemporaryDirectory
from bs4 import BeautifulSoup, Tag
from html_to_markdown import convert_to_markdown
from mdformat import text
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.json_objects import Chunk
from packages.db.src.tables import RagSource, RagUrl, TextVector
from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.exceptions import DatabaseError, ExternalOperationError, UrlParsingError
from packages.shared_utils.src.logger import get_logger
from services.crawler.src.constants import CHUNKS_BATCH_SIZE, FILE_RX
from services.crawler.src.html_utils import download_file, download_page_html, sanitize_html
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class FileContent(TypedDict):
    filename: str
    content: bytes


MAX_DEPTH = 1


async def create_vector_dto(
    *,
    chunk: Chunk,
    rag_source_id: str,
) -> VectorDTO:
    embedding = await generate_embeddings([chunk["content"]])

    if len(embedding) != 1:
        logger.error("Expected a single embedding to be generated for the content")
        raise ExternalOperationError("Expected a single embedding to be generated for the content")

    return VectorDTO(
        chunk=chunk,
        embedding=embedding[0],
        rag_source_id=rag_source_id,
    )


def safe_filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    base = parsed.netloc + parsed.path
    safe = re.sub(r"[^0-9A-Za-z._-]", "_", base)
    return safe + "_base.txt"


def doc_filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    filename = PathlibPath(path).name
    if not filename:
        base = parsed.netloc + parsed.path
        safe = re.sub(r"[^0-9A-Za-z._-]", "_", base)
        extension = PathlibPath(path).suffix
        if not extension:
            extension = ".bin"
        return safe + extension
    return filename


class CrawlResult(TypedDict):
    url: str
    document_links: list[str]
    markdown_content: str
    text_content: str
    saved_path: str


async def crawl(
    url: str,
    temp_dir: Path,
    depth: int = 0,
    raw_html: str | None = None,
    embeddings1: list[list[float]] | None = None,
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
        embeddings1: Embeddings if already computed
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

    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    if url in visited_urls and raw_html is None:
        return results

    if not raw_html:
        raw_html = await download_page_html(url)
        visited_urls.append(url)
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

    if embeddings1 is None:
        page_text = trafilatura.extract(raw_html, output_format="txt", include_comments=False)
        embeddings1 = await generate_embeddings([cast("str", page_text)])
    else:
        page_text = trafilatura.extract(raw_html, output_format="txt", include_comments=False)

    markdown_content = convert_to_markdown(sanitized_html)
    md_out = text(markdown_content)

    page_filename = safe_filename_from_url(url)
    page_path = temp_dir / page_filename
    await page_path.write_text(md_out)

    for doc_url in doc_links:
        if doc_url in downloaded_files:
            continue

        doc_filename = doc_filename_from_url(doc_url)
        doc_path = temp_dir / doc_filename

        try:
            doc_content = await download_file(doc_url)
            await doc_path.write_bytes(doc_content)
            downloaded_files[doc_url] = doc_path
        except Exception:  # noqa: BLE001
            logger.info("Error downloading file", file_url=doc_url)

    page_result: CrawlResult = {
        "url": url,
        "document_links": cast("list[str]", list(doc_links)),
        "markdown_content": md_out,
        "text_content": str(page_text),
        "saved_path": str(page_path),
    }

    results.append(page_result)

    relevant_links = []
    for link in normal_links:
        try:
            if link in visited_urls:
                continue

            link_html = await download_page_html(str(link))
            visited_urls.append(str(link))

            link_text = trafilatura.extract(link_html, output_format="txt", include_comments=False)
            if link_text is not None:
                link_embeddings = await generate_embeddings([link_text])
            else:
                raise ValueError("Input to embedding function should not be None")

            similarity = cosine_similarity(embeddings1, link_embeddings)

            if similarity[0][0] >= 0.58:
                relevant_links.append((link, link_html, link_embeddings))
        except Exception:  # noqa: BLE001
            logger.info("Error Comparing URL content similarity", url1=url, url2=link)

    if depth < MAX_DEPTH:
        for rlink in relevant_links:
            await crawl(
                str(rlink[0]),
                temp_dir,
                depth=depth + 1,
                raw_html=rlink[1],
                embeddings1=rlink[2],
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
    except Exception as e:  # TODO: catch specific exceptions
        async with session_maker() as session, session.begin():
            await session.execute(
                update(RagSource).where(RagSource.id == source_id).values(indexing_status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()
            raise UrlParsingError("Error parsing URL", context=str(e)) from e
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
                logger.error(
                    "Error inserting vectors.",
                    exec_info=e,
                    url=url,
                )
                await session.rollback()
                raise DatabaseError("Error inserting vectors", context=str(e)) from e

        return files
