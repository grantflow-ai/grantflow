# RAG Quality Benchmark Testing Harness

## Overview

A comprehensive testing harness for evaluating RAG (Retrieval Augmented Generation) pipeline performance across multiple embedding models with complete metrics comparison tables.

## Key Features

✅ **Comprehensive Table-Based Reporting** - Shows all metrics for all models side-by-side  
✅ **Multiple Output Formats** - Markdown tables and CSV export  
✅ **Advanced Quality Metrics** - Diversity scores, query quality, AI evaluation  
✅ **Robust AI Evaluation** - Fixed JSON parsing issues with fallback handling  
✅ **Multi-Model Support** - MiniLM (384d), SciBERT (768d), MPNet (768d)  
✅ **Production Pipeline Testing** - Uses actual `retrieve_documents()` function  

## Quick Start

### Prerequisites

1. **Environment Setup**:
   ```bash
   # Only required for AI evaluation (optional)
   export ANTHROPIC_API_KEY=your_key_here  # For AI evaluation
   # Note: BENCHMARK_TESTS=1 is automatically set by run_benchmark.py
   ```

2. **Database**: PostgreSQL with pgvector extension must be running locally

3. **Models**: The following embedding models will be downloaded automatically:
   - `sentence-transformers/all-MiniLM-L12-v2` (384 dimensions)
   - `allenai/scibert_scivocab_uncased` (768 dimensions) 
   - `sentence-transformers/all-mpnet-base-v2` (768 dimensions)

### Running the Comprehensive Benchmark

**Recommended Method** (uses convenience script):
```bash
# From repository root - handles all environment setup automatically
python3 run_benchmark.py
```

**Manual Method** (if you need custom options):
```bash
# From repository root
PYTHONPATH=. BENCHMARK_TESTS=1 uv run pytest services/rag/tests/vector_benchmarks/configurable_rag_quality_test.py::test_configurable_rag_quality_benchmark -v --timeout=7200
```

### Monitoring Progress

Use the monitoring script to track progress during long-running tests:

```bash
python3 monitor_comprehensive_benchmark.py
```

Expected timeline: ~55 minutes total (15 min + 20 min + 20 min for each model)

## Configuration

### Model Configurations

Edit `services/rag/tests/vector_benchmarks/chunking_configs.yaml`:

```yaml
configurations:
  minilm_2000:
    description: "MiniLM with large chunks"
    chunking:
      max_chars: 2000
      overlap: 200
    embedding:
      model: "sentence-transformers/all-MiniLM-L12-v2"
      dimension: 384

  scibert_2000:
    description: "SciBERT with large chunks"
    chunking:
      max_chars: 2000
      overlap: 200
    embedding:
      model: "allenai/scibert_scivocab_uncased"
      dimension: 768

  mpnet_2000:
    description: "MPNet with large chunks"
    chunking:
      max_chars: 2000
      overlap: 200
    embedding:
      model: "sentence-transformers/all-mpnet-base-v2"
      dimension: 768

query_count: 5  # Number of scientific queries to test per model
```

## Results and Reports

### Generated Files

After completion, find results in `testing/test_data/results/configurable_rag_quality_benchmarks/`:

1. **JSON Report**: `configurable_rag_quality_report_TIMESTAMP.json` - Complete raw data
2. **Markdown Summary**: `configurable_rag_quality_summary_TIMESTAMP.md` - Human-readable tables
3. **CSV Export**: `configurable_rag_quality_comparison_TIMESTAMP.csv` - Spreadsheet format
4. **Individual Results**: `individual_MODELNAME_TIMESTAMP.json` - Per-model detailed data

### Report Format

The new comprehensive table format shows **all metrics for all models**:

```markdown
## Performance Metrics
| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-------------|--------------|-------------|
| **Insertion Throughput** (ops/sec) | 669.8 | 577.5 | 587.5 |
| **Search Throughput** (ops/sec) | 162.2 | 167.0 | 151.6 |
| **Memory Usage** (MB) | 0.06 | 0.0 | 0.42 |

## RAG Quality Metrics  
| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-------------|--------------|-------------|
| **Avg Relevance Score** (1-5) | 3.18 | 2.93 | 3.33 |
| **Diversity Score** | 0.87 | 0.871 | 0.879 |
| **Query AI Score** | 4.85 | 4.7 | 4.75 |
| **Performance Score** | 0.683 | 0.841 | 0.843 |
```

