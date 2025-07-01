"""Example of using OpenTelemetry metrics in API routes."""

import time
from typing import Any

from litestar import post
from litestar.di import Provide
from packages.shared_utils.src.metrics import (
    http_request_duration,
    http_requests_total,
    pubsub_messages_total,
)
from packages.shared_utils.src.tracing import add_span_attributes
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.common import allowed_roles
from services.backend.src.api.routes.sources import CrawlURLRequest
from services.backend.src.common_types import APIRequestState, UserRoleEnum


@post(
    "/sources/crawl-with-metrics",
    dependencies={"session_maker": Provide("not-sync-by-default")},
    opt=allowed_roles([UserRoleEnum.MEMBER]),
)
async def handle_crawl_url_with_metrics(
    data: CrawlURLRequest,
    request: APIRequestState,
    session_maker: async_sessionmaker[Any],
) -> dict[str, str]:
    """Example endpoint showing OpenTelemetry metrics usage."""
    start_time = time.time()
    status = "success"

    try:
        
        add_span_attributes(
            operation="crawl_url",
            url=data["url"],
            project_id=str(data["project_id"]),
        )

        
        

        
        pubsub_messages_total.add(
            1,
            attributes={
                "topic": "url-crawling",
                "operation": "publish",
                "status": "success",
            }
        )

        return {"status": "success", "message": "URL crawl initiated"}

    except Exception as e:
        status = "error"
        add_span_attributes(error=str(e))
        raise

    finally:
        
        duration = time.time() - start_time

        http_requests_total.add(
            1,
            attributes={
                "service": "backend",
                "method": "POST",
                "endpoint": "/sources/crawl-with-metrics",
                "status": status,
            }
        )

        http_request_duration.record(
            duration,
            attributes={
                "service": "backend",
                "endpoint": "/sources/crawl-with-metrics",
            }
        )