from logging import Logger, getLogger
from typing import Any

import pytest


def pytest_logger_config(logger_config: Any) -> None:
    logger_config.add_loggers(["e2e"], stdout_level="info")
    logger_config.set_log_option_default("e2e")


@pytest.fixture(scope="session")
def logger() -> Logger:
    return getLogger("e2e")
