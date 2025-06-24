"""
pytest plugin for xdist configuration based on environment
"""

import os
from typing import Any


def pytest_configure(config: Any) -> None:
    """Configure pytest-xdist based on environment."""

    if os.environ.get("CI") == "true" and config.getoption("-n") == "auto":
        config.option.numprocesses = 2

    if num_workers := os.environ.get("PYTEST_XDIST_WORKERS"):
        config.option.numprocesses = int(num_workers)
