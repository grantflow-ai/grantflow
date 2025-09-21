# ROUGE Proximity and Length Compliance Baseline Results

## Executive Summary

**Test Date**: 2025-09-17T06:47:04
**Test Type**: length_compliance_and_rouge_baseline_updated_prompts
**Total Iterations**: 5
**Scenarios Tested**: 3 section types
**Test Cases per Iteration**: 15

## Key Performance Metrics

### Length Compliance Results
- **Average Compliance**: 86.3%
- **Pass Rate**: 60.0%
- **Grade Distribution**:
  - Grade A (≥80% utilization): 30 cases
  - Grade B (60-80% utilization): 15 cases
  - Grade F (<60% or exceeds limits): 30 cases

### ROUGE Proximity Scores
- **ROUGE-L (semantic similarity)**: 0.168
- **ROUGE-2 (bigram overlap)**: 0.056

### Performance Metrics
- **Average Execution Time**: 0.00 seconds per iteration

## Detailed Results by Iteration

### Iteration 1
- **Compliance**: 86.3%
- **ROUGE-L**: 0.168
- **ROUGE-2**: 0.056
- **Grades**: A=6, B=3, F=6
- **Pass Rate**: 60.0%

### Iteration 2
- **Compliance**: 86.3%
- **ROUGE-L**: 0.168
- **ROUGE-2**: 0.056
- **Grades**: A=6, B=3, F=6
- **Pass Rate**: 60.0%

### Iteration 3
- **Compliance**: 86.3%
- **ROUGE-L**: 0.168
- **ROUGE-2**: 0.056
- **Grades**: A=6, B=3, F=6
- **Pass Rate**: 60.0%

### Iteration 4
- **Compliance**: 86.3%
- **ROUGE-L**: 0.168
- **ROUGE-2**: 0.056
- **Grades**: A=6, B=3, F=6
- **Pass Rate**: 60.0%

### Iteration 5
- **Compliance**: 86.3%
- **ROUGE-L**: 0.168
- **ROUGE-2**: 0.056
- **Grades**: A=6, B=3, F=6
- **Pass Rate**: 60.0%

## Section-Specific Analysis

### Abstract
- **CFP Constraint**: 285 words maximum
- **Average Compliance**: 86.5%
- **Average ROUGE-L**: 0.116
- **Grade Distribution**: A=10, B=5, F=10

### Research Strategy
- **CFP Constraint**: 1800 words maximum
- **Average Compliance**: 86.5%
- **Average ROUGE-L**: 0.174
- **Grade Distribution**: A=10, B=5, F=10

### Preliminary Results
- **CFP Constraint**: 360 words maximum
- **Average Compliance**: 85.9%
- **Average ROUGE-L**: 0.215
- **Grade Distribution**: A=10, B=5, F=10

## Testing Methodology

### Length Compliance Scoring
- **Grade A**: ≥80% of maximum word limit
- **Grade B**: 60-80% of maximum word limit
- **Grade F**: <60% of maximum OR exceeds maximum OR below minimum

### ROUGE Metrics
- **ROUGE-L**: Longest Common Subsequence F1-score between section requirements and generated text
- **ROUGE-2**: Bigram overlap F1-score for phrase-level similarity

### Test Scenarios
1. **Abstract**: 285 words maximum
2. **Research Strategy**: 1800 words maximum
3. **Preliminary Results**: 360 words maximum

Each scenario tested with 5 different word counts representing various compliance levels.

## Quality Thresholds

Based on these baseline results:
- **Minimum Length Compliance**: ≥70% (Current: 86.3%)
- **Minimum ROUGE-L Score**: ≥0.168 (baseline average)
- **Minimum Pass Rate**: ≥60.0% (current baseline)

## Observations

1. **Length Management**: 45 out of 75 test cases passed compliance requirements.

2. **Semantic Proximity**: ROUGE-L scores of 0.168 indicate moderate semantic similarity between requirements and generated text.

3. **Consistency**: Execution time variance of 0.00 seconds indicates stable performance.

## Recommendations

1. **For Grade F Cases**: Implement length optimization to target 80-90% of maximum word limits
2. **For Low ROUGE Scores**: Enhance context relevance in text generation
3. **For Performance**: Current execution times are acceptable for production use

---

*Baseline established on 2025-09-17 for future regression testing and quality assurance.*
