from typing import Final, NamedTuple, NotRequired, TypedDict

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
from packages.shared_utils.src.exceptions import ExternalOperationError


class URLCrawlResult(TypedDict):
    author: NotRequired[str]
    content: str
    depth: int
    description: NotRequired[str]
    keywords: NotRequired[list[str]]
    parent_url: NotRequired[str]
    score: int
    title: NotRequired[str]
    url: str


class FileContent(TypedDict):
    filename: str
    content: bytes


class CrawlResult(NamedTuple):
    results: list[URLCrawlResult]
    files: list[FileContent]


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


async def crawl_url(url: str) -> CrawlResult:
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
                FileContent(
                    filename=file.name,
                    content=await file.read_bytes(),
                )
                async for file in Path(temp_dir).glob("**/*")
                if await file.is_file()
            ]

            crawl_results: list[URLCrawlResult] = []
            for result in results:
                if not result.success:
                    continue

                crawl_result = URLCrawlResult(
                    content=str(result.markdown),
                    url=result.url,
                    score=result.metadata.get("score", 0),
                    depth=result.metadata.get("depth", 0),
                )
                if author := result.metadata.get("author"):
                    crawl_result["author"] = author
                if title := result.metadata.get("title"):
                    crawl_result["title"] = title
                if description := result.metadata.get("description"):
                    crawl_result["description"] = description
                if keywords := result.metadata.get("keywords"):
                    crawl_result["keywords"] = keywords
                if parent_url := result.metadata.get("parent_url"):
                    crawl_result["parent_url"] = parent_url

                crawl_results.append(crawl_result)

            return CrawlResult(
                results=crawl_results,
                files=files,
            )
    except ValueError as e:
        raise ExternalOperationError("Failed to crawl URL", context={url: url}) from e
