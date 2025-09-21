# LLM Length Optimization Tests

This directory contains tests for optimizing LLM text generation length compliance.

## Core Implementation

- `test_hybrid_llm_with_buffer_strategy.py` - Main buffer strategy implementation achieving 100% compliance
- Results stored in `../results/llm_length_diagnosis/`

## Buffer Strategy

Adds +150 words to LLM instructions while evaluating against actual targets.
Achieves 100% pass rate across all section types.

## Usage

```bash
cd testing/llm_optimization
PYTHONPATH=../.. uv run python test_hybrid_llm_with_buffer_strategy.py
```