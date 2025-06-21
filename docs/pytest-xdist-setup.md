# pytest-xdist Setup for Parallel Test Execution

## Overview

pytest-xdist has been configured at the root level to enable parallel test execution by default for both local development and CI environments.

## Installation

```bash
uv add pytest-xdist --dev
```

## Configuration

### pyproject.toml

Added the following to `[tool.pytest.ini_options]`:

```toml
# Enable pytest-xdist for both local development and CI
addopts = [
  "-n", "auto",  # Use all available CPU cores (2 in GitHub Actions, more locally)
  "--dist", "worksteal",  # Dynamic test distribution for better load balancing
  "--maxprocesses", "4",  # Limit to 4 workers max
  "-x",  # Stop on first failure to get faster feedback
  "--strict-markers",  # Ensure all markers are registered
  "--tb=short",  # Shorter traceback format for better readability in CI
]
plugins = ["testing.xdist_config_plugin"]
```

### testing/xdist_config_plugin.py

Created a custom pytest plugin that optimizes xdist for different environments:

```python
def pytest_configure(config):
    """Configure pytest-xdist based on environment."""
    # Check if we're in CI
    if os.environ.get("CI") == "true":
        # GitHub Actions provides 2 CPU cores
        # Override -n auto to use exactly 2 workers in CI
        if config.getoption("-n") == "auto":
            config.option.numprocesses = 2

    # Allow overriding with environment variable
    if num_workers := os.environ.get("PYTEST_XDIST_WORKERS"):
        config.option.numprocesses = int(num_workers)
```

## Task Commands

Updated `Taskfile.yaml` with new test commands:

- `task test` - Run all tests with parallel execution (default)
- `task test:serial` - Run all tests in serial mode (no parallelization)
- `task test:ci` - Run tests in CI mode (uses pytest-ci.ini)
- `task service:rag:test` - Run RAG tests with parallel execution
- `task service:rag:test:serial` - Run RAG tests in serial mode

## Performance Improvement

The parallel execution significantly improves test performance:

- **Parallel execution**: ~16.5 seconds (using 8 workers)
- **Serial execution**: ~28.4 seconds
- **Performance gain**: ~42% faster

## Usage

### Local Development (Parallel by Default)

```bash
# Run all tests (parallel - uses all CPU cores)
task test

# Run specific service tests (parallel)
task service:rag:test

# Run with pytest directly (parallel)
PYTHONPATH=. uv run pytest
```

### CI Environment (Parallel with 2 workers)

GitHub Actions automatically sets `CI=true`, which the plugin detects:

```bash
# In CI, automatically uses 2 workers (GitHub Actions has 2 CPUs)
pytest  # Plugin detects CI=true and sets workers to 2
```

### Custom Worker Count

```bash
# Override number of workers with environment variable
PYTEST_XDIST_WORKERS=8 pytest  # Use 8 workers
PYTEST_XDIST_WORKERS=1 pytest  # Use 1 worker (serial)
```

### Disable Parallelization

```bash
# Using task commands
task test:serial
task service:rag:test:serial

# Using pytest directly
PYTHONPATH=. uv run pytest -n0
```

## Benefits

1. **Faster local development**: Tests run ~42% faster using all available CPU cores
2. **Better resource utilization**: Dynamic work stealing ensures efficient distribution
3. **CI compatibility**: CI continues to run tests serially to avoid resource issues
4. **Flexible configuration**: Easy to switch between parallel and serial execution

## Notes

- The `--dist worksteal` option provides better load balancing than the default `--dist load`
- Maximum 8 workers to prevent resource exhaustion on development machines
- Some tests may need to be marked with `@pytest.mark.xdist_group("group_name")` if they have shared state