# RAG Service E2E Tests

Organized test suite for the RAG (Retrieval-Augmented Generation) service, focusing on grant application and template generation.

## Test Organization

The tests have been reorganized into logical groups for better maintainability:

### Core Test Files

- **`test_evaluation_performance.py`** - Comprehensive evaluation framework tests
  - Baseline performance measurements
  - Evaluation consistency tests
  - Optimization performance (caching, routing, adaptive timeouts)
  - Content complexity analysis
  - Smart evaluation routing
  - Edge case handling

- **`test_grant_application_pipeline.py`** - Grant application generation tests
  - Baseline performance tests
  - Smoke tests for quick validation
  - Optimization strategy comparisons
  - Quality metrics assessment
  - Template extraction and enrichment

- **`test_retrieval_and_search.py`** - Document retrieval and search tests
  - Retrieval smoke tests
  - Quality assessment with diversity metrics
  - Semantic evaluation of relevance
  - Search query generation
  - Integration tests for complete flow

- **`test_performance_optimizations.py`** - Performance optimization tests
  - Token optimization effectiveness
  - Batch processing performance
  - Work plan generation optimizations
  - Comprehensive optimization comparisons

### Support Files

- **`performance_framework.py`** - Unified performance measurement framework
- **`performance_utils.py`** - Utilities for performance testing
- **`test_utils.py`** - Common test utilities
- **`conftest_rag.py`** - Pytest fixtures specific to RAG tests

## Test Categories

Tests are marked with categories for selective execution:

- `@e2e_test(category=E2ETestCategory.SMOKE)` - Quick validation tests (< 5 min)
- `@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT)` - Quality checks (5-10 min)
- `@e2e_test(category=E2ETestCategory.E2E_FULL)` - Full integration tests (10+ min)
- `@e2e_test(category=E2ETestCategory.SEMANTIC_EVALUATION)` - AI-powered evaluation
- `@e2e_test(category=E2ETestCategory.AI_EVAL)` - Advanced AI evaluation tests

## Running Tests

### Run all E2E tests
```bash
E2E_TESTS=1 pytest tests/e2e/
```

### Run specific test file
```bash
E2E_TESTS=1 pytest tests/e2e/test_evaluation_performance.py
```

### Run by category
```bash
# Quick smoke tests
E2E_TESTS=1 pytest -m "smoke"

# Quality assessment tests
E2E_TESTS=1 pytest -m "quality_assessment"

# Full integration tests
E2E_TESTS=1 pytest -m "e2e_full"
```

### Run specific test
```bash
E2E_TESTS=1 pytest tests/e2e/test_evaluation_performance.py::test_evaluation_framework_baseline
```

## Performance Testing

All performance tests use the unified `PerformanceTestContext` which provides:

- Automatic timing of test stages
- LLM call tracking
- Content quality analysis
- Performance metrics collection
- Result persistence for analysis

Example usage:
```python
with PerformanceTestContext(
    test_name="my_test",
    test_category=TestCategory.EVALUATION,
    logger=logger,
) as perf_ctx:
    with perf_ctx.stage_timer("stage_1"):
        # Test code here
        pass
```

## Test Data

Tests use fixtures from `conftest_rag.py` including:
- `melanoma_alliance_full_application_id` - Sample application ID
- `async_session_maker` - Database session factory
- `organization_mapping` - Organization data mapping

## Best Practices

1. **Use appropriate timeouts** - Set realistic timeouts based on test complexity
2. **Mock external services** - Use mocks for LLM calls in unit-style tests
3. **Measure performance** - Use PerformanceTestContext for all performance tests
4. **Assert quality** - Include quality assertions, not just performance
5. **Log meaningful metrics** - Log key metrics for debugging and analysis

## Recent Improvements

### Test Consolidation
- Evaluation tests: 5 files → 1 comprehensive file (`test_evaluation_performance.py`)
- Grant application tests: Multiple files → 1 file (`test_grant_application_pipeline.py`)
- Retrieval tests: Multiple files → 1 file (`test_retrieval_and_search.py`)
- Optimization tests: Multiple files → 1 file (`test_performance_optimizations.py`)

### Better Organization
- Removed deeply nested directory structure
- Consolidated related tests into logical groups
- Clear naming convention for test files
- Comprehensive documentation in each test file

This reorganization makes it easier to:
- Find and run specific tests
- Understand test coverage
- Maintain and update tests
- Add new tests in the appropriate location