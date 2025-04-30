from typing import Literal, TypedDict

from litestar import post
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app

logger = get_logger(__name__)


class CrawlingRequest(TypedDict):
    url: str


class CrawlingResponse(TypedDict):
    status: Literal["success", "error"]
    results: list[dict[str, str]]


@post("/{workspace_id:uuid}/{application_id:uuid}/crawl")
async def handle_url_crawling(
    data: CrawlingRequest,
) -> CrawlingResponse:
    pass


app = create_litestar_app(
    logger=logger,
    add_session_maker=False,  #  we do not need a DB connection here.
    route_handlers=[
        handle_url_crawling,
    ],
)
