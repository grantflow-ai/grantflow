# Vector Benchmarking Test Framework

This framework provides comprehensive benchmarking for vector database performance across different dimensions and configurations. The key insight is that we use **synthetic migrations** to modify your production schema temporarily, allowing us to test your real RAG code with different vector configurations.

## Overview

Instead of creating separate test schemas, we:
1. **Create isolated test database** with full production schema
2. **Apply synthetic migrations** to change vector dimensions/index parameters
3. **Test real production code** with modified configurations
4. **Measure performance** using actual RAG pipeline

This approach ensures benchmarks reflect real-world performance!

## Quick Start

```bash
# Run all vector benchmarks
E2E_TESTS=1 pytest services/rag/tests/vector_benchmarks/ -m "vector_benchmark"

# Run specific test
E2E_TESTS=1 pytest services/rag/tests/vector_benchmarks/benchmark_tests.py::test_baseline_vector_insertion

# Run with specific configuration
E2E_TESTS=1 pytest services/rag/tests/vector_benchmarks/benchmark_tests.py::test_configuration_baseline
```

## Key Components

### 1. Synthetic Migrations (`synthetic_migrations.py`)

The core innovation - temporarily modifies production schema:

```python
from .synthetic_migrations import VectorTableModifier

async with session_maker() as session:
    modifier = VectorTableModifier(session)
    
    # Test with 256d vectors instead of 384d
    await modifier.modify_vector_dimension(256)
    # Now all your production RAG code uses 256d vectors!
    
    # Test with faster index parameters
    await modifier.modify_index_parameters(m=32, ef_construction=128)
    # Now HNSW index prioritizes speed over accuracy
```

**Available configurations:**
- `small_fast`: 128d vectors, fast index (speed-optimized)
- `medium_balanced`: 256d vectors, balanced index (good compromise)
- `current_production`: 384d vectors, current index (baseline)
- `large_quality`: 512d vectors, quality index (accuracy-optimized)
- `xl_experimental`: 768d vectors, experimental
- `xxl_research`: 1024d vectors, research use

### 2. Database Management (`database.py`)

Creates isolated test databases with production schema:

```python
from .database import VectorBenchmarkDatabaseManager

# Simple usage
manager = VectorBenchmarkDatabaseManager()
await manager.setup_benchmark_database()
await manager.apply_vector_configuration("small_fast")

# Now database has 128d vectors with fast HNSW index
session_maker = manager.get_session()
async with session_maker() as session:
    # Use production models with modified schema!
    pass
```

### 3. Test Data Generation (`test_data.py`)

Creates realistic test data using production models:

```python
from .test_data import TestDataGenerator

generator = TestDataGenerator(session)

# Create proper database entities
entities = await generator.create_test_entities()
user = entities["users"][0]
project = entities["projects"][0]  
rag_source = entities["rag_sources"][0]

# Generate realistic content
chunks = await generator.generate_test_chunks(1000, rag_source.id)
vectors = await generator.create_test_vectors(chunks, rag_source.id, 256)

# Insert using production code
await generator.insert_vectors_to_database(vectors)
```

### 4. Benchmark Framework (`framework.py`)

Measures performance using your actual RAG code:

```python
from .framework import VectorBenchmarkFramework

framework = VectorBenchmarkFramework(session_maker)

# Test insertion performance
result = await framework.benchmark_vector_insertion(vectors)
print(f"Insertion rate: {result.throughput:.1f} vectors/sec")

# Test search performance  
result = await framework.benchmark_similarity_search(query_vectors)
print(f"Search rate: {result.throughput:.1f} queries/sec")

# Comprehensive benchmark
results = await framework.run_comprehensive_benchmark(vectors, queries)
```

## Benchmark Tests

### Basic Performance Tests

1. **`test_baseline_vector_insertion`** - Tests basic insertion performance
   - Creates 1000 vectors, measures insertion speed
   - Baseline: >100 vectors/sec, <30s, <100MB memory

2. **`test_baseline_similarity_search`** - Tests basic search performance
   - 100 queries on 1000 vectors
   - Baseline: >10 queries/sec, <100ms avg, <50MB memory

### Comparison Tests

3. **`test_dimension_comparison`** - Compares across vector dimensions
   - Tests 128d, 256d, 384d vectors
   - Shows performance vs accuracy tradeoffs

