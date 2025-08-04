# RAG Quality Benchmark Results

**Test Purpose**: configurable RAG quality benchmark using production pipeline
**Evaluation Method**: retrieve_documents() + evaluate_retrieval_relevance() AI assessment
**Test Timestamp**: 2025-07-24T21:23:38.028359+00:00
**Configurations Tested**: 3

## Configurations Overview

| Configuration | Model | Dimension | Chunk Size | Overlap |
|---------------|-------|-----------|------------|---------|
| minilm_2000 | all-MiniLM-L12-v2 | 384d | 2000 chars | 200 chars |
| scibert_2000 | scibert_scivocab_uncased | 768d | 2000 chars | 200 chars |
| mpnet_2000 | all-mpnet-base-v2 | 768d | 2000 chars | 200 chars |

## Comprehensive Model Comparison

# RAG Model Comparison - Complete Results Table

**Generated**: 2025-07-24 21:23:38  
**Models Compared**: 3 configurations

## Model Overview

| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-|-|-|
| **Model Name** | all-MiniLM-L12-v2 | scibert_scivocab_uncased | all-mpnet-base-v2 |
| **Dimension** | 384d | 768d | 768d |
| **Description** | MiniLM with large chunks | SciBERT with large chunks | MPNet with large chunks |

## Performance Metrics

| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-|-|-|
| **Insertion Throughput** (ops/sec) | 669.8 | 577.5 | 587.5 |
| **Search Throughput** (ops/sec) | 162.2 | 167.0 | 151.6 |
| **Memory Usage** (MB) | 0.06 | 0.0 | 0.42 |

## Chunking Analysis

| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-|-|-|
| **Chunk Count** | 15 | 15 | 15 |
| **Avg Chunk Size** (chars) | 1994 | 1994 | 1994 |
| **Coverage Ratio** | 1.103 | 1.103 | 1.103 |

## RAG Quality Metrics

| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-|-|-|
| **Avg Relevance Score** (1-5) | 3.18 | 2.93 | 3.33 |
| **Success Rate** (%) | 100.0% | 100.0% | 100.0% |
| **Avg Retrieval Time** (sec) | 122.38 | 72.04 | 70.34 |
| **Total Docs Retrieved** | 121 | 126 | 129 |

## Advanced Quality Metrics

| Metric | minilm_2000 | scibert_2000 | mpnet_2000 |
|--------|-|-|-|
| **Diversity Score** | 0.87 | 0.871 | 0.879 |
| **Query Quality Score** | 0.654 | 0.771 | 0.668 |
| **Query AI Score** | 4.85 | 4.7 | 4.75 |
| **Performance Score** | 0.683 | 0.841 | 0.843 |

## Key Insights

### Performance Analysis
- **Fastest Insertion**: minilm_2000 (669.8 ops/sec)
- **Fastest Search**: scibert_2000 (167.0 ops/sec)
- **Most Efficient**: scibert_2000 (0.0 MB)

### Quality Analysis  
- **Highest Relevance**: mpnet_2000 (3.33/5)
- **Best Success Rate**: minilm_2000 (100.0%)
- **Most Documents**: mpnet_2000 (129 docs)

---

*Complete benchmark data available in JSON format for detailed analysis*


## Key Insights

### Model Dimension Memory
768d models use 3.4x more memory than 384d models

### Model Dimension Quality
768d models have 0.98x worse RAG relevance than 384d models

### Model Dimension Success Rate
768d models have 1.00x worse retrieval success rate

---

*Report generated on 2025-07-24T21:23:38.028359+00:00*

*Full detailed results available in JSON format*