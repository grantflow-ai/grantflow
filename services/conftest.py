"""
Pytest configuration for services tests.
"""

import pytest


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """
    Automatically add xdist_group marker to tests that use database fixtures.
    This ensures database tests run in the same worker to avoid Docker container conflicts.
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
    }

    for item in items:
        if hasattr(item, "fixturenames") and any(fixture in db_fixtures for fixture in item.fixturenames):
            module_parts = item.module.__name__.split(".") if hasattr(item, "module") else []
            module_name = module_parts[1] if len(module_parts) > 1 else "unknown"
            item.add_marker(pytest.mark.xdist_group(f"db_{module_name}"))
