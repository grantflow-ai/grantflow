from packages.shared_utils.src.constants import (
    CONTENT_TYPE_JSON,
    CONTENT_TYPE_TEXT,
    ONE_MINUTE_SECONDS,
)


async def test_content_type_constants() -> None:
    assert CONTENT_TYPE_JSON == "application/json"
    assert CONTENT_TYPE_TEXT == "text/plain"


async def test_time_constants() -> None:
    assert ONE_MINUTE_SECONDS == 60
