# N-gram Focused Baseline Results (No Length Constraints)

## Executive Summary

**Test Date**: 2025-09-17T07:07:10
**Test Type**: ngram_focused_baseline_no_length_constraints
**Total Iterations**: 5
**Focus**: Bigrams, 3-grams, and 4-grams analysis without word count requirements
**Scenarios Tested**: 3 section types

## Key N-gram Performance Metrics

### ROUGE N-gram Scores
- **ROUGE-L (longest sequence)**: 0.332
- **ROUGE-2 (bigrams)**: 0.145
- **ROUGE-3 (trigrams)**: 0.051
- **ROUGE-4 (4-grams)**: 0.020

### Jaccard Similarity (N-gram Overlap)
- **Bigram Jaccard**: 0.083
- **Trigram Jaccard**: 0.028
- **4-gram Jaccard**: 0.011

### Performance Metrics
- **Average Execution Time**: 0.001 seconds per iteration

## Detailed Results by Iteration

### Iteration 1
- **ROUGE-L**: 0.332
- **ROUGE-2**: 0.145
- **ROUGE-3**: 0.051
- **ROUGE-4**: 0.020
- **Bigram Jaccard**: 0.083
- **Trigram Jaccard**: 0.028
- **4-gram Jaccard**: 0.011

### Iteration 2
- **ROUGE-L**: 0.332
- **ROUGE-2**: 0.145
- **ROUGE-3**: 0.051
- **ROUGE-4**: 0.020
- **Bigram Jaccard**: 0.083
- **Trigram Jaccard**: 0.028
- **4-gram Jaccard**: 0.011

### Iteration 3
- **ROUGE-L**: 0.332
- **ROUGE-2**: 0.145
- **ROUGE-3**: 0.051
- **ROUGE-4**: 0.020
- **Bigram Jaccard**: 0.083
- **Trigram Jaccard**: 0.028
- **4-gram Jaccard**: 0.011

### Iteration 4
- **ROUGE-L**: 0.332
- **ROUGE-2**: 0.145
- **ROUGE-3**: 0.051
- **ROUGE-4**: 0.020
- **Bigram Jaccard**: 0.083
- **Trigram Jaccard**: 0.028
- **4-gram Jaccard**: 0.011

### Iteration 5
- **ROUGE-L**: 0.332
- **ROUGE-2**: 0.145
- **ROUGE-3**: 0.051
- **ROUGE-4**: 0.020
- **Bigram Jaccard**: 0.083
- **Trigram Jaccard**: 0.028
- **4-gram Jaccard**: 0.011

## Section-Specific N-gram Analysis

### Abstract
| Metric | Score |
|--------|-------|
| **ROUGE-L** | 0.229 |
| **ROUGE-2** | 0.055 |
| **ROUGE-3** | 0.000 |
| **ROUGE-4** | 0.000 |
| **Bigram Jaccard** | 0.029 |
| **Trigram Jaccard** | 0.000 |
| **4-gram Jaccard** | 0.000 |

### Research Strategy
| Metric | Score |
|--------|-------|
| **ROUGE-L** | 0.225 |
| **ROUGE-2** | 0.120 |
| **ROUGE-3** | 0.064 |
| **ROUGE-4** | 0.011 |
| **Bigram Jaccard** | 0.065 |
| **Trigram Jaccard** | 0.033 |
| **4-gram Jaccard** | 0.006 |

### Preliminary Results
| Metric | Score |
|--------|-------|
| **ROUGE-L** | 0.542 |
| **ROUGE-2** | 0.261 |
| **ROUGE-3** | 0.089 |
| **ROUGE-4** | 0.048 |
| **Bigram Jaccard** | 0.154 |
| **Trigram Jaccard** | 0.050 |
| **4-gram Jaccard** | 0.027 |

## N-gram Analysis Insights

### Performance Trends
- **Longest sequences (ROUGE-L)**: 0.332 indicates good semantic alignment
- **Bigram overlap (ROUGE-2)**: 0.145 shows moderate phrase-level similarity
- **Trigram patterns (ROUGE-3)**: 0.051 indicates limited complex phrase matching
- **4-gram sequences (ROUGE-4)**: 0.020 shows limited extended sequence preservation

### Jaccard Similarity Analysis
The Jaccard similarity coefficients provide additional insights into n-gram overlap:
- **Bigrams**: 0.083 set intersection ratio
- **Trigrams**: 0.028 unique 3-gram overlap
- **4-grams**: 0.011 complex phrase preservation

## Testing Methodology

### N-gram Extraction
- **Bigrams**: 2-word consecutive sequences for phrase analysis
- **Trigrams**: 3-word sequences for compound term detection
- **4-grams**: 4-word sequences for complex expression matching
- **Jaccard Similarity**: |intersection| / |union| for set-based overlap analysis

### ROUGE Metrics
- **ROUGE-L**: F1-score based on Longest Common Subsequence
- **ROUGE-N**: F1-score based on n-gram overlap (precision and recall)
- **No Length Constraints**: Focus purely on semantic and n-gram alignment

### Quality Thresholds (Baseline Established)

Based on these results, suggested thresholds:
- **Minimum ROUGE-L**: ≥0.332
- **Minimum ROUGE-2**: ≥0.145
- **Minimum ROUGE-3**: ≥0.051
- **Minimum ROUGE-4**: ≥0.020

## Observations

1. **N-gram Degradation Pattern**: ROUGE scores decrease as n-gram size increases, indicating fewer exact long sequences

2. **Semantic vs. Lexical Alignment**: ROUGE-L outperforms n-gram scores, suggesting good semantic flow with varied vocabulary

3. **Section Complexity Impact**: Different sections show varying n-gram overlap patterns reflecting content complexity

## Recommendations

### For Production RAG Systems:
1. **Target ROUGE-L ≥0.332** for semantic alignment
2. **Monitor bigram overlap ≥0.145** for phrase consistency
3. **Track trigram patterns ≥0.051** for technical term usage
4. **Evaluate 4-gram preservation** for complex scientific expressions

### For Prompt Engineering:
1. **Emphasize phrase patterns** present in source materials
2. **Encourage technical term clustering** for higher n-gram scores
3. **Balance semantic flow** with lexical consistency

---

*N-gram focused baseline established on 2025-09-17 for RAG proximity analysis.*
