from asyncio import gather
from typing import Literal, TypedDict
from uuid import UUID

from litestar import post
from packages.shared_utils.src.gcs import upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app
from services.crawler.src.extraction import crawl_url

logger = get_logger(__name__)


class CrawlingRequest(TypedDict):
    url: str
    type: Literal["grant_application", "grant_template"]
    parent_id: UUID


@post("/")
async def handle_url_crawling(
    data: CrawlingRequest,
) -> None:
    results, files = await crawl_url(
        url=data["url"],
    )
    if files:
        # we are uploading the files to GCS to have them indexed:
        await gather(
            *[
                upload_blob(
                    blob_path=f"{data['type']}/{data['parent_id']}/{file['filename']}",
                    content=file["content"],
                )
                for file in files
            ]
        )


app = create_litestar_app(
    logger=logger,
    add_session_maker=False,  #  we do not need a DB connection here.
    route_handlers=[
        handle_url_crawling,
    ],
)
