"""
Vector Benchmarking Test Framework

This module provides isolated testing for vector database performance across different dimensions.
It creates a separate test database to avoid interfering with production data.

Key Components:
- schema.py: Database tables for different vector dimensions
- database.py: Manages isolated test database creation/cleanup
- framework.py: Core benchmarking logic and performance measurement
- data_test.py: Generates realistic test data
- benchmark_tests.py: Actual benchmark test cases

Usage:
    # Run vector benchmarks (requires BENCHMARK_TESTS=1)
    BENCHMARK_TESTS=1 uv run pytest services/rag/tests/vector_benchmarks/ -m benchmark -v

    # Run specific test
    BENCHMARK_TESTS=1 uv run pytest services/rag/tests/vector_benchmarks/benchmark_tests.py::test_dimension_comparison -v
"""
