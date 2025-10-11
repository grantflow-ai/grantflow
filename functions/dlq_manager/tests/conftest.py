"""Test configuration for DLQ Manager tests."""

import os

import pytest
from testcontainers.postgres import PostgresContainer

# Set GCP_PROJECT_ID for tests
if "GCP_PROJECT_ID" not in os.environ:
    os.environ["GCP_PROJECT_ID"] = "test-project"

# Import common fixtures from testing package
pytest_plugins = ["testing.db_test_plugin"]


@pytest.fixture(scope="session", autouse=True)
def set_database_url_for_dlq_manager(postgres_container: PostgresContainer | None) -> None:
    """Set DATABASE_URL before DLQ manager module is imported.

    This fixture runs before any tests and sets DATABASE_URL to either:
    - The user's DATABASE_URL if already set (local development)
    - The testcontainer URL if using testcontainers
    """
    if "DATABASE_URL" not in os.environ:
        if postgres_container is None:
            msg = "No DATABASE_URL set and testcontainer not available"
            raise RuntimeError(msg)
        # Get connection URL from testcontainer and set it
        container_url = postgres_container.get_connection_url().replace("postgresql://", "postgresql+asyncpg://")
        os.environ["DATABASE_URL"] = container_url
