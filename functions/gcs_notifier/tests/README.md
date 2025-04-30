# GCS File Notifier Tests

This directory contains tests for the GCS File Notifier Cloud Function.

## Running Tests

To run the tests:

```bash
# From the project root
PYTHONPATH=. uv run pytest functions/gcs_notifier/tests/ -v

# To generate a coverage report
PYTHONPATH=. uv run pytest functions/gcs_notifier/tests/ --cov=functions.gcs_notifier -v
```

## Test Coverage

The test suite covers:

- Successful event forwarding
- Handling events with no data
- Error cases (HTTP errors, connection issues)
- Request formatting validation
- Logging behavior
- Empty file path cases

## Mocking Strategy

The tests use pytest fixtures and unittest.mock to mock:

1. Environment variables (via get_env)
2. The HTTP client
3. The logger
4. CloudEvent objects

These mocks isolate the function code from external dependencies for reliable, reproducible testing.
