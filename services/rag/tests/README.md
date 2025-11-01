# RAG Service Test Organization

## Overview

The RAG service test suite is organized to provide clear separation between different test types and ensure efficient test execution. This document describes the test structure and guidelines for writing and organizing tests.

## Directory Structure

```
services/rag/tests/
├── unit/                    # Pure unit tests - isolated, fast tests
├── integration/             # Integration tests - test component interactions
│   ├── grant_application/   # Grant application integration tests
│   ├── grant_template/      # Grant template integration tests
│   └── autofill/           # Autofill functionality tests
├── e2e/                    # End-to-end tests
│   └── performance/        # Performance and benchmarking tests
├── benchmarks/             # Performance benchmarks
│   └── vector_benchmarks/  # Vector database benchmarks
└── conftest.py            # Shared fixtures and configuration
```

## Test Categories

Tests are categorized by both **execution speed** and **domain**:

### Execution Speed Categories

- **SMOKE** (`< 1 minute`): Quick validation tests for CI/CD
- **QUALITY** (`2-5 minutes`): Comprehensive quality checks
- **E2E_FULL** (`10+ minutes`): Complete end-to-end tests

### Domain Categories

- **GRANT_TEMPLATE**: Grant template processing tests
- **GRANT_APPLICATION**: Grant application generation tests
- **OPTIMIZATION**: Performance optimization tests
- **VECTOR_BENCHMARK**: Vector database performance tests
- **SEMANTIC_EVALUATION**: Semantic similarity tests
- **AI_EVALUATION**: AI-powered evaluation tests

## Using the Performance Framework

The unified performance framework provides comprehensive test measurement and reporting:

```python
from testing.performance_framework import performance_test, PerformanceTestContext, TestExecutionSpeed, TestDomain

@performance_test(
    execution_speed=TestExecutionSpeed.QUALITY,
    domain=TestDomain.GRANT_APPLICATION,
    timeout=300
)
async def test_grant_application_generation(performance_context: PerformanceTestContext):
    # Start timing a stage
    performance_context.start_stage("data_preparation")
    # ... do work ...
    performance_context.end_stage()

    performance_context.start_stage("generation")
    # ... generate content ...
    performance_context.end_stage()

    # Add metadata
    performance_context.set_metadata("sections_generated", 5)
```

## Running Tests

### Task Commands

```bash
# Run all RAG tests
task service:rag:test

# Run smoke tests (< 1 min)
task service:rag:test:e2e:smoke

# Run quality tests (2-5 min)
task service:rag:test:e2e:quality

# Run full e2e tests (10+ min)
task service:rag:test:e2e:full

# Run semantic evaluation
task service:rag:test:e2e:semantic

# Run AI evaluation
task service:rag:test:e2e:ai
```

### Direct Pytest Commands

```bash
# Run specific test categories
E2E_TESTS=1 pytest -m smoke services/rag/tests/
E2E_TESTS=1 pytest -m quality services/rag/tests/
E2E_TESTS=1 pytest -m grant_application services/rag/tests/

# Run with specific timeouts
E2E_TESTS=1 pytest --timeout=60 -m smoke services/rag/tests/
```

## Writing Tests

### Test Organization Guidelines

1. **Unit Tests**: Place in `unit/` - should be fast, isolated, and test single functions/classes
2. **Integration Tests**: Place in `integration/` - test component interactions with real databases
3. **E2E Tests**: Place in `e2e/` - test complete workflows end-to-end
4. **Benchmarks**: Place in `benchmarks/` - performance and load testing

### File Size Guidelines

- Keep test files under **500 lines**
- Split large test files by:
  - Test type (positive, negative, edge cases)
  - Functionality (extraction, generation, validation)
  - Component (handler, utils, validators)

### Naming Conventions

- Test files: `*_test.py`
- Test functions: `test_<functionality>_<scenario>`
- Fixtures: Descriptive names indicating purpose

### Using Fixtures

Common fixtures are available in `conftest.py`:

```python
async def test_with_application(melanoma_application_data):
    """Test using real application data."""
    application = melanoma_application_data["application"]
    # ... test logic ...

async def test_with_objectives(simple_test_objectives):
    """Test with simple objectives."""
    objectives = simple_test_objectives
    # ... test logic ...
```

## Performance Testing

### Setting Performance Targets

```python
from testing.performance_framework import PerformanceTargets, StageTimingConfig

targets = PerformanceTargets(
    excellent_seconds=30,
    good_seconds=60,
    acceptable_seconds=120,
    poor_seconds=180,
    stage_configs=[
        StageTimingConfig("preparation", target_seconds=10, critical_threshold=20),
        StageTimingConfig("generation", target_seconds=50, critical_threshold=80),
    ]
)
```

### Analyzing Results

Performance results are automatically saved to `testing/test_data/results/performance/` organized by date and domain.

## Known Issues

None currently. All tests should be passing and stable.

## Best Practices

1. **Always use real PostgreSQL** for integration/e2e tests
2. **Mock external services** (LLMs, APIs) for predictable tests
3. **Use performance context** for timing critical paths
4. **Add appropriate markers** for test categorization
5. **Document complex test scenarios** with docstrings
6. **Clean up resources** in test teardown

## Migration from Old Structure

If you're migrating tests from the old structure:

1. Update imports:
   ```python
   # Old
   from services.rag.tests.e2e.performance_framework import PerformanceTestContext

   # New
   from testing.performance_framework import PerformanceTestContext
   ```

2. Update test decorators:
   ```python
   # Old
   from testing.e2e_utils import e2e_test

   # New
   from testing.performance_framework import performance_test
   ```

3. Move fixtures from `conftest_rag.py` to main `conftest.py`

## Contributing

When adding new tests:

1. Choose appropriate directory based on test type
2. Use consistent naming and organization
3. Add performance measurement for critical paths
4. Document complex test scenarios
5. Ensure tests are deterministic and reliable
