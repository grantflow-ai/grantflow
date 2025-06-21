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
        "workspace",
        "workspace_user",
        "workspace_member_user",
        "workspace_admin_user",
        "workspace_owner_user",
        "grant_application",
        "grant_template",
        "funding_organization",
        "rag_file",
        "rag_url",
    }

    for item in items:
        # Check if the test uses any database fixtures
        if hasattr(item, "fixturenames") and any(fixture in db_fixtures for fixture in item.fixturenames):
            # Group database tests by their module to reduce container conflicts
            # but still allow some parallelization between different services
            module_parts = item.module.__name__.split(".") if hasattr(item, "module") else []
            module_name = module_parts[1] if len(module_parts) > 1 else "unknown"
            item.add_marker(pytest.mark.xdist_group(f"db_{module_name}"))
