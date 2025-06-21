"""
pytest plugin for xdist configuration based on environment
"""

import os
from typing import Any


def pytest_configure(config: Any) -> None:
    """Configure pytest-xdist based on environment."""
    # Check if we're in CI
    if os.environ.get("CI") == "true" and config.getoption("-n") == "auto":
        # GitHub Actions provides 2 CPU cores
        # Override -n auto to use exactly 2 workers in CI
        config.option.numprocesses = 2

    # Allow overriding with environment variable
    if num_workers := os.environ.get("PYTEST_XDIST_WORKERS"):
        config.option.numprocesses = int(num_workers)
