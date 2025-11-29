# 1. Shared Testing Package

Date: 2025-11-29

## Status

Accepted

## Context

The monorepo had testing infrastructure scattered across multiple locations:

1. **Test plugins** were in the root `testing/` directory with no proper package structure
2. **Test data** (PDFs, DOCX, JSON fixtures) was mixed with code in `testing/test_data/`
3. **Test factories and utilities** were duplicated or tightly coupled to individual services
4. **Dependencies** were installed globally at the root level, making it unclear which test features required which dependencies
5. **Reusability** was limited - services couldn't easily import shared test infrastructure
6. **Type safety** was incomplete - no proper package exports or `__all__` declarations

This made it difficult to:
- Understand which dependencies were needed for specific test types
- Share test infrastructure across services
- Maintain test code with proper type checking
- Scale the test suite as the codebase grows

## Decision

We created `packages/shared-testing/` as a proper workspace package with:

### Package Structure
```
packages/shared-testing/
├── src/shared_testing/
│   ├── __init__.py          # Path constants (SOURCES_FOLDER, FIXTURES_FOLDER, etc.)
│   ├── plugins/             # Pytest plugins (base, db, gcs, pubsub)
│   ├── factories/           # Test data factories (24 factories for all models)
│   ├── utils/               # Test utilities (core, data, kreuzberg)
│   ├── evaluation/          # Evaluation modules (rag, ai, performance, baselines)
│   └── firebase/            # Firebase mocks
├── pyproject.toml           # Package config with 9 optional dependency groups
└── README.md                # Comprehensive usage documentation
```

### Optional Dependency Groups
Users can install only what they need:
```bash
uv add --group test shared-testing              # Base pytest
uv add --group test shared-testing[db]          # + Database testing
uv add --group test shared-testing[rag]         # + RAG testing utilities
uv add --group test shared-testing[all]         # All features
```

Groups: `[db]`, `[gcs]`, `[pubsub]`, `[rag]`, `[evaluation]`, `[performance]`, `[firebase]`, `[playwright]`, `[scenarios]`

### Test Data Organization
Moved test data out of the package to project root:
- `testing_data/sources/` - Source documents (PDFs, DOCX)
- `testing_data/fixtures/` - Pre-processed test data (JSON)
- `testing_data/scenarios/` - E2E test scenarios
- `testing_results/` - Test run outputs (gitignored)

### Import Guards
All optional dependencies use import guards:
```python
try:
    from testcontainers.postgres import PostgresContainer
except ImportError as e:
    raise ImportError(
        "Database testing requires optional dependencies. "
        "Install with: uv add --group test shared-testing[db]"
    ) from e
```

## Consequences

### Positive Consequences

1. **Modular Dependencies**: Services only install test dependencies they actually use
2. **Better Reusability**: Clean imports like `from shared_testing.factories import OrganizationFactory`
3. **Type Safety**: Full mypy strict compliance with proper `__all__` exports
4. **Clear Documentation**: README with installation examples and usage patterns
5. **Cleaner Services**: Moved test-only utilities (Firebase mocks, performance baselines) into shared package
6. **Maintainability**: All test infrastructure in one place with consistent patterns
7. **Scalability**: Easy to add new test features as optional dependency groups

### Negative Consequences

1. **Migration Effort**: Services still need to be migrated from old `testing/` imports (Phase 4 work)
2. **Build Complexity**: Package must be built before services can import it
3. **Two Locations**: Test data at project root (`testing_data/`) separate from code (`packages/shared-testing/`)

### Risks

1. **Breaking Changes**: Services using old imports will need updates (mitigated by keeping old structure temporarily)
2. **Dependency Conflicts**: Multiple services might need different versions (mitigated by workspace dependency resolution)

## Alternatives Considered

### Alternative 1: Keep Everything in Root testing/ Directory

**Description**: Continue using flat `testing/` directory without package structure

**Pros**:
- No migration needed
- Simple imports

**Cons**:
- No dependency modularization
- Hard to maintain as codebase grows
- Type checking issues
- No reusability across workspace

**Why rejected**: Doesn't scale, lacks proper packaging benefits

### Alternative 2: Per-Service Test Packages

**Description**: Each service has its own test utilities package

**Pros**:
- Complete isolation
- Service-specific customization

**Cons**:
- Massive code duplication
- Inconsistent patterns across services
- No shared fixtures or utilities
- Much harder to maintain

**Why rejected**: Goes against monorepo shared infrastructure principles

### Alternative 3: Single Mega Package with All Dependencies

**Description**: One package with all dependencies required upfront

**Pros**:
- Simpler - no optional groups needed
- All features always available

**Cons**:
- Heavy dependency footprint for all services
- Slower installs
- Unnecessary dependencies (e.g., playwright for backend-only tests)
- Violates principle of installing only what you need

**Why rejected**: Conflicts with goal of modular, lightweight testing

## Implementation Notes

### Migration Path (Phases)

**Phase 1-3 (Complete)**: Create package, migrate code, organize test data
**Phase 4 (Pending)**: Migrate services to use `shared-testing` package
**Phase 5 (Pending)**: Update CI/CD configuration
**Phase 6 (Pending)**: Remove old `testing/` directory

### Lint Configuration

Added specific overrides for test infrastructure code:
```toml
lint.per-file-ignores."packages/shared-testing/**/*.*" = [
  "ARG001",  # Unused function arguments (pytest fixtures with side effects)
  "S101",    # Use of assert (normal in test utilities)
  "S311",    # Use of random.choice() (non-cryptographic test data)
  "S608",    # SQL injection warnings (false positives for controlled test DBs)
]
```

### Backward Compatibility

Old `testing/` directory kept temporarily with lint overrides to allow gradual migration without breaking existing tests.

## References

- PR #763: https://github.com/grantflow-ai/monorepo/pull/763
- Reference implementation: `~/workspace/ecton/monorepo/packages/ecton-testing`
- Package: `packages/shared-testing/`
- Test data: `testing_data/`
- CI validation: All Python services (Crawler, Indexer, Scraper, DB Package, Shared Utils) passing with new structure
