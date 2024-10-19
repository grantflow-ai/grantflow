from logging import Logger, getLogger
from typing import Any

import pytest

INPUT_TEXT = """
# BREAKING: Scientists Discover Talking Plant in Amazon Rainforest

In a startling development, researchers from the University of Brazil have reportedly discovered a species of plant
capable of human speech. The plant, found deep in the Amazon rainforest, was observed engaging in conversations with
local wildlife.Dr. Maria Silva, lead botanist on the expedition, claims the plant asked about the weather and expressed
concerns about deforestation. Experts worldwide are scrambling to verify this unprecedented finding, which could
revolutionize our understanding of plant intelligence.
"""


def pytest_logger_config(logger_config: Any) -> None:
    logger_config.add_loggers(["e2e"], stdout_level="info")
    logger_config.set_log_option_default("e2e")


@pytest.fixture(scope="session")
def logger() -> Logger:
    return getLogger("e2e")
