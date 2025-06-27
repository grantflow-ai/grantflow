# RAG Service E2E Tests

Organized test suite for the RAG (Retrieval-Augmented Generation) service, focusing on grant application and template generation.

## Test Organization

### 📁 `baseline/`
Baseline performance tests to establish reference metrics for optimization efforts.

- **`test_grant_application_baseline.py`** - Comprehensive baseline tests for grant application generation
  - Full application generation baseline (SMOKE: 600s)
  - Work plan timing analysis (QUALITY_ASSESSMENT: 1800s)
  - Simple metrics for planning (SMOKE: 300s)
  - Real application testing (QUALITY_ASSESSMENT: 900s)

### 📁 `performance/`
Performance tests focusing on timing and throughput optimization.

- **`test_grant_template_performance.py`** - Grant template generation performance tests
  - Basic performance with strict timing (SMOKE: 150s)
  - Quality + performance analysis (QUALITY_ASSESSMENT: 300s)
  - Component-level quick tests (SMOKE: 120s)
  - Comprehensive cross-source testing (E2E_FULL: 600s)

### 📁 `optimization/`
Optimization tests for specific performance improvements.

- **`test_work_plan_optimization.py`** - Parallel vs sequential work plan processing
- **`test_batch_enrichment_optimization.py`** - Batch vs individual objective enrichment
- **`test_batch_size_optimization.py`** - Optimal batch size determination (includes batch size 3 validation)
- **`test_token_optimization.py`** - Token usage optimization testing

### 📁 `features/`
Feature-specific functional tests.

- **`test_application_generation.py`** - Full grant application text generation
- **`test_extract_cfp_data_multi_source.py`** - Multi-source CFP data extraction
- **`test_generate_grant_template.py`** - Grant template generation for different organizations

### 📁 `quality/`
Quality assessment and validation tests.

- **`test_extract_sections.py`** - Section extraction quality validation
- **`test_rag_evaluation.py`** - RAG retrieval and generation quality
- **`test_retrieval.py`** - Document retrieval accuracy
- **`test_search_queries.py`** - Search query generation and effectiveness

### 📁 Root Level
Specialized tests and legacy compatibility.

- **`test_asaf_erc.py`** - Specific ERC grant testing (Asaf's research)
- **`test_lampel_erc.py`** - Specific ERC grant testing (Lampel's research)
- **`test_error_handling.py`** - Error handling and edge cases
- **`test_genai_integration_smoke.py`** - GenAI integration smoke tests

## Test Categories

Tests are organized using pytest markers for different execution contexts:

### By Duration
- **`smoke`** - Quick validation tests (< 5 minutes)
- **`quality_assessment`** - Moderate quality validation (5-30 minutes)
- **`e2e_full`** - Comprehensive integration tests (30+ minutes)

### By Purpose
- **`baseline`** - Establish reference performance metrics
- **`optimization`** - Test specific performance improvements
- **`quality`** - Validate output quality and accuracy
- **`feature`** - Test specific functionality

## Running Tests

### Quick Smoke Tests
```bash
# All smoke tests (< 5 minutes total)
E2E_TESTS=1 pytest services/rag/tests/e2e/ -m "smoke"

# Specific test category
E2E_TESTS=1 pytest services/rag/tests/e2e/baseline/ -m "smoke"
```

### Quality Assessment
```bash
# Quality assessment tests (5-30 minutes)
E2E_TESTS=1 pytest services/rag/tests/e2e/ -m "quality_assessment"

# Specific optimization tests
E2E_TESTS=1 pytest services/rag/tests/e2e/optimization/
```

### Full Test Suite
```bash
# Complete e2e test suite (30+ minutes)
E2E_TESTS=1 pytest services/rag/tests/e2e/ -m "e2e_full"
```

### By Test Category
```bash
# Baseline tests only
E2E_TESTS=1 pytest services/rag/tests/e2e/baseline/

# Performance optimization tests
E2E_TESTS=1 pytest services/rag/tests/e2e/optimization/

# Feature validation tests
E2E_TESTS=1 pytest services/rag/tests/e2e/features/

# Quality assessment tests
E2E_TESTS=1 pytest services/rag/tests/e2e/quality/
```

## Performance Targets

### Baseline Targets (from `conftest_rag.py`)
- **Excellent**: < 180s
- **Good**: < 300s
- **Acceptable**: < 600s
- **Poor**: < 1200s

### Optimization Goals
- **Batch Processing**: 60-80% time reduction vs sequential
- **Parallel Work Plans**: 2-4x speedup depending on objective count
- **Token Optimization**: 20-40% token usage reduction

## Result Storage

Test results are automatically saved to:
- `testing/test_data/results/baseline_performance/` - Baseline test results
- `testing/test_data/results/performance/` - Performance test results
- `testing/test_data/results/quality_performance/` - Quality + performance results
- `testing/test_data/results/optimization_results/` - Optimization test results

## Configuration Files

- **`conftest_rag.py`** - RAG-specific test fixtures and configuration
- **`utils.py`** - Shared utilities for RAG e2e tests

## Key Improvements Made

### Consolidation
- **Baseline Tests**: 4 files → 1 comprehensive file
- **Performance Tests**: 3 files → 1 comprehensive file
- **Batch Size Tests**: 2 files → 1 comprehensive file

### Organization
- Clear separation by test purpose (baseline, performance, optimization, features, quality)
- Consistent `test_` naming convention
- Logical folder structure for easy navigation

### Enhanced Testing
- Multi-level performance testing (component, pipeline, comprehensive)
- Quality scoring with detailed analysis
- Flexible test execution based on markers
- Comprehensive result tracking and persistence

This organization supports both development workflows (quick smoke tests) and comprehensive validation (full quality assessment) while maintaining clear separation of concerns.