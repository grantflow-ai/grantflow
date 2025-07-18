"""
Pytest configuration for services tests.
"""

import pytest


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """
    Automatically add xdist_group marker to tests that use database fixtures.
    This ensures database tests run in the same worker to avoid Docker container conflicts.

    Enhanced strategy:
    1. Group by service AND test file to minimize conflicts
    2. Separate read-only tests from write tests when possible
    """
    db_fixtures = {
        "async_session_maker",
        "async_db_engine",
        "db_connection_string",
        "project",
        "project_user",
        "project_member_user",
        "project_admin_user",
        "project_owner_user",
        "grant_application",
        "grant_template",
        "funding_organization",
        "rag_file",
        "rag_url",
        "organization",
        "organization_user",
    }

    for item in items:
        if hasattr(item, "fixturenames") and any(fixture in db_fixtures for fixture in item.fixturenames):
            module_parts = item.module.__name__.split(".") if hasattr(item, "module") else []
            service_name = module_parts[1] if len(module_parts) > 1 else "unknown"

            test_file = ""
            if hasattr(item, "fspath"):
                test_file = str(item.fspath).split("/")[-1].replace("_test.py", "")

            group_name = f"db_{service_name}_{test_file}" if test_file else f"db_{service_name}"

            item.add_marker(pytest.mark.xdist_group(group_name))
