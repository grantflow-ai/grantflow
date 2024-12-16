import logging

import pytest
from _pytest.logging import LogCaptureFixture

from src.utils.logging import get_logger
from src.utils.sleep import sleep_with_message

logger = get_logger(__name__)


@pytest.mark.parametrize("duration, identifier", [(1, "test1"), (2, "test2")])
async def test_sleep_with_message(duration: int, identifier: str, caplog: LogCaptureFixture) -> None:
    with caplog.at_level(logging.INFO):
        await sleep_with_message(duration, identifier)

    assert len(caplog.records) == 2
    assert caplog.records[0].message == f"Beginning sleep for {duration} seconds: {identifier}"
    assert caplog.records[1].message == f"Finished sleeping: {identifier}"
