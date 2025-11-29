# shared-testing

Testing infrastructure package for the grantflow monorepo.

## Installation

Install the base testing package with core pytest dependencies:

```bash
uv add --group test shared-testing
```

Or install with optional dependency groups for specific testing needs:

```bash
# With database testing support
uv add --group test shared-testing[db]

# With multiple features
uv add --group test shared-testing[db,pubsub,gcs]

# With all features
uv add --group test shared-testing[all]
```

## Optional Dependency Groups

- `[db]` - PostgreSQL testing with testcontainers and snapshot-based restoration
- `[gcs]` - Google Cloud Storage emulator support
- `[pubsub]` - Google Cloud Pub/Sub mocking and testing
- `[rag]` - RAG-specific testing utilities (polyfactory, pgvector)
- `[evaluation]` - AI-powered evaluation and quality assessment
- `[performance]` - Performance testing framework
- `[firebase]` - Firebase authentication mocking
- `[playwright]` - Browser testing support
- `[scenarios]` - YAML-based test scenario loading
- `[all]` - All optional dependencies

## Usage

### Loading Pytest Plugins

In your service's `tests/conftest.py`:

```python
# Load plugins you need
pytest_plugins = [
    "shared_testing.plugins.base",      # Always include this
    "shared_testing.plugins.db",        # For database tests
    "shared_testing.plugins.pubsub",    # For Pub/Sub tests
    "shared_testing.plugins.gcs",       # For GCS tests
]
```

### Using Test Factories

```python
from shared_testing.factories import (
    OrganizationFactory,
    ProjectFactory,
    GrantApplicationFactory,
)

# Create test data
org = OrganizationFactory.build()
project = ProjectFactory.build(organization_id=org.id)
```

### Using Test Utilities

```python
from shared_testing.utils import get_test_files_by_tier, load_pre_generated_vectors
from shared_testing.evaluation import calculate_retrieval_diversity
from shared_testing import SOURCES_FOLDER, FIXTURES_FOLDER

# Load test files by tier (smoke/quality/e2e_full)
test_files = get_test_files_by_tier("smoke")

# Load pre-generated vectors from fixtures
vectors = load_pre_generated_vectors(FIXTURES_FOLDER / "some_fixture.json")

# Evaluate RAG retrieval quality
diversity_score = calculate_retrieval_diversity(retrieved_docs)
```

### Using Firebase Mocks

```python
from shared_testing.firebase import MockUser, MockResult, mock_firebase_get_users
from unittest.mock import patch

# Mock Firebase auth
with patch("firebase_admin.auth.get_users", side_effect=mock_firebase_get_users):
    # Your test code here
    pass
```

## Test Data

Test data is located at the project root in `testing_data/`:

- `testing_data/sources/` - Source documents (PDFs, DOCx) for testing
- `testing_data/fixtures/` - Pre-processed test data (JSON)
- `testing_data/scenarios/` - E2E test scenarios with metadata.yaml
- `testing_data/nlp_cfp_samples/` - NLP test samples

Access paths via the package:

```python
from shared_testing import (
    SOURCES_FOLDER,
    FIXTURES_FOLDER,
    SCENARIOS_FOLDER,
    RESULTS_FOLDER,
)
```

## Architecture

### Plugins

- **base.py** - Common fixtures (faker, logger, trace_id, environment setup)
- **db.py** - PostgreSQL testcontainer with snapshot-based fast restoration
- **gcs.py** - GCS emulator using fake-gcs-server Docker container
- **pubsub.py** - Pub/Sub mocking and topic creation

### Factories

SQLAlchemy and TypedDict factories using polyfactory for generating test data:
- Organizations, Projects, Users
- Grant Applications and Templates
- RAG Files and URLs
- Granting Institutions

### Utils

- **core.py** - Database seeding, file parsing, application creation
- **data.py** - Test file selection, fixture loading, performance benchmarking
- **kreuzberg.py** - Cached document extraction for performance

### Evaluation

- **rag.py** - RAG quality metrics (diversity, query quality, structure validation)
- **ai.py** - AI-powered evaluation using Claude API
- **performance.py** - Performance testing framework with grades and metrics
- **utils.py** - Embedding analysis, chunk quality assessment
- **red_team.py** - Red team output utilities for manual review
- **baselines.py** - Performance baseline tracking and regression detection

## Development

To modify this package:

1. Make changes in `packages/testing/src/grantflow_testing/`
2. Run `uv lock` from project root to update dependencies
3. Test changes in a service that uses the package

## License

UNLICENSED
