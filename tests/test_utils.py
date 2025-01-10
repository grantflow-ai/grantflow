from typing import Any
from unittest.mock import Mock

from sanic import Request
from sanic.compat import Header


def create_test_request(
    url: str = "/", headers: dict[str, Any] | None = None, method: str = "GET", **kwargs: Any
) -> Request:
    return Request(
        url_bytes=url.encode(),
        headers=Header(headers or {}),
        version="1.1",
        method=method,
        transport=Mock(),
        app=Mock(),
        **kwargs,
    )
