"""
Vector Benchmarking Test Framework

This module provides isolated testing for vector database performance across different dimensions.
It creates a separate test database to avoid interfering with production data.

Key Components:
- schema.py: Database tables for different vector dimensions
- database.py: Manages isolated test database creation/cleanup
- framework.py: Core benchmarking logic and performance measurement
- test_data.py: Generates realistic test data
- benchmark_tests.py: Actual benchmark test cases

Usage:
    # Run vector benchmarks (requires E2E_TESTS=1)
    E2E_TESTS=1 pytest services/rag/tests/vector_benchmarks/ -m "vector_benchmark"

    # Run specific test
    E2E_TESTS=1 pytest services/rag/tests/vector_benchmarks/benchmark_tests.py::test_vector_dimension_comparison
"""
