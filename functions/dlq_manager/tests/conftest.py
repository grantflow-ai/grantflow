import os

import pytest
from testcontainers.postgres import PostgresContainer

if "GCP_PROJECT_ID" not in os.environ:
    os.environ["GCP_PROJECT_ID"] = "test-project"

pytest_plugins = ["testing.db_test_plugin"]


@pytest.fixture(scope="session", autouse=True)
def set_database_url_for_dlq_manager(postgres_container: PostgresContainer | None) -> None:
    if "DATABASE_URL" not in os.environ:
        if postgres_container is None:
            msg = "No DATABASE_URL set and testcontainer not available"
            raise RuntimeError(msg)
        container_url = postgres_container.get_connection_url().replace("postgresql://", "postgresql+asyncpg://")
        os.environ["DATABASE_URL"] = container_url
