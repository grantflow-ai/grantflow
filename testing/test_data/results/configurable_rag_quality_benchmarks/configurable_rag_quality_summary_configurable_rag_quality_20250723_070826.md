# RAG Quality Benchmark Results

**Test Purpose**: configurable RAG quality benchmark using production pipeline
**Evaluation Method**: retrieve_documents() + evaluate_retrieval_relevance() AI assessment
**Test Timestamp**: 2025-07-23T07:24:50.746841+00:00
**Configurations Tested**: 2

## Configurations Overview

| Configuration | Model | Dimension | Chunk Size | Overlap |
|---------------|-------|-----------|------------|---------|
| minilm_1000 | all-MiniLM-L12-v2 | 384d | 1000 chars | 100 chars |
| minilm_2000 | all-MiniLM-L12-v2 | 384d | 2000 chars | 200 chars |

## 🏆 Performance Winners

### Fastest Vector Insertion
**Winner**: minilm_1000 - MiniLM with small chunks
- **Throughput**: 931.62 ops/sec

### Fastest Similarity Search
**Winner**: minilm_1000 - MiniLM with small chunks
- **Throughput**: 238.99 ops/sec

### Most Memory Efficient
**Winner**: minilm_1000 - MiniLM with small chunks
- **Memory Usage**: 0.1 MB

### Most Chunks Generated
**Winner**: minilm_1000 - MiniLM with small chunks
- **Chunks Generated**: 35

### Largest Average Chunks
**Winner**: minilm_2000 - MiniLM with large chunks
- **Average Chunk Size**: 1,651 chars

## 🎯 RAG Quality Winners

### Best Relevance Score
**Winner**: minilm_2000 - MiniLM with large chunks
- **Relevance Score**: 3.580

### Best Retrieval Success Rate
**Winner**: minilm_1000 - MiniLM with small chunks
- **Success Rate**: 100.0%

### Fastest Retrieval Time
**Winner**: minilm_2000 - MiniLM with large chunks
- **Retrieval Time**: 67.420s

### Most Documents Retrieved
**Winner**: minilm_1000 - MiniLM with small chunks
- **Documents Retrieved**: 200

## 📊 Chunking Strategy Comparison

**Model Tested**: MiniLM (384d)

### Configuration Comparison

| Metric | minilm_1000 (1000 chars) | minilm_2000 (2000 chars) | Ratio |
|--------|------------------------|------------------------|-------|
| Chunk Count | 35 | 17 | 0.49x |
| Insertion Throughput | 931.62 ops/sec | 641.32 ops/sec | 0.69x |
| Search Throughput | 238.99 ops/sec | 177.46 ops/sec | 0.74x |
| Memory Usage | 0.1 MB | 0.1 MB | 1.00x |
| Avg Relevance Score | 3.180 | 3.580 | 1.13x |
| Retrieval Success Rate | 100.0% | 100.0% | 1.00x |
| Avg Retrieval Time | 121.360s | 67.420s | 1.80x |

## 💡 Key Insights

### Performance Impact
minilm_2000 (2000 chars) has 0.69x insertion speed, 0.74x search speed vs minilm_1000 (1000 chars) for MiniLM (384d)

### Memory Impact
minilm_2000 (2000 chars) uses 1.00x less memory than minilm_1000 (1000 chars)

### RAG Quality Impact
minilm_2000 (2000 chars) has 1.13x better RAG relevance score than minilm_1000 (1000 chars)

### Success Rate Impact
minilm_2000 (2000 chars) has 1.00x worse retrieval success rate than minilm_1000 (1000 chars)

### Retrieval Speed Impact
minilm_2000 (2000 chars) is 1.80x faster at retrieval than minilm_1000 (1000 chars)

---

*Report generated on 2025-07-23T07:24:50.746841+00:00*

*Full detailed results available in JSON format*