### CSV Format

The CSV export is suitable for importing into spreadsheets:

```csv
Metric,minilm_2000,scibert_2000,mpnet_2000
Model Name,all-MiniLM-L12-v2,scibert_scivocab_uncased,all-mpnet-base-v2
Insertion Throughput (ops/sec),669.8,577.5,587.5
Avg Relevance Score,3.18,2.93,3.33
Diversity Score,0.87,0.871,0.879
```

## Key Components

### Core Files

- **`configurable_rag_quality_test.py`** - Main benchmark test with comprehensive reporting
- **`chunking_configs.yaml`** - Model and parameter configuration  
- **`framework.py`** - Performance measurement infrastructure
- **`synthetic_migrations.py`** - Database schema handling and dimension validation bypass
- **`monitor_comprehensive_benchmark.py`** - Progress monitoring script

### Testing Infrastructure

- **`testing/rag_ai_evaluation.py`** - AI-powered quality evaluation (with robust JSON parsing)
- **`testing/benchmark_utils.py`** - Benchmark decorators and utilities
- **`packages/shared_utils/src/embeddings.py`** - Fixed model caching for multi-model tests

## Improvements Made

### 1. Comprehensive Table-Based Reporting
- **Replaced**: "Best performer" sections showing only winners
- **Added**: Complete side-by-side comparison tables  
- **Benefit**: See all metrics for all models at once

### 2. Robust AI Evaluation  
- **Fixed**: JSON parsing errors from AI responses with extra text
- **Added**: `parse_json_from_ai_response()` with fallback handling
- **Benefit**: No more evaluation failures due to malformed JSON

### 3. Enhanced Metrics Coverage
- **Performance**: Insertion/search throughput, memory usage
- **Quality**: Relevance scores, success rates, retrieval times  
- **Advanced**: Diversity scores, query quality, AI evaluations, performance scores
- **Analysis**: Chunking characteristics, coverage ratios

### 4. Multiple Output Formats
- **Markdown**: Human-readable tables with insights
- **CSV**: Spreadsheet-compatible format
- **JSON**: Complete raw data for programmatic analysis

## Memory Usage Notes

**SciBERT Memory Issue**: SciBERT may show 0.0 MB memory usage due to measurement timing. This is a measurement artifact - the model definitely uses memory, but the differential RSS measurement doesn't capture it properly due to different memory allocation patterns compared to sentence-transformers models.

## Troubleshooting

### Common Issues

1. **Test Skipped**: Ensure `BENCHMARK_TESTS=1` is set (not `E2E_TESTS=1`)

2. **AI Evaluation Errors**: Check `ANTHROPIC_API_KEY` is set correctly

3. **Database Errors**: Ensure PostgreSQL with pgvector is running locally

4. **Memory/Timeout**: Increase timeout for long-running tests: `--timeout=7200`

5. **Model Loading**: First run may be slow due to model downloads

### Log Analysis

Check the monitoring script output for:
- **Model Progress**: Shows which models completed successfully
- **Query Progress**: Tracks individual query completion  
- **Error Patterns**: Identifies systematic issues

## Running in Detached Screens

For long-running tests, use screen sessions:

```bash
# Start detached session
screen -S rag_benchmark

# Run the test
PYTHONPATH=. BENCHMARK_TESTS=1 uv run pytest services/rag/tests/vector_benchmarks/configurable_rag_quality_test.py::test_configurable_rag_quality_benchmark -v --timeout=7200

# Detach: Ctrl+A, then D

# Reattach later
screen -r rag_benchmark

# Monitor from another terminal
python3 monitor_comprehensive_benchmark.py
```

## Architecture

The benchmark system uses:
- **Production RAG Pipeline**: Tests actual `retrieve_documents()` function
- **Isolated Test Databases**: Each worker gets unique database instance  
- **Model Caching**: Fixed caching issues for multi-model scenarios
- **Dimension Validation Bypass**: Monkey-patches pgvector for 768d model support
- **Engine Disposal**: Prevents cached statement errors between models
- **Comprehensive Metrics**: Captures performance, quality, and advanced metrics

This testing harness provides a robust foundation for evaluating RAG system performance across different embedding models with complete visibility into all metrics.