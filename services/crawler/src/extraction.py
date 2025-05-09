from typing import Any, Final, TypedDict

from anyio import Path, TemporaryDirectory
from crawl4ai import (
    AsyncWebCrawler,
    BestFirstCrawlingStrategy,
    BrowserConfig,
    CrawlerRunConfig,
    DefaultMarkdownGenerator,
    KeywordRelevanceScorer,
    LXMLWebScrapingStrategy,
    PruningContentFilter,
)
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import RagSource, RagUrl
from packages.shared_utils.src.exceptions import DatabaseError, UrlParsingError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class FileContent(TypedDict):
    filename: str
    content: bytes


JS_CODE_TO_RUN_ON_PAGE: Final[str] = r"""
document.querySelectorAll('a[href]').forEach(link => {
  const url = link.getAttribute('href');

  const isDocument = /\.(pdf|docx?|xlsx?|pptx?|txt|md|rtf)$/i.test(url);
  if (!isDocument) {
    return
    };

  try {
    const a = document.createElement('a');
    a.href = link.href;
    a.setAttribute('download', '');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Failed to download:', link.href);
  }
});
"""


async def crawl_url(*, url: str, source_id: str, session_maker: async_sessionmaker[Any]) -> list[FileContent]:
    try:
        async with (
            TemporaryDirectory() as temp_dir,
            AsyncWebCrawler(
                config=BrowserConfig(
                    accept_downloads=True,
                    downloads_path=temp_dir,
                )
            ) as crawler,
        ):
            results = await crawler.arun(
                url=url,
                config=CrawlerRunConfig(
                    js_code=JS_CODE_TO_RUN_ON_PAGE,
                    deep_crawl_strategy=BestFirstCrawlingStrategy(
                        include_external=True,
                        max_depth=2,
                        max_pages=25,
                        url_scorer=KeywordRelevanceScorer(
                            keywords=[
                                "documents",
                                "documentation",
                                "guidelines",
                                "guideline",
                                "manual",
                                "pdf",
                                "doc",
                                "submission",
                                "due date",
                                "deadline",
                                "presentation",
                                "sheet",
                                "documentation",
                                "announcement",
                                "cfp",
                                "call for proposals",
                                "call for papers",
                                "opportunity",
                            ],
                            weight=2.0,
                        ),
                    ),
                    scraping_strategy=LXMLWebScrapingStrategy(),
                    markdown_generator=DefaultMarkdownGenerator(
                        content_filter=PruningContentFilter(threshold=0.5, min_word_threshold=50)
                    ),
                ),
            )
            files = [
                FileContent(filename=file.name, content=await file.read_bytes())
                async for file in Path(temp_dir).glob("**/*")
                if file.is_file()
            ]

            content = ""
            title: str | None = None
            description: str | None = None

            for result in results:
                if not title and result.metadata.title:
                    title = result.metadata.title
                if not description and result.metadata.description:
                    description = result.metadata.description

                content += result.content
                content += "\n\n" + result.markdown

        # TODO: use the chunking library to create a list of VectorDTO objects. See: services/indexer/src/indexing.py
        # vectors = [...]  # noqa: ERA001

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
                # TODO: Uncomment this when vectors are available
                # await session.execute(insert(TextVector).values(vectors))  # noqa: ERA001

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

        # TODO: return any extracted files, which are uploaded to GCS to be indexed.
        return files
