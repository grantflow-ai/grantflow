"""Test utilities for the grantflow testing package."""

# Re-export from core utilities
from shared_testing.utils.core import (
    create_funding_application,
    create_grant_application_data,
    create_grant_template_for_application,
    ensure_cfp_content_exists,
    ensure_directory,
    ensure_directory_exists,
    get_granting_institution,
    get_source_files,
    parse_and_store_source_files,
    parse_source_file,
    process_application_files,
    process_granting_institution,
    process_organization_files,
)

# Re-export from data utilities
from shared_testing.utils.data import (
    benchmark_test_performance,
    create_test_scenarios,
    get_fixture_files_by_size,
    get_optimal_test_configuration,
    get_test_content_summary,
    get_test_files_by_tier,
    load_pre_generated_vectors,
    validate_test_data_integrity,
)

# Re-export from kreuzberg utilities
from shared_testing.utils.kreuzberg import extract_with_cache

__all__ = [
    # Data utilities
    "benchmark_test_performance",
    # Core utilities
    "create_funding_application",
    "create_grant_application_data",
    "create_grant_template_for_application",
    "create_test_scenarios",
    "ensure_cfp_content_exists",
    "ensure_directory",
    "ensure_directory_exists",
    # Kreuzberg utilities
    "extract_with_cache",
    "get_fixture_files_by_size",
    "get_granting_institution",
    "get_optimal_test_configuration",
    "get_source_files",
    "get_test_content_summary",
    "get_test_files_by_tier",
    "load_pre_generated_vectors",
    "parse_and_store_source_files",
    "parse_source_file",
    "process_application_files",
    "process_granting_institution",
    "process_organization_files",
    "validate_test_data_integrity",
]