4. **`test_index_parameter_comparison`** - Tests HNSW parameters
   - Fast (m=16, ef=128), Balanced (m=32, ef=256), Current (m=48, ef=256)
   - Demonstrates speed vs accuracy tuning

5. **`test_dataset_size_scaling`** - Tests scalability
   - 500, 1000, 2000 vectors
   - Verifies performance doesn't degrade significantly

6. **`test_configuration_baseline`** - Tests predefined configurations
   - Automatically tests multiple configurations
   - Uses parametrized fixture for easy comparison

## Usage Examples

### Testing Different Vector Dimensions

```python
@e2e_test(category=E2ETestCategory.VECTOR_BENCHMARK)
async def test_my_dimension_benchmark(benchmark_db_manager):
    # Test 512d vectors
    await benchmark_db_manager.apply_vector_configuration("large_quality")
    
    session_maker = benchmark_db_manager.get_session()
    async with session_maker() as session:
        # Your production RAG code now uses 512d vectors!
        # Test insertion, search, whatever you need
        pass
```

### Testing Custom Index Parameters

```python
@e2e_test(category=E2ETestCategory.VECTOR_BENCHMARK)
async def test_custom_index_params(benchmark_session, vector_table_modifier):
    # Test super fast index
    await vector_table_modifier.modify_index_parameters(m=12, ef_construction=64)
    
    # Now test your production code with this fast index
    # Schema automatically restored after test
```

### Using Fixtures for Common Patterns

```python
@e2e_test(category=E2ETestCategory.VECTOR_BENCHMARK)
async def test_with_dataset(small_dataset, framework):
    # small_dataset fixture provides 1000 vectors ready to use
    vectors = small_dataset["vectors"]
    
    # Test search performance
    query_vectors = create_query_vectors(100, 384)
    result = await framework.benchmark_similarity_search(query_vectors)
    
    assert result.throughput > 10
```

## Performance Baselines

The tests include conservative baseline expectations that should pass on most systems:

| Metric | Baseline | Description |
|--------|----------|-------------|
| Vector Insertion | >100 vectors/sec | Basic insertion rate |
| Similarity Search | >10 queries/sec | Basic search rate |
| Memory Usage | <100MB | Memory for 1000 vectors |
| Query Time | <100ms avg | Average query response time |

## Extending the Framework

### Adding New Configurations

```python
# In synthetic_migrations.py
BENCHMARK_CONFIGURATIONS["my_config"] = {
    "dimension": 640,
    "index_params": {"m": 40, "ef_construction": 400},
    "description": "My custom configuration",
    "use_case": "Special use case"
}
```

### Adding New Benchmark Types

```python
# In framework.py
class VectorBenchmarkFramework:
    async def benchmark_my_operation(self, ...):
        async with PerformanceMetrics("my_test", dataset_size) as metrics:
            # Your benchmark code here
            pass
        
        result = metrics.get_result("my_operation", vector_dimension)
        return result
```

### Adding New Test Cases

```python
@e2e_test(category=E2ETestCategory.VECTOR_BENCHMARK)
async def test_my_benchmark(benchmark_session, test_data_generator):
    # Create test data
    # Run benchmark
    # Assert expectations
    pass
```

## Performance Tips

1. **Use appropriate dataset sizes** - Start small (1000 vectors) for development
2. **Test representative queries** - Use realistic query patterns
3. **Monitor memory usage** - Vector operations can be memory-intensive
4. **Compare configurations** - Use parametrized fixtures for easy comparison
5. **Consider index build time** - HNSW parameters affect build time significantly

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure PostgreSQL is running and accessible
2. **Memory issues**: Reduce dataset sizes for testing
3. **Slow tests**: Use smaller datasets or adjust timeout values
4. **Schema conflicts**: Tests automatically restore original schema

### Debug Mode

```python
# Enable debug logging
import logging
logging.getLogger("services.rag.tests.vector_benchmarks").setLevel(logging.DEBUG)

# Check current vector count
async with session_maker() as session:
    result = await session.execute(select(func.count(TextVector.id)))
    print(f"Current vector count: {result.scalar()}")
```

## Architecture Benefits

This synthetic migration approach provides several advantages:

1. **Tests real code** - No mocks, uses actual RAG pipeline
2. **Easy comparison** - Same code, different configurations
3. **Comprehensive metrics** - Measures real performance characteristics
4. **Scalable testing** - Can test any vector dimension/configuration
5. **Production relevance** - Results directly applicable to production

The framework helps you make data-driven decisions about vector configurations for your specific use case